import {
  ARCHIVED_PREFIX,
  desiredFor,
  desiredForGame,
  eqName,
  hasGames,
  READ_ONLY_SHARED,
  SHARED_CHANNELS,
  WEBHOOK_NAME,
  type ChannelKind,
  type DesiredChannel,
  type DesiredGame,
  type GuildSnapshot,
  type Hub,
  type ProjectConfig,
  type SnapChannel,
} from './model.js';
import { emojiInSync } from './onboarding.js';

export interface PlannedOption {
  title: string;
  emoji?: string;
  emojiId?: string;
  /** Role names: the project slug, and its game's slug when hub.json lists games. */
  roles: string[];
  /** Channels the member is opted into, by category and name. */
  channels: { category: string; name: string }[];
}

/** One onboarding question as hub.json wants it. */
export interface PlannedPrompt {
  title: string;
  options: PlannedOption[];
}

export type Op =
  | { kind: 'create-role'; name: string; mentionable: boolean }
  | { kind: 'create-category'; name: string; role: string }
  | { kind: 'create-channel'; name: string; type: ChannelKind; category: string; role: string; roleCanPost: boolean; tags: string[]; topic: string }
  | { kind: 'set-topic'; channelId: string; channel: string; category: string; topic: string }
  | { kind: 'set-tags'; channelId: string; channel: string; category: string; tags: string[] }
  | { kind: 'rename-channel'; channelId: string; name: string }
  | { kind: 'create-webhook'; category: string; channel: string; name: string }
  | { kind: 'create-shared-channel'; name: string; everyoneCanPost: boolean }
  | { kind: 'upsert-onboarding'; prompts: PlannedPrompt[]; drop: string[] };

export interface PlanOptions {
  /** Also ensure the seven shared top-level channels (init). */
  shared?: boolean;
}

const CATEGORY = 4;
const TEXT = 0;

export function findRole(snap: GuildSnapshot, name: string) {
  return snap.roles.find((r) => eqName(r.name, name));
}
export function findCategory(snap: GuildSnapshot, name: string): SnapChannel | undefined {
  return snap.channels.find((c) => c.type === CATEGORY && eqName(c.name, name));
}
export function findChild(snap: GuildSnapshot, parentId: string, name: string): SnapChannel | undefined {
  return snap.channels.find((c) => c.parentId === parentId && eqName(c.name, name));
}

const sameSet = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
};

/** Pure diff: what the guild is missing relative to hub.json, in dependency order. */
export function plan(hub: Hub, snap: GuildSnapshot, opts: PlanOptions = {}): Op[] {
  const roles: Op[] = [];
  const categories: Op[] = [];
  const channels: Op[] = [];
  const renames: Op[] = [];
  const topics: Op[] = [];
  const webhooks: Op[] = [];
  const shared: Op[] = [];

  // A private area - a role, a category only it sees, the channels in it: create what is missing and
  // reconcile the topics and forum tags of what exists. Games and projects are both built this way.
  const area = (roleName: string, categoryName: string, wanted: DesiredChannel[]): SnapChannel | undefined => {
    if (!findRole(snap, roleName)) roles.push({ kind: 'create-role', name: roleName, mentionable: true });
    const cat = findCategory(snap, categoryName);
    if (!cat) categories.push({ kind: 'create-category', name: categoryName, role: roleName });
    for (const ch of wanted) {
      const existing = cat ? findChild(snap, cat.id, ch.name) : undefined;
      if (!existing) {
        channels.push({ kind: 'create-channel', name: ch.name, type: ch.kind, category: categoryName, role: roleName, roleCanPost: ch.roleCanPost, tags: [...ch.tags], topic: ch.topic });
      } else {
        if (ch.topic && existing.topic !== undefined && (existing.topic ?? '') !== ch.topic) {
          topics.push({ kind: 'set-topic', channelId: existing.id, channel: ch.name, category: categoryName, topic: ch.topic });
        }
        if (ch.kind === 'forum' && existing.tags && ch.tags.some((name) => !existing.tags!.some((have) => eqName(have, name)))) {
          topics.push({ kind: 'set-tags', channelId: existing.id, channel: ch.name, category: categoryName, tags: [...ch.tags] });
        }
      }
    }
    return cat;
  };

  // the games first (ADR-0004): their roles exist before any option grants them
  for (const g of games(hub)) area(g.roleName, g.categoryName, [g.chat]);

  for (const p of hub.projects) {
    const d = desiredFor(p);
    if (d.archived) {
      const live = findCategory(snap, p.name);
      const already = findCategory(snap, d.categoryName);
      if (live && !already && !live.name.toLowerCase().startsWith(ARCHIVED_PREFIX)) {
        renames.push({ kind: 'rename-channel', channelId: live.id, name: d.categoryName });
      }
      continue;
    }
    const cat = area(d.roleName, d.categoryName, d.channels);
    const ann = cat ? findChild(snap, cat.id, 'announcements') : undefined;
    const hasWebhook = ann !== undefined && snap.webhooks.some((w) => w.channelId === ann.id && eqName(w.name, WEBHOOK_NAME));
    if (!hasWebhook) webhooks.push({ kind: 'create-webhook', category: d.categoryName, channel: 'announcements', name: WEBHOOK_NAME });
  }

  if (opts.shared) {
    for (const name of SHARED_CHANNELS) {
      const exists = snap.channels.some((c) => c.parentId === null && c.type === TEXT && eqName(c.name, name));
      if (!exists) shared.push({ kind: 'create-shared-channel', name, everyoneCanPost: !READ_ONLY_SHARED.includes(name) });
    }
  }

  const ops = [...roles, ...categories, ...channels, ...renames, ...topics, ...webhooks, ...shared];
  const onboarding = desiredOnboarding(hub, snap);
  if (onboardingDirty(onboarding, snap, !hasGames(hub) && opts.shared !== true)) {
    ops.push({ kind: 'upsert-onboarding', prompts: onboarding.prompts, drop: onboarding.drop });
  }
  return ops;
}

