import {
  ARCHIVED_PREFIX,
  desiredFor,
  eqName,
  READ_ONLY_SHARED,
  SHARED_CHANNELS,
  WEBHOOK_NAME,
  type ChannelKind,
  type GuildSnapshot,
  type Hub,
  type SnapChannel,
} from './model.js';

export interface PlannedOption {
  title: string;
  emoji?: string;
  emojiId?: string;
  /** Role name (the project slug). */
  role: string;
  /** Category name the member is opted into. */
  category: string;
  /** Child channel names under that category. */
  channels: string[];
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
  | { kind: 'upsert-onboarding'; promptTitle: string; options: PlannedOption[] };

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
  const desiredOptions: PlannedOption[] = [];
  let onboardingDirty = false;

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
    if (!findRole(snap, d.roleName)) roles.push({ kind: 'create-role', name: d.roleName, mentionable: true });
    const cat = findCategory(snap, d.categoryName);
    if (!cat) categories.push({ kind: 'create-category', name: d.categoryName, role: d.roleName });
    for (const ch of d.channels) {
      const existing = cat ? findChild(snap, cat.id, ch.name) : undefined;
      if (!existing) {
        channels.push({ kind: 'create-channel', name: ch.name, type: ch.kind, category: d.categoryName, role: d.roleName, roleCanPost: ch.roleCanPost, tags: [...ch.tags], topic: ch.topic });
      } else {
        if (ch.topic && existing.topic !== undefined && (existing.topic ?? '') !== ch.topic) {
          topics.push({ kind: 'set-topic', channelId: existing.id, channel: ch.name, category: d.categoryName, topic: ch.topic });
        }
        if (ch.kind === 'forum' && existing.tags && ch.tags.some((name) => !existing.tags!.some((have) => eqName(have, name)))) {
          topics.push({ kind: 'set-tags', channelId: existing.id, channel: ch.name, category: d.categoryName, tags: [...ch.tags] });
        }
      }
    }
    const ann = cat ? findChild(snap, cat.id, 'announcements') : undefined;
    const hasWebhook = ann !== undefined && snap.webhooks.some((w) => w.channelId === ann.id && eqName(w.name, WEBHOOK_NAME));
    if (!hasWebhook) webhooks.push({ kind: 'create-webhook', category: d.categoryName, channel: 'announcements', name: WEBHOOK_NAME });
    desiredOptions.push({ title: p.name, emoji: p.emoji, emojiId: p.emojiId, role: d.roleName, category: d.categoryName, channels: d.channels.map((c) => c.name) });
  }

  if (opts.shared) {
    for (const name of SHARED_CHANNELS) {
      const exists = snap.channels.some((c) => c.parentId === null && c.type === TEXT && eqName(c.name, name));
      if (!exists) shared.push({ kind: 'create-shared-channel', name, everyoneCanPost: !READ_ONLY_SHARED.includes(name) });
    }
  }

  const prompt = snap.onboarding.prompts.find((pr) => eqName(pr.title, hub.onboardingPrompt));
  if (!prompt) {
    onboardingDirty = desiredOptions.length > 0 || opts.shared === true;
  } else {
    for (const want of desiredOptions) {
      const role = findRole(snap, want.role);
      const cat = findCategory(snap, want.category);
      const childIds = cat ? want.channels.map((n) => findChild(snap, cat.id, n)?.id) : [];
      const have = prompt.options.find((o) => eqName(o.title, want.title));
      if (!role || !cat || childIds.some((id) => id === undefined) || !have) {
        onboardingDirty = true;
        break;
      }
      const emojiOk = want.emojiId ? have.emoji_id === want.emojiId : true;
      if (!emojiOk || !sameSet(have.roleIds, [role.id]) || !sameSet(have.channelIds, childIds as string[])) {
        onboardingDirty = true;
        break;
      }
    }
    if (!onboardingDirty) {
      const extra = prompt.options.some((o) => !desiredOptions.some((w) => eqName(w.title, o.title)));
      if (extra) onboardingDirty = true;
    }
  }

  const ops = [...roles, ...categories, ...channels, ...renames, ...topics, ...webhooks, ...shared];
  if (onboardingDirty) ops.push({ kind: 'upsert-onboarding', promptTitle: hub.onboardingPrompt, options: desiredOptions });
  return ops;
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
    case 'upsert-onboarding': return `update onboarding prompt "${op.promptTitle}" -> [${op.options.map((o) => o.title).join(', ')}]`;
  }
}
