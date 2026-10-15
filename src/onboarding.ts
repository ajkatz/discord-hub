import { eqName, type SnapOnboarding, type SnapPrompt } from './model.js';

export interface DesiredOption {
  title: string;
  emoji?: string;
  description?: string;
  roleIds: string[];
  channelIds: string[];
}

/** Option as sent in PUT /guilds/{id}/onboarding. New options carry no id. */
export interface PutOption {
  id?: string;
  title: string;
  emoji_name?: string;
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
      if (o.emoji_name) out.emoji_name = o.emoji_name;
      if (o.description) out.description = o.description;
      return out;
    }),
  };
}

/**
 * Returns the full prompts array to PUT, or null when the target prompt already
 * matches `desired`. Other prompts are echoed verbatim; existing options keep their
 * ids; new options carry none; options absent from `desired` are dropped. A missing
 * prompt is created with `newPromptId` (ASM-01M4YRFMTAFAVY3TMZ72H5QP92).
 */
export function mergeOnboarding(
  current: SnapOnboarding,
  promptTitle: string,
  desired: DesiredOption[],
  newPromptId: string = String(Date.now()),
): PutPrompt[] | null {
  const target = current.prompts.find((p) => eqName(p.title, promptTitle));

  if (target) {
    const inSync =
      target.options.length === desired.length &&
      desired.every((want) => {
        const have = target.options.find((o) => eqName(o.title, want.title));
        return have !== undefined && sameSet(have.roleIds, want.roleIds) && sameSet(have.channelIds, want.channelIds);
      });
    if (inSync) return null;
  }

  const rebuilt: PutPrompt = {
    id: target ? target.id : newPromptId,
    title: target ? target.title : promptTitle,
    type: target?.type ?? 0,
    single_select: target?.single_select ?? false,
    required: target?.required ?? false,
    in_onboarding: target?.in_onboarding ?? true,
    options: desired.map((want) => {
      const have = target?.options.find((o) => eqName(o.title, want.title));
      const out: PutOption = { title: want.title, role_ids: [...want.roleIds], channel_ids: [...want.channelIds] };
      if (have) out.id = have.id;
      if (want.emoji) out.emoji_name = want.emoji;
      if (want.description) out.description = want.description;
      return out;
    }),
  };

  const prompts: PutPrompt[] = [];
  let placed = false;
  for (const p of current.prompts) {
    if (target && p.id === target.id) {
      prompts.push(rebuilt);
      placed = true;
    } else {
      prompts.push(echoPrompt(p));
    }
  }
  if (!placed) prompts.push(rebuilt);
  return prompts;
}
