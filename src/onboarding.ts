import { eqName, type SnapOnboarding, type SnapPrompt } from './model.js';

export interface DesiredOption {
  title: string;
  emoji?: string;
  emojiId?: string;
  description?: string;
  roleIds: string[];
  channelIds: string[];
}

/** Option as sent in PUT /guilds/{id}/onboarding. New options carry no id. */
export interface PutOption {
  id?: string;
  title: string;
  emoji_name?: string;
  emoji_id?: string;
  description?: string;
  role_ids: string[];
  channel_ids: string[];
}

export interface PutPrompt {
  id: string;
  title: string;
  type: number;
  single_select: boolean;
  required: boolean;
  in_onboarding: boolean;
  options: PutOption[];
}

const sameSet = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
};

function echoPrompt(p: SnapPrompt): PutPrompt {
  return {
    id: p.id,
    title: p.title,
    type: p.type ?? 0,
    single_select: p.single_select ?? false,
    required: p.required ?? false,
    in_onboarding: p.in_onboarding ?? true,
    options: p.options.map((o) => {
      const out: PutOption = { id: o.id, title: o.title, role_ids: [...o.roleIds], channel_ids: [...o.channelIds] };
      if (o.emoji_id) out.emoji_id = o.emoji_id;
      else if (o.emoji_name) out.emoji_name = o.emoji_name;
      if (o.description) out.description = o.description;
      return out;
    }),
  };
}

/** One question as the hub wants it, with role and channel ids resolved. */
export interface DesiredPrompt {
  title: string;
  options: DesiredOption[];
}

/** Unicode emoji compared without U+FE0F, the presentation selector Discord may add or strip. */
export function sameEmoji(a: string | null | undefined, b: string | null | undefined): boolean {
  const bare = (s: string | null | undefined) => (s ?? '').replace(/️/g, '');
  return bare(a) === bare(b);
}

/** Does a live option wear the emoji the hub wants: its custom emoji, else its unicode one, else none. */
export function emojiInSync(have: { emoji_id?: string | null; emoji_name?: string | null }, want: { emoji?: string; emojiId?: string }): boolean {
  if (want.emojiId) return have.emoji_id === want.emojiId;
  return !have.emoji_id && sameEmoji(have.emoji_name, want.emoji);
}

function optionsInSync(target: SnapPrompt, desired: DesiredOption[]): boolean {
  return (
    target.options.length === desired.length &&
    desired.every((want) => {
      const have = target.options.find((o) => eqName(o.title, want.title));
      return have !== undefined && emojiInSync(have, want) && sameSet(have.roleIds, want.roleIds) && sameSet(have.channelIds, want.channelIds);
    })
  );
}

/** The question to PUT: a live one keeps its id, settings and its options' ids (by title); a new one takes `id`. */
function rebuild(target: SnapPrompt | undefined, want: DesiredPrompt, id: string): PutPrompt {
  return {
    id: target ? target.id : id,
    title: target ? target.title : want.title,
    type: target?.type ?? 0,
    single_select: target?.single_select ?? false,
    required: target?.required ?? false,
    in_onboarding: target?.in_onboarding ?? true,
    options: want.options.map((o) => {
      const have = target?.options.find((x) => eqName(x.title, o.title));
      const out: PutOption = { title: o.title, role_ids: [...o.roleIds], channel_ids: [...o.channelIds] };
      if (have) out.id = have.id;
      if (o.emojiId) out.emoji_id = o.emojiId;
      else if (o.emoji) out.emoji_name = o.emoji;
      if (o.description) out.description = o.description;
      return out;
    }),
  };
}

/** Distinct placeholder ids for the new questions of one PUT: the base, then base+1, base+2 ... */
function placeholder(base: string, n: number): string {
  if (n === 0) return base;
  return /^\d+$/.test(base) ? (BigInt(base) + BigInt(n)).toString() : `${base}-${n}`;
}

/**
 * Returns the full prompts array to PUT, or null when every desired question matches, in the desired order,
 * and no question to drop is live. The hub's questions - for each desired title, its FIRST live match - are
 * written as one block in the desired order where the first of them stands (ids kept; questions not yet live
 * get distinct placeholder ids: ASM-01M4YRFMTAFAVY3TMZ72H5QP92, ASM-01M5F0H4Y5DW3MRCQ0YSM51KJ2), or at the end
 * when none is live; a question named in `drop` (and not desired) is left out; any other is echoed in place.
 */
export function mergePrompts(
  current: SnapOnboarding,
  desired: DesiredPrompt[],
  drop: string[] = [],
  newPromptId: string = String(Date.now()),
): PutPrompt[] | null {
  const managed = desired.map((w) => current.prompts.find((p) => eqName(p.title, w.title)));
  const isManaged = (p: SnapPrompt) => managed.includes(p);
  const dropped = (p: SnapPrompt) => !desired.some((w) => eqName(w.title, p.title)) && drop.some((d) => eqName(d, p.title));
  const order = current.prompts.filter(isManaged).map((p) => managed.indexOf(p));
  const inSync =
    order.every((v, i) => i === 0 || order[i - 1] < v) &&
    !current.prompts.some(dropped) &&
    desired.every((w, i) => managed[i] !== undefined && optionsInSync(managed[i]!, w.options));
  if (inSync) return null;

  let n = 0;
  const block = desired.map((w, i) => (managed[i] ? rebuild(managed[i], w, managed[i]!.id) : rebuild(undefined, w, placeholder(newPromptId, n++))));
  const prompts: PutPrompt[] = [];
  let placed = false;
  for (const p of current.prompts) {
    if (dropped(p)) continue;
    if (isManaged(p)) {
      if (!placed) prompts.push(...block);
      placed = true;
      continue;
    }
    prompts.push(echoPrompt(p));
  }
  if (!placed) prompts.push(...block);
  return prompts;
}

/**
 * One question: the full prompts array to PUT, or null when the target prompt already matches `desired`.
 * Other prompts are echoed verbatim; existing options keep their ids; new options carry none; options absent
 * from `desired` are dropped. A missing prompt is created with `newPromptId`.
 */
export function mergeOnboarding(
  current: SnapOnboarding,
  promptTitle: string,
  desired: DesiredOption[],
  newPromptId: string = String(Date.now()),
): PutPrompt[] | null {
  return mergePrompts(current, [{ title: promptTitle, options: desired }], [], newPromptId);
}
