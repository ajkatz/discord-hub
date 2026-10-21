import { readFileSync, writeFileSync } from 'node:fs';

/** One project in hub.json: a sub-community of the hub guild. */
export interface ProjectConfig {
  slug: string;
  name: string;
  /** Unicode emoji for the onboarding option; ignored when emojiId is set. */
  emoji?: string;
  /** Custom (server) emoji id for the onboarding option, e.g. the plugin's icon uploaded as an emoji. */
  emojiId?: string;
  repo?: string;
  archived?: boolean;
  /** The game the project belongs to (a `games` slug); every live project names one once hub.json lists games. */
  game?: string;
}

/** A game above its projects (ADR-0004): its own role, private category and chat, and its own plugin question. */
export interface GameConfig {
  /** Also its role's name. */
  slug: string;
  /** Its option on the game question, and its category's name, e.g. "WoW: Forever". */
  name: string;
  /** The game-wide channel, e.g. "wow-forever-chat". */
  chat: string;
  /** The title of this game's plugin question, e.g. "Which WoW: Forever addons do you use?". */
  prompt: string;
  emoji?: string;
  emojiId?: string;
}

/** The declarative truth: one guild, its onboarding questions, N projects - grouped by game when games are listed. */
export interface Hub {
  guildId: string;
  /** The single plugin question; once games are listed, the question they replace (it leaves onboarding). */
  onboardingPrompt: string;
  /** The question asked first when games are listed, e.g. "What do you play?". */
  gamePrompt?: string;
  games?: GameConfig[];
  /** Titles of questions the hub asked once and no longer asks (a renamed question's old title): dropped. */
  retiredPrompts?: string[];
  projects: ProjectConfig[];
}

export type ChannelKind = 'text' | 'forum';

export interface DesiredChannel {
  name: string;
  kind: ChannelKind;
  /** false on announcements: members read, only the owner posts. */
  roleCanPost: boolean;
  /** Forum tags; empty for text channels. */
  tags: string[];
  /** Channel topic; on a forum this is the post guidelines members read before posting. */
  topic: string;
}

export interface DesiredProject {
  slug: string;
  name: string;
  emoji?: string;
  emojiId?: string;
  archived: boolean;
  roleName: string;
  categoryName: string;
  channels: DesiredChannel[];
}

export interface DesiredGame {
  slug: string;
  name: string;
  emoji?: string;
  emojiId?: string;
  roleName: string;
  categoryName: string;
  prompt: string;
  chat: DesiredChannel;
}

/** Kind tags on #feedback: what a post is (the bot sets one). */
export const KIND_TAGS = ['bug', 'idea', 'question', 'praise'];
/** Status tags on #feedback: where it stands (the bot sets acknowledged/known; the rest are the owner's). */
export const STATUS_TAGS = ['acknowledged', 'known', 'in-progress', 'fixed', 'not-an-issue', 'needs-info', 'planned', 'declined'];
/** All #feedback tags, kind first. */
export const FEEDBACK_TAGS = [...KIND_TAGS, ...STATUS_TAGS];

/** The seven top-level channels onboarding requires (five of them @everyone-writable). */
export const SHARED_CHANNELS = ['welcome', 'rules', 'all-announcements', 'lounge', 'introductions', 'help', 'off-topic'] as const;
export const READ_ONLY_SHARED: string[] = ['rules', 'all-announcements'];

export const FEEDBACK_GUIDELINES = 'Bugs, ideas, questions and thanks, one per post. For a bug include what you did, what happened, what you expected, the plugin version, and a screenshot if you have one. I read everything; the tags show what it is and where it stands.';
export const ANNOUNCEMENTS_TOPIC = 'Release notes and development updates. Posted automatically on every push.';
export const WEBHOOK_NAME = 'Push announcer';
export const ARCHIVED_PREFIX = '[archived] ';
export const SLUG_RE = /^[a-z0-9-]+$/;
const SNOWFLAKE_RE = /^\d{15,22}$/;