const games = (hub: Hub): DesiredGame[] => (hasGames(hub) ? hub.games!.map(desiredForGame) : []);

/**
 * The onboarding questions hub.json wants, and the live ones it wants gone. Without games: one question
 * titled `onboardingPrompt`, one option per live project. With games (ADR-0004): the game question (a game
 * grants its role and its chat), then one question per game that has live projects (a project grants its own
 * role and channels); the single question and the question of a game left without projects go. Either way
 * the titles in `retiredPrompts` go - how a renamed question's old title leaves.
 */
function desiredOnboarding(hub: Hub, snap: GuildSnapshot): { prompts: PlannedPrompt[]; drop: string[] } {
  const live = hub.projects.filter((p) => p.archived !== true);
  const projectOption = (p: ProjectConfig): PlannedOption => {
    const d = desiredFor(p);
    return { title: p.name, emoji: p.emoji, emojiId: p.emojiId, roles: [d.roleName], channels: d.channels.map((c) => ({ category: d.categoryName, name: c.name })) };
  };
  const prompts: PlannedPrompt[] = [];
  const gone: string[] = [...(hub.retiredPrompts ?? [])];
  if (!hasGames(hub)) {
    prompts.push({ title: hub.onboardingPrompt, options: live.map(projectOption) });
  } else {
    prompts.push({
      title: hub.gamePrompt!,
      options: games(hub).map((g) => ({ title: g.name, emoji: g.emoji, emojiId: g.emojiId, roles: [g.roleName], channels: [{ category: g.categoryName, name: g.chat.name }] })),
    });
    for (const g of games(hub)) {
      const options = live.filter((p) => p.game === g.slug).map(projectOption);
      if (options.length > 0) prompts.push({ title: g.prompt, options });
      else gone.push(g.prompt);
    }
    gone.push(hub.onboardingPrompt);
  }
  const drop: string[] = [];
  for (const title of gone) {
    if (prompts.some((p) => eqName(p.title, title)) || drop.some((d) => eqName(d, title))) continue;
    if (snap.onboarding.prompts.some((pr) => eqName(pr.title, title))) drop.push(title);
  }
  return { prompts, drop };
}

/**
 * Does the live onboarding differ: a wanted question missing, out of order, an option missing, extra or
 * pointing at other roles, channels or emoji, or a question to drop still live. `waitForOptions`: the single
 * question is only created once there is something to put in it (init creates it regardless).
 */
function onboardingDirty(want: { prompts: PlannedPrompt[]; drop: string[] }, snap: GuildSnapshot, waitForOptions: boolean): boolean {
  if (want.drop.length > 0) return true;
  const at = want.prompts.map((p) => snap.onboarding.prompts.findIndex((pr) => eqName(pr.title, p.title))).filter((i) => i >= 0);
  if (at.some((v, i) => i > 0 && at[i - 1] > v)) return true;
  for (const p of want.prompts) {
    const live = snap.onboarding.prompts.find((pr) => eqName(pr.title, p.title));
    if (!live) {
      if (!waitForOptions || p.options.length > 0) return true;
      continue;
    }
    if (live.options.some((o) => !p.options.some((w) => eqName(w.title, o.title)))) return true;
    for (const w of p.options) {
      const have = live.options.find((o) => eqName(o.title, w.title));
      if (!have) return true;
      if (!emojiInSync(have, w)) return true;
      const roleIds = w.roles.map((name) => findRole(snap, name)?.id);
      const channelIds = w.channels.map((c) => {
        const cat = findCategory(snap, c.category);
        return cat ? findChild(snap, cat.id, c.name)?.id : undefined;
      });
      if (roleIds.some((id) => id === undefined) || channelIds.some((id) => id === undefined)) return true;
      if (!sameSet(have.roleIds, roleIds as string[]) || !sameSet(have.channelIds, channelIds as string[])) return true;
    }
  }
  return false;
}

export function describeOp(op: Op): string {
  switch (op.kind) {
    case 'create-role': return `create role @${op.name}`;
    case 'create-category': return `create private category "${op.name}" for @${op.role}`;
    case 'create-channel': return `create ${op.type} #${op.name} in "${op.category}"${op.tags.length ? ` tags=[${op.tags.join(', ')}]` : ''}`;
    case 'rename-channel': return `rename channel ${op.channelId} -> "${op.name}"`;
    case 'set-topic': return `set guidelines on "${op.category}" #${op.channel}`;
    case 'set-tags': return `add missing tags on "${op.category}" #${op.channel} -> [${op.tags.join(', ')}]`;
    case 'create-webhook': return `create webhook "${op.name}" in "${op.category}" #${op.channel}`;
    case 'create-shared-channel': return `create shared #${op.name}${op.everyoneCanPost ? '' : ' (read-only)'}`;
    case 'upsert-onboarding': {
      // one question reads exactly as before: update onboarding prompt "<title>" -> [options]
      const prompts = op.prompts.map((p) => `"${p.title}" -> [${p.options.map((o) => o.title).join(', ')}]`).join('; prompt ');
      return `update onboarding prompt ${prompts}${op.drop.length ? `; drop prompt ${op.drop.map((t) => `"${t}"`).join(', ')}` : ''}`;
    }
  }
}
