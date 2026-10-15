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
  it('acknowledges a new bug', () => {
    const d = decide(input('bug-reports'), cls(), OPTS);
    expect(d.tags).toEqual(['acknowledged']);
    expect(d.reply).toContain('Spec bar shows double the real cost');
    expect(d.reply).not.toContain('!');
    expect(d.createBugThread).toBeNull();
    expect(d.record).toMatchObject({ project: 'loadout-lab', threadId: 't1', kind: 'bug', status: 'acknowledged', duplicateOf: null, model: 'fake-model', ts: NOW });
  });

  it('marks a duplicate as known and links the original', () => {
    const d = decide(input('bug-reports'), cls({ duplicateOf: '555' }), OPTS);
    expect(d.tags).toEqual(['known']);
    expect(d.reply).toContain('<#555>');
    expect(d.record).toMatchObject({ status: 'known', duplicateOf: '555' });
  });

  it('marks a question as not an issue', () => {
    const d = decide(input('bug-reports'), cls({ kind: 'question' }), OPTS);
    expect(d.tags).toEqual(['not-an-issue']);
    expect(d.record.status).toBe('not-an-issue');
  });

  it('points a feature request at #feedback and marks it not an issue', () => {
    const d = decide(input('bug-reports'), cls({ kind: 'feature' }), OPTS);
    expect(d.tags).toEqual(['not-an-issue']);
    expect(d.reply).toMatch(/#feedback is the better home/);
    expect(d.reply!.startsWith(cls().rationale)).toBe(true);
  });

  it('links the real #feedback channel when the sibling id is known', () => {
    const d = decide(input('bug-reports', { siblings: { feedback: '777' } }), cls({ kind: 'feature' }), OPTS);
    expect(d.reply).toContain('<#777> is the better home');
  });

  it('does not repeat the rationale', () => {
    const d = decide(input('bug-reports'), cls({ kind: 'question' }), OPTS);
    expect(d.reply!.split(cls().rationale).length - 1).toBe(1);
    expect(d.reply).toMatch(/Marked not an issue\.$/);
  });
});

describe('decide for a #feedback thread', () => {
  it('tags the kind and acknowledges', () => {
    expect(decide(input('feedback'), cls({ kind: 'feature' }), OPTS).tags).toEqual(['idea', 'acknowledged']);
    expect(decide(input('feedback'), cls({ kind: 'question' }), OPTS).tags).toEqual(['question', 'acknowledged']);
    expect(decide(input('feedback'), cls({ kind: 'praise' }), OPTS).tags).toEqual(['praise', 'acknowledged']);
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
  it('is at most two sentences', () => {
    const open: TriageRecord[] = [];
    const d = decide(input('bug-reports', { openRecords: open }), cls(), OPTS);
    const sentences = d.reply!.split(/[.?]\s/).filter(Boolean);
    expect(sentences.length).toBeLessThanOrEqual(2);
  });
});