export function desiredFor(p: ProjectConfig): DesiredProject {
  const archived = p.archived === true;
  return {
    slug: p.slug,
    name: p.name,
    emoji: p.emoji,
    emojiId: p.emojiId,
    archived,
    roleName: p.slug,
    categoryName: archived ? ARCHIVED_PREFIX + p.name : p.name,
    channels: [
      { name: 'announcements', kind: 'text', roleCanPost: false, tags: [], topic: ANNOUNCEMENTS_TOPIC },
      { name: 'general', kind: 'text', roleCanPost: true, tags: [], topic: '' },
      { name: 'feedback', kind: 'forum', roleCanPost: true, tags: [...FEEDBACK_TAGS], topic: FEEDBACK_GUIDELINES },
    ],
  };
}

/** The game chat's topic: one room for the whole game; a bug or an idea for one project still goes to its forum. */
export const gameChatTopic = (name: string): string =>
  `Everything ${name}: talk across every plugin and addon here. A bug or an idea for one of them goes in its own #feedback.`;

export function desiredForGame(g: GameConfig): DesiredGame {
  return {
    slug: g.slug,
    name: g.name,
    emoji: g.emoji,
    emojiId: g.emojiId,
    roleName: g.slug,
    categoryName: g.name,
    prompt: g.prompt,
    chat: { name: g.chat, kind: 'text', roleCanPost: true, tags: [], topic: gameChatTopic(g.name) },
  };
}

/** True when hub.json lists games: onboarding then asks the game first (ADR-0004). */
export function hasGames(hub: Hub): boolean {
  return Array.isArray(hub.games) && hub.games.length > 0;
}

export function validateHub(hub: Hub): void {
  if (typeof hub.guildId !== 'string' || !SNOWFLAKE_RE.test(hub.guildId)) {
    throw new Error(`hub.guildId must be a Discord snowflake (digits), got ${JSON.stringify(hub.guildId)}`);
  }
  if (typeof hub.onboardingPrompt !== 'string' || hub.onboardingPrompt.trim() === '') {
    throw new Error('hub.onboardingPrompt must be a non-empty string');
  }
  if (!Array.isArray(hub.projects)) throw new Error('hub.projects must be an array');
  const seen = new Set<string>();
  for (const p of hub.projects) {
    validateProject(p);
    if (seen.has(p.slug)) throw new Error(`duplicate project slug ${p.slug}`);
    seen.add(p.slug);
  }
  validateGames(hub);
}

