// Resident triage bot: discord.js gateway shell around the pure `decide` policy.
// Config (env): DISCORD_BOT_TOKEN, ANTHROPIC_API_KEY (read by the SDK), HUB_PATH
// (default ./hub.json), TRIAGE_LEDGER (default ./data/triage.jsonl), TRIAGE_MODEL
// (default claude-opus-5-5).
import { ChannelType, Client, Events, GatewayIntentBits, type AnyThreadChannel, type ForumChannel, type Message } from 'discord.js';
import { RestDiscordApi } from '../discord.js';
import { loadHub } from '../model.js';
import { buildChannelMap, tagIdsFor, type MappedChannel } from './channels.js';
import { ClaudeClassifier } from './classifier.js';
import { Ledger } from './ledger.js';
import { decide } from './triage.js';
import { STATUSES, type Classification, type ClassifyInput, type Status } from './types.js';

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('DISCORD_BOT_TOKEN is not set');
  process.exit(2);
}
const HUB_PATH = process.env.HUB_PATH ?? 'hub.json';
let hub = loadHub(HUB_PATH);
const ledger = new Ledger(process.env.TRIAGE_LEDGER ?? 'data/triage.jsonl');
const classifier = new ClaudeClassifier(process.env.TRIAGE_MODEL ?? 'claude-opus-5-5');
const api = new RestDiscordApi(token);

let channels = new Map<string, MappedChannel>();
/** Threads the bot itself just tagged; their threadUpdate is not a human verdict. */
const selfTagged = new Set<string>();

const log = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);
const now = () => new Date().toISOString();

async function refreshChannels(): Promise<void> {
  try {
    hub = loadHub(HUB_PATH); // picks up projects added by `discord-hub new` without a restart
  } catch (e) {
    log(`hub.json reload failed, keeping the previous one: ${e instanceof Error ? e.message : e}`);
  }
  channels = buildChannelMap(hub, await api.snapshot(hub.guildId));
  log(`channel map: ${channels.size} channel(s) across ${hub.projects.filter((p) => !p.archived).length} project(s)`);
}

async function classify(input: ClassifyInput): Promise<Classification | Error> {
  try {
    return await classifier.classify(input);
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e));
  }
}

function channelIdFor(slug: string, kind: MappedChannel['kind']): string | undefined {
  for (const [id, m] of channels) if (m.slug === slug && m.kind === kind) return id;
  return undefined;
}
const feedbackChannelId = (slug: string) => channelIdFor(slug, 'feedback');

async function setTags(thread: AnyThreadChannel, names: string[]): Promise<void> {
  const parent = thread.parent;
  if (!parent || parent.type !== ChannelType.GuildForum || names.length === 0) return;
  const ids = tagIdsFor(parent.availableTags, names);
  if (ids.length === 0) return;
  selfTagged.add(thread.id);
  try {
    await thread.setAppliedTags(ids, 'discord-hub triage');
  } finally {
    setTimeout(() => selfTagged.delete(thread.id), 10_000);
  }
}

async function onThreadCreate(thread: AnyThreadChannel, newlyCreated: boolean): Promise<void> {
  if (!newlyCreated || !thread.parentId) return;
  const entry = channels.get(thread.parentId);
  if (!entry || entry.kind !== 'feedback') return;
  const starter = await thread.fetchStarterMessage().catch(() => null);
  if (starter?.author.bot) return; // a thread the bot opened itself
  const input: ClassifyInput = {
    project: entry.slug,
    channelKind: entry.kind,
    channelId: thread.parentId,
    threadId: thread.id,
    messageId: starter?.id ?? thread.id,
    title: thread.name,
    body: starter?.content ?? '',
    author: { id: starter?.author.id ?? thread.ownerId ?? '', name: starter?.author.username ?? 'unknown' },
    openRecords: ledger.open(entry.slug),
  };
  const d = decide(input, await classify(input), { now: now(), model: classifier.model });
  await setTags(thread, d.tags);
  if (d.reply) await thread.send({ content: d.reply, allowedMentions: { parse: [] } });
  if (d.record) ledger.append(d.record);
  log(`thread ${thread.id} (${entry.slug}/${entry.kind}): ${d.record?.status ?? 'no record'} ${d.tags.join(',')}`);
}

async function onMessage(message: Message): Promise<void> {
  if (message.author.bot || !message.inGuild() || message.channel.isThread()) return;
  const entry = channels.get(message.channelId);
  if (!entry || entry.kind !== 'general' || message.content.trim() === '') return;
  const input: ClassifyInput = {
    project: entry.slug,
    channelKind: 'general',
    channelId: message.channelId,
    threadId: null,
    messageId: message.id,
    title: message.content.split('\n')[0].slice(0, 100),
    body: message.content,
    author: { id: message.author.id, name: message.author.username },
    openRecords: ledger.open(entry.slug),
  };
  const d = decide(input, await classify(input), { now: now(), model: classifier.model });
  if (!d.createBugThread) {
    if (d.record) ledger.append(d.record);
    return;
  }
  const forumId = feedbackChannelId(entry.slug);
  if (!forumId) return;
  const forum = (await message.client.channels.fetch(forumId)) as ForumChannel | null;
  if (!forum || forum.type !== ChannelType.GuildForum) return;
  const thread = await forum.threads.create({
    name: d.createBugThread.title,
    message: { content: d.createBugThread.body, allowedMentions: { parse: [] } },
    appliedTags: tagIdsFor(forum.availableTags, d.tags),
    reason: 'discord-hub triage: bug report spotted in #general',
  });
  if (d.reply) await message.reply({ content: d.reply.replace('{thread}', thread.toString()), allowedMentions: { parse: [] } });
  if (d.record) ledger.append({ ...d.record, threadId: thread.id });
  log(`message ${message.id} (${entry.slug}/general) -> thread ${thread.id}`);
}

async function onThreadUpdate(before: AnyThreadChannel, after: AnyThreadChannel): Promise<void> {
  if (!after.parentId || selfTagged.has(after.id)) return;
  const entry = channels.get(after.parentId);
  if (!entry || entry.kind !== 'feedback') return;
  const parent = after.parent;
  if (!parent || parent.type !== ChannelType.GuildForum) return;
  const added = after.appliedTags.filter((t) => !before.appliedTags.includes(t));
  for (const id of added) {
    const name = parent.availableTags.find((t) => t.id === id)?.name.toLowerCase();
    if (name && (STATUSES as string[]).includes(name) && ledger.setStatus(after.id, name as Status, now())) {
      log(`thread ${after.id}: human set status ${name}`);
    }
  }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once(Events.ClientReady, async (c) => {
  log(`logged in as ${c.user.tag}`);
  await refreshChannels();
  setInterval(() => refreshChannels().catch((e) => log(`channel refresh failed: ${e}`)), 15 * 60_000);
});
client.on(Events.ThreadCreate, (t, created) => onThreadCreate(t, created).catch((e) => log(`threadCreate ${t.id} failed: ${e}`)));
client.on(Events.MessageCreate, (m) => onMessage(m).catch((e) => log(`messageCreate ${m.id} failed: ${e}`)));
client.on(Events.ThreadUpdate, (a, b) => onThreadUpdate(a, b).catch((e) => log(`threadUpdate ${b.id} failed: ${e}`)));
client.on(Events.Error, (e) => log(`client error: ${e}`));

await client.login(token);
