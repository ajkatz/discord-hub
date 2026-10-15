import { describe, it, expect } from 'vitest';
import { decide } from '../src/bot/triage.js';
import type { Classification, ClassifyInput, TriageRecord } from '../src/bot/types.js';

const NOW = '2026-10-14T20:00:00.000Z';
const OPTS = { now: NOW, model: 'fake-model' };

function input(channelKind: ClassifyInput['channelKind'], over: Partial<ClassifyInput> = {}): ClassifyInput {
  return {
    project: 'loadout-lab',
    channelKind,
    channelId: 'c1',
    threadId: channelKind === 'general' ? null : 't1',
    messageId: 'm1',
    title: 'Spec bar wrong for DHCB',
    body: 'The spec bar shows 50% when it should be 25% after one spec.',
    author: { id: 'u1', name: 'zezima' },
    openRecords: [],
    ...over,
  };
}

function cls(over: Partial<Classification> = {}): Classification {
  return { kind: 'bug', summary: 'Spec bar shows double the real cost', severity: 'medium', confidence: 'high', duplicateOf: null, rationale: 'Describes a reproducible display defect.', ...over };
}

describe('decide for a #bug-reports thread', () => {
  it('acknowledges a new bug silently', () => {
    const d = decide(input('bug-reports'), cls(), OPTS);
    expect(d.tags).toEqual(['acknowledged']);
    expect(d.reply).toBeNull();
    expect(d.createBugThread).toBeNull();
    expect(d.record).toMatchObject({ project: 'loadout-lab', threadId: 't1', kind: 'bug', status: 'acknowledged', duplicateOf: null, model: 'fake-model', ts: NOW });
  });

  it('marks a duplicate as known and links the original (the one reply)', () => {
    const d = decide(input('bug-reports'), cls({ duplicateOf: '555' }), OPTS);
    expect(d.tags).toEqual(['known']);
    expect(d.reply).toContain('<#555>');
    expect(d.reply).not.toContain('!');
    expect(d.record).toMatchObject({ status: 'known', duplicateOf: '555' });
  });

  it('tags a feature request as feature + acknowledged without replying', () => {
    const d = decide(input('bug-reports'), cls({ kind: 'feature' }), OPTS);
    expect(d.tags).toEqual(['feature', 'acknowledged']);
    expect(d.reply).toBeNull();
    expect(d.record).toMatchObject({ kind: 'feature', status: 'acknowledged' });
  });

  it('tags a question as question + acknowledged, and praise/other as acknowledged only', () => {
    expect(decide(input('bug-reports'), cls({ kind: 'question' }), OPTS).tags).toEqual(['question', 'acknowledged']);
    expect(decide(input('bug-reports'), cls({ kind: 'praise' }), OPTS).tags).toEqual(['acknowledged']);
    expect(decide(input('bug-reports'), cls({ kind: 'other' }), OPTS).tags).toEqual(['acknowledged']);
  });

  it('never sets not-an-issue itself; that verdict is the owner\'s', () => {
    for (const kind of ['feature', 'question', 'praise', 'other'] as const) {
      expect(decide(input('bug-reports'), cls({ kind }), OPTS).tags).not.toContain('not-an-issue');
    }
  });
});

describe('decide for a #feedback thread', () => {
  it('tags the kind and acknowledges, silently', () => {
    expect(decide(input('feedback'), cls({ kind: 'feature' }), OPTS).tags).toEqual(['idea', 'acknowledged']);
    expect(decide(input('feedback'), cls({ kind: 'question' }), OPTS).tags).toEqual(['question', 'acknowledged']);
    expect(decide(input('feedback'), cls({ kind: 'praise' }), OPTS).tags).toEqual(['praise', 'acknowledged']);
    expect(decide(input('feedback'), cls({ kind: 'praise' }), OPTS).reply).toBeNull();
  });

  it('acknowledges without a kind tag when the kind has no tag', () => {
    expect(decide(input('feedback'), cls({ kind: 'bug' }), OPTS).tags).toEqual(['acknowledged']);
    expect(decide(input('feedback'), cls({ kind: 'other' }), OPTS).tags).toEqual(['acknowledged']);
  });
});

describe('decide for a #general message', () => {
  it('requests a bug thread for a high-confidence bug', () => {
    const d = decide(input('general'), cls(), OPTS);
    expect(d.createBugThread).not.toBeNull();
    expect(d.createBugThread!.title).toBe('Spec bar shows double the real cost');
    expect(d.createBugThread!.body).toContain('<@u1>');
    expect(d.createBugThread!.body).toContain('The spec bar shows 50%');
    expect(d.tags).toEqual(['acknowledged']);
    expect(d.reply).toContain('{thread}');
    expect(d.record).toMatchObject({ status: 'acknowledged', threadId: null, messageId: 'm1' });
  });

  it('does nothing for a medium-confidence bug or a non-bug', () => {
    for (const c of [cls({ confidence: 'medium' }), cls({ kind: 'question' })]) {
      const d = decide(input('general'), c, OPTS);
      expect(d.createBugThread).toBeNull();
      expect(d.tags).toEqual([]);
      expect(d.reply).toBeNull();
      expect(d.record).toBeNull();
    }
  });
});

describe('decide on classifier failure', () => {
  it('takes no action and records unclassified with the error', () => {
    const d = decide(input('bug-reports'), new Error('429 rate limited'), OPTS);
    expect(d.tags).toEqual([]);
    expect(d.reply).toBeNull();
    expect(d.createBugThread).toBeNull();
    expect(d.record).toMatchObject({ status: 'unclassified', kind: null, rationale: '429 rate limited' });
  });
});

describe('reply style', () => {
  it('the general-channel reply is one short sentence with the thread placeholder', () => {
    const d = decide(input('general'), cls(), OPTS);
    expect(d.reply).toBe('This looks like a bug report, so I opened {thread} for it.');
  });
});
