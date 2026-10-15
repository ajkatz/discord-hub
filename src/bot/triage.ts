import type { Classification, ClassifyInput, Decision, Kind, Status, TriageRecord } from './types.js';

export interface DecideOptions {
  now: string;
  model: string;
}

const FEEDBACK_KIND_TAG: Partial<Record<Kind, string>> = { feature: 'idea', question: 'question', praise: 'praise' };

function record(input: ClassifyInput, c: Classification | null, status: Status, opts: DecideOptions, rationale?: string): TriageRecord {
  return {
    ts: opts.now,
    project: input.project,
    channelId: input.channelId,
    threadId: input.threadId,
    messageId: input.messageId,
    kind: c?.kind ?? null,
    status,
    summary: c?.summary ?? input.title,
    rationale: rationale ?? c?.rationale ?? '',
    duplicateOf: c?.duplicateOf ?? null,
    model: opts.model,
  };
}

/**
 * Pure triage policy: classification in, forum tags + reply + ledger record out.
 * Never produces a delete, edit, lock or close.
 */
export function decide(input: ClassifyInput, result: Classification | Error, opts: DecideOptions): Decision {
  if (result instanceof Error) {
    return { tags: [], reply: null, createBugThread: null, record: record(input, null, 'unclassified', opts, result.message) };
  }
  const c = result;

  if (input.channelKind === 'bug-reports') {
    if (c.kind === 'bug' && c.duplicateOf) {
      return {
        tags: ['known'],
        reply: `This looks like the same issue as <#${c.duplicateOf}>, so I have marked it known.`,
        createBugThread: null,
        record: record(input, c, 'known', opts),
      };
    }
    // Silent: the tag is the answer. Kind tags let a feature request live here without a nudge.
    const kindTag = c.kind === 'feature' ? ['feature'] : c.kind === 'question' ? ['question'] : [];
    return { tags: [...kindTag, 'acknowledged'], reply: null, createBugThread: null, record: record(input, c, 'acknowledged', opts) };
  }

  if (input.channelKind === 'feedback') {
    const kindTag = FEEDBACK_KIND_TAG[c.kind];
    return {
      tags: kindTag ? [kindTag, 'acknowledged'] : ['acknowledged'],
      reply: null,
      createBugThread: null,
      record: record(input, c, 'acknowledged', opts),
    };
  }

  // general: only a clear bug report earns a thread.
  if (c.kind === 'bug' && c.confidence === 'high') {
    const quoted = input.body.split('\n').map((l) => `> ${l}`).join('\n');
    return {
      tags: ['acknowledged'],
      reply: `This looks like a bug report, so I opened {thread} for it.`,
      createBugThread: {
        title: c.summary.slice(0, 100),
        body: `Reported by <@${input.author.id}> in <#${input.channelId}>:\n${quoted}`,
      },
      record: record(input, c, 'acknowledged', opts),
    };
  }
  return { tags: [], reply: null, createBugThread: null, record: null };
}