/** A name Discord shows: not empty, and no spaces at either end (Discord trims them, so the next plan would differ). */
function shown(value: unknown, what: string): void {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${what} must be a non-empty string`);
  if (value !== value.trim()) throw new Error(`${what} has spaces at an end: ${JSON.stringify(value)}`);
}

function validateGames(hub: Hub): void {
  if (hub.games !== undefined && !Array.isArray(hub.games)) throw new Error('hub.games must be an array');
  const retired = hub.retiredPrompts;
  if (retired !== undefined && (!Array.isArray(retired) || retired.some((t) => typeof t !== 'string' || t.trim() === ''))) {
    throw new Error('hub.retiredPrompts must be a list of question titles');
  }
  const asked = (titles: string[]) => {
    const both = (retired ?? []).find((r) => titles.some((t) => eqName(t, r)));
    if (both) throw new Error(`question "${both}" is both asked and in retiredPrompts`);
  };
  if (!hasGames(hub)) {
    if (hub.gamePrompt !== undefined) throw new Error('hub.gamePrompt is set but hub.json lists no games (remove it; its title can go in retiredPrompts)');
    const named = hub.projects.find((p) => p.game !== undefined);
    if (named) throw new Error(`project ${named.slug} names game ${named.game} but hub.json lists no games`);
    asked([hub.onboardingPrompt]);
    return;
  }
  shown(hub.gamePrompt, 'hub.gamePrompt (needed when hub.json lists games)');
  const titles = [hub.gamePrompt!];
  const slugs: string[] = [];
  const names: string[] = [];
  for (const g of hub.games!) {
    if (typeof g !== 'object' || g === null) throw new Error('every entry of hub.games must be an object');
    if (typeof g.slug !== 'string' || !SLUG_RE.test(g.slug)) throw new Error(`game slug must match ${SLUG_RE}, got ${JSON.stringify(g.slug)}`);
    if (slugs.includes(g.slug)) throw new Error(`duplicate game slug ${g.slug}`);
    slugs.push(g.slug);
    shown(g.name, `game ${g.slug}: name`);
    if (names.some((n) => eqName(n, g.name))) throw new Error(`duplicate game name "${g.name}"`);
    names.push(g.name);
    if (typeof g.chat !== 'string' || !SLUG_RE.test(g.chat)) throw new Error(`game ${g.slug}: chat must match ${SLUG_RE}, got ${JSON.stringify(g.chat)}`);
    shown(g.prompt, `game ${g.slug}: prompt`);
    if (titles.some((t) => eqName(t, g.prompt))) throw new Error(`two onboarding questions titled "${g.prompt}"`);
    titles.push(g.prompt);
  }
  asked(titles);
  for (const p of hub.projects) {
    if (slugs.includes(p.slug)) throw new Error(`project ${p.slug} has the slug of a game (both are role names)`);
    const clash = names.find((n) => eqName(n, p.name));
    if (clash) throw new Error(`project ${p.slug} is named "${clash}" like a game (both are category names)`);
    if (p.game === undefined) {
      if (p.archived !== true) throw new Error(`project ${p.slug} must name its game (one of: ${slugs.join(', ')})`);
    } else if (!slugs.includes(p.game)) {
      throw new Error(`project ${p.slug} names game ${p.game}, which hub.json does not list (${slugs.join(', ')})`);
    }
  }
}

function validateProject(p: ProjectConfig): void {
  if (typeof p.slug !== 'string' || !SLUG_RE.test(p.slug)) {
    throw new Error(`project slug must match ${SLUG_RE} (lowercase, digits, dashes), got ${JSON.stringify(p.slug)}`);
  }
  shown(p.name, `project ${p.slug}: name`);
}

/** Returns a new Hub with the project appended; the input is not mutated. */
export function addProject(hub: Hub, p: ProjectConfig): Hub {
  validateProject(p);
  if (hub.projects.some((q) => q.slug === p.slug)) throw new Error(`project ${p.slug} already exists in hub.json`);
  return { ...hub, projects: [...hub.projects, { ...p }] };
}

export function loadHub(path: string): Hub {
  const hub = JSON.parse(readFileSync(path, 'utf8')) as Hub;
  validateHub(hub);
  return hub;
}

export function saveHub(path: string, hub: Hub): void {
  validateHub(hub);
  writeFileSync(path, JSON.stringify(hub, null, 2) + '\n');
}

// ---- observed guild state (what the planner diffs against) ----

export interface SnapRole { id: string; name: string }
export interface SnapChannel {
  id: string;
  name: string;
  /** Discord channel type: 0 text, 4 category, 15 forum. */
  type: number;
  parentId: string | null;
  /** Forum tag names, when a forum. */
  tags?: string[];
  /** Forum tags with ids, when known (needed to add tags without recreating existing ones). */
  tagObjects?: { id: string; name: string }[];
  /** Channel topic / forum guidelines, when known. */
  topic?: string | null;
}
export interface SnapWebhook { id: string; channelId: string; name: string }
export interface SnapOption {
  id: string;
  title: string;
  roleIds: string[];
  channelIds: string[];
  emoji_name?: string | null;
  emoji_id?: string | null;
  description?: string | null;
}
export interface SnapPrompt {
  id: string;
  title: string;
  options: SnapOption[];
  type?: number;
  single_select?: boolean;
  required?: boolean;
  in_onboarding?: boolean;
}
export interface SnapOnboarding { enabled: boolean; prompts: SnapPrompt[] }
export interface GuildSnapshot {
  guildId: string;
  /** The bot's own user id; it gets a member overwrite on everything it creates so it can see inside private categories. */
  botId?: string;
  roles: SnapRole[];
  channels: SnapChannel[];
  webhooks: SnapWebhook[];
  onboarding: SnapOnboarding;
}

export const eqName = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();
