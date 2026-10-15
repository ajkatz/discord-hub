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
        reply: `Thanks, this looks like the same issue as <#${c.duplicateOf}>, so I have marked it known. ${c.rationale}`.trim(),
        createBugThread: null,
        record: record(input, c, 'known', opts),
      };
    }
    if (c.kind === 'bug') {
      return {
        tags: ['acknowledged'],
        reply: `Thanks, logged as "${c.summary}" and marked acknowledged. ${c.rationale}`.trim(),
        createBugThread: null,
        record: record(input, c, 'acknowledged', opts),
      };
    }
    const feedback = input.siblings?.feedback ? `<#${input.siblings.feedback}>` : '#feedback';
    const reply = c.kind === 'feature' ? `${c.rationale} ${feedback} is the better home for it.` : `${c.rationale} Marked not an issue.`;
    return {
      tags: ['not-an-issue'],
      reply: reply.trim(),
      createBugThread: null,
      record: record(input, c, 'not-an-issue', opts),
    };
  }

  if (input.channelKind === 'feedback') {
    const kindTag = FEEDBACK_KIND_TAG[c.kind];
    return {
      tags: kindTag ? [kindTag, 'acknowledged'] : ['acknowledged'],
      reply: `Thanks, noted as "${c.summary}" and marked acknowledged. ${c.rationale}`.trim(),
      createBugThread: null,
      record: record(input, c, 'acknowledged', opts),
    };
  }

  // general: only a clear bug report earns a thread.
  if (c.kind === 'bug' && c.confidence === 'high') {
    const quoted = input.body.split('\n').map((l) => `> ${l}`).join('\n');
    return {
      tags: ['acknowledged'],
      reply: `This looks like a bug report, so I opened {thread} for it and marked it acknowledged. ${c.rationale}`.trim(),
      createBugThread: {
        title: c.summary.slice(0, 100),
        body: `Reported by <@${input.author.id}> in <#${input.channelId}>:\n${quoted}`,
      },
      record: record(input, c, 'acknowledged', opts),
    };
  }
  return { tags: [], reply: null, createBugThread: null, record: null };
}
