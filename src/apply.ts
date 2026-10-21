import {
  BOT_PERMS,
  CREATE_PUBLIC_THREADS,
  SEND_MESSAGES,
  SEND_MESSAGES_IN_THREADS,
  VIEW_CHANNEL,
  describeError,
  webhookUrl,
  type DiscordApi,
  type Overwrite,
} from './discord.js';
import { desiredFor, eqName, SHARED_CHANNELS, type GuildSnapshot, type Hub } from './model.js';
import { mergePrompts, type DesiredPrompt } from './onboarding.js';
import type { Op } from './plan.js';

export interface ApplyResult {
  completed: Op[];
  failed?: { op: Op; error: string };
  /** Webhook URLs created this run: print once, never persist. */
  webhooks: { slug: string; url: string }[];
}

const CATEGORY = 4;
const TEXT = 0;
const FORUM = 15;

const bits = (...b: bigint[]): string => b.reduce((acc, v) => acc | v, 0n).toString();

/** Name -> id resolution seeded from the snapshot and extended as ops create things. */
class Resolver {
  private readonly roles = new Map<string, string>();
  private readonly categories = new Map<string, string>();
  private readonly children = new Map<string, string>();

  constructor(snap: GuildSnapshot) {
    for (const r of snap.roles) this.roles.set(r.name.toLowerCase(), r.id);
    for (const c of snap.channels) {
      if (c.type === CATEGORY) this.categories.set(c.name.toLowerCase(), c.id);
      else if (c.parentId) this.children.set(`${c.parentId}/${c.name.toLowerCase()}`, c.id);
    }
  }
  role(name: string): string {
    const id = this.roles.get(name.toLowerCase());
    if (!id) throw new Error(`role @${name} not found (was its create-role op applied?)`);
    return id;
  }
  category(name: string): string {
    const id = this.categories.get(name.toLowerCase());
    if (!id) throw new Error(`category "${name}" not found (was its create-category op applied?)`);
    return id;
  }
  child(category: string, name: string): string {
    const id = this.children.get(`${this.category(category)}/${name.toLowerCase()}`);
    if (!id) throw new Error(`channel #${name} in "${category}" not found`);
    return id;
  }
  addRole(name: string, id: string) { this.roles.set(name.toLowerCase(), id); }
  addCategory(name: string, id: string) { this.categories.set(name.toLowerCase(), id); }
  addChild(categoryId: string, name: string, id: string) { this.children.set(`${categoryId}/${name.toLowerCase()}`, id); }
}

/** The bot must grant itself access: a category that hides @everyone hides the bot too,
 *  and Discord then refuses to let it create or edit anything inside (50001/50013). */
function botOverwrite(botId: string | undefined): Overwrite[] {
  return botId ? [{ id: botId, type: 1, allow: bits(BOT_PERMS), deny: '0' }] : [];
}

function categoryOverwrites(everyoneId: string, roleId: string, botId: string | undefined): Overwrite[] {
  return [
    { id: everyoneId, type: 0, allow: '0', deny: bits(VIEW_CHANNEL) },
    { id: roleId, type: 0, allow: bits(VIEW_CHANNEL), deny: '0' },
    ...botOverwrite(botId),
  ];
}

function childOverwrites(everyoneId: string, roleId: string, roleCanPost: boolean, botId: string | undefined): Overwrite[] {
  const post = [SEND_MESSAGES, CREATE_PUBLIC_THREADS, SEND_MESSAGES_IN_THREADS];
  return [
    { id: everyoneId, type: 0, allow: '0', deny: bits(VIEW_CHANNEL) },
    roleCanPost
      ? { id: roleId, type: 0, allow: bits(VIEW_CHANNEL, ...post), deny: '0' }
      : { id: roleId, type: 0, allow: bits(VIEW_CHANNEL), deny: bits(SEND_MESSAGES, CREATE_PUBLIC_THREADS) },
    ...botOverwrite(botId),
  ];
}

