import { readFileSync, writeFileSync } from 'node:fs';

/** One project in hub.json: a sub-community of the hub guild. */
export interface ProjectConfig {
  slug: string;
  name: string;
  emoji?: string;
  repo?: string;
  archived?: boolean;
}

/** The declarative truth: one guild, one onboarding prompt, N projects. */
export interface Hub {
  guildId: string;
  onboardingPrompt: string;
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
  archived: boolean;
  roleName: string;
  categoryName: string;
  channels: DesiredChannel[];
}

/** Status vocabulary for #bug-reports threads (REQ-003). */
export const BUG_TAGS = ['acknowledged', 'known', 'in-progress', 'fixed', 'not-an-issue', 'needs-info', 'feature', 'question'];
/** Tags for #feedback threads: what it is, then what happened to it. */
export const FEEDBACK_TAGS = ['idea', 'question', 'praise', 'acknowledged', 'planned', 'declined'];

/** The seven top-level channels onboarding requires (five of them @everyone-writable). */
export const SHARED_CHANNELS = ['welcome', 'rules', 'all-announcements', 'lounge', 'introductions', 'help', 'off-topic'] as const;
export const READ_ONLY_SHARED: string[] = ['rules', 'all-announcements'];

export const BUG_GUIDELINES = 'One bug per post. Include: what you did, what happened, what you expected, plugin version, and a screenshot if you have one. I read everything; the tag shows where it stands.';
export const FEEDBACK_GUIDELINES = 'Ideas, questions and thanks go here. One topic per post. Bugs belong in #bug-reports.';
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
    archived,
    roleName: p.slug,
    categoryName: archived ? ARCHIVED_PREFIX + p.name : p.name,
    channels: [
      { name: 'announcements', kind: 'text', roleCanPost: false, tags: [], topic: ANNOUNCEMENTS_TOPIC },
      { name: 'general', kind: 'text', roleCanPost: true, tags: [], topic: '' },
      { name: 'bug-reports', kind: 'forum', roleCanPost: true, tags: [...BUG_TAGS], topic: BUG_GUIDELINES },
      { name: 'feedback', kind: 'forum', roleCanPost: true, tags: [...FEEDBACK_TAGS], topic: FEEDBACK_GUIDELINES },
    ],
  };
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
}

function validateProject(p: ProjectConfig): void {
  if (typeof p.slug !== 'string' || !SLUG_RE.test(p.slug)) {
    throw new Error(`project slug must match ${SLUG_RE} (lowercase, digits, dashes), got ${JSON.stringify(p.slug)}`);
  }
  if (typeof p.name !== 'string' || p.name.trim() === '') {
    throw new Error(`project ${p.slug}: name must be a non-empty string`);
  }
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