/** Executes ops in order against the API; stops at the first failure and reports it. */
export async function apply(ops: Op[], api: DiscordApi, hub: Hub, snapshot: GuildSnapshot): Promise<ApplyResult> {
  const guildId = hub.guildId;
  const everyoneId = guildId; // Discord invariant: @everyone's role id is the guild id
  const res = new Resolver(snapshot);
  const result: ApplyResult = { completed: [], webhooks: [] };

  const slugForCategory = (category: string): string =>
    hub.projects.find((p) => eqName(desiredFor(p).categoryName, category))?.slug ?? category;

  for (const op of ops) {
    try {
      switch (op.kind) {
        case 'create-role': {
          const { id } = await api.createRole(guildId, { name: op.name, mentionable: op.mentionable });
          res.addRole(op.name, id);
          break;
        }
        case 'create-category': {
          const roleId = res.role(op.role);
          const { id } = await api.createChannel(guildId, { name: op.name, type: CATEGORY, permission_overwrites: categoryOverwrites(everyoneId, roleId, snapshot.botId) });
          res.addCategory(op.name, id);
          break;
        }
        case 'create-channel': {
          const roleId = res.role(op.role);
          const parentId = res.category(op.category);
          const { id } = await api.createChannel(guildId, {
            name: op.name,
            type: op.type === 'forum' ? FORUM : TEXT,
            parent_id: parentId,
            permission_overwrites: childOverwrites(everyoneId, roleId, op.roleCanPost, snapshot.botId),
            ...(op.topic ? { topic: op.topic } : {}),
            ...(op.type === 'forum' ? { available_tags: op.tags.map((name) => ({ name })) } : {}),
          });
          res.addChild(parentId, op.name, id);
          break;
        }
        case 'rename-channel': {
          await api.modifyChannel(op.channelId, { name: op.name });
          break;
        }
        case 'set-topic': {
          await api.modifyChannel(op.channelId, { topic: op.topic });
          break;
        }
        case 'set-tags': {
          const existing = snapshot.channels.find((c) => c.id === op.channelId)?.tagObjects ?? [];
          const merged: { id?: string; name: string }[] = existing.map((tg) => ({ id: tg.id, name: tg.name }));
          for (const name of op.tags) if (!merged.some((tg) => eqName(tg.name, name))) merged.push({ name });
          await api.modifyChannel(op.channelId, { available_tags: merged });
          break;
        }
        case 'create-webhook': {
          const channelId = res.child(op.category, op.channel);
          const { id, token } = await api.createWebhook(channelId, op.name);
          result.webhooks.push({ slug: slugForCategory(op.category), url: webhookUrl(id, token) });
          break;
        }
        case 'create-shared-channel': {
          const overwrites: Overwrite[] = op.everyoneCanPost ? [] : [{ id: everyoneId, type: 0, allow: '0', deny: bits(SEND_MESSAGES, CREATE_PUBLIC_THREADS) }];
          await api.createChannel(guildId, { name: op.name, type: TEXT, parent_id: null, permission_overwrites: overwrites });
          break;
        }
        case 'upsert-onboarding': {
          const desired: DesiredPrompt[] = op.prompts.map((p) => ({
            title: p.title,
            options: p.options.map((o) => ({
              title: o.title,
              emoji: o.emoji,
              emojiId: o.emojiId,
              roleIds: o.roles.map((name) => res.role(name)),
              channelIds: o.channels.map((c) => res.child(c.category, c.name)),
            })),
          }));
          const current = await api.getOnboarding(guildId);
          const body = mergePrompts(current, desired, op.drop);
          if (body) {
            // Discord refuses onboarding edits unless >= 7 default channels (5 @everyone-writable)
            // are listed in the same request; the shared top-level set is exactly that.
            const defaults = SHARED_CHANNELS.map((n) => snapshot.channels.find((c) => c.parentId === null && c.type === TEXT && eqName(c.name, n))?.id).filter((id): id is string => id !== undefined);
            await api.putOnboarding(guildId, defaults.length >= 7 ? { prompts: body, default_channel_ids: defaults } : { prompts: body });
          }
          break;
        }
      }
      result.completed.push(op);
    } catch (e) {
      result.failed = { op, error: describeError(e) };
      return result;
    }
  }
  return result;
}
