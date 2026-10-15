import { describe, it, expect } from 'vitest';
import { decide } from '../src/bot/triage.js';
import type { Classification, ClassifyInput } from '../src/bot/types.js';

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

describe('decide for a #feedback thread', () => {
  it('tags a new bug as bug + acknowledged, silently', () => {
    const d = decide(input('feedback'), cls(), OPTS);
    expect(d.tags).toEqual(['bug', 'acknowledged']);
    expect(d.reply).toBeNull();
    expect(d.createBugThread).toBeNull();
    expect(d.record).toMatchObject({ project: 'loadout-lab', threadId: 't1', kind: 'bug', status: 'acknowledged', duplicateOf: null, model: 'fake-model', ts: NOW });
  });

  it('marks a duplicate bug as known and links the original (the one reply)', () => {
    const d = decide(input('feedback'), cls({ duplicateOf: '555' }), OPTS);
    expect(d.tags).toEqual(['bug', 'known']);
    expect(d.reply).toContain('<#555>');
    expect(d.reply).not.toContain('!');
    expect(d.record).toMatchObject({ status: 'known', duplicateOf: '555' });
  });

  it('maps the other kinds to idea / question / praise, all acknowledged, no reply', () => {
    expect(decide(input('feedback'), cls({ kind: 'feature' }), OPTS).tags).toEqual(['idea', 'acknowledged']);
    expect(decide(input('feedback'), cls({ kind: 'question' }), OPTS).tags).toEqual(['question', 'acknowledged']);
    expect(decide(input('feedback'), cls({ kind: 'praise' }), OPTS).tags).toEqual(['praise', 'acknowledged']);
    expect(decide(input('feedback'), cls({ kind: 'other' }), OPTS).tags).toEqual(['acknowledged']);
    for (const kind of ['feature', 'question', 'praise', 'other'] as const) {
      expect(decide(input('feedback'), cls({ kind }), OPTS).reply).toBeNull();
    }
  });

  it('never sets a verdict tag itself; those are the owner\'s', () => {
    for (const kind of ['bug', 'feature', 'question', 'praise', 'other'] as const) {
      const tags = decide(input('feedback'), cls({ kind }), OPTS).tags;
      for (const verdict of ['not-an-issue', 'fixed', 'in-progress', 'planned', 'declined', 'needs-info']) expect(tags).not.toContain(verdict);
    }
  });
});

describe('decide for a #general message', () => {
  it('requests a feedback thread for a high-confidence bug, tagged bug + acknowledged', () => {
    const d = decide(input('general'), cls(), OPTS);
    expect(d.createBugThread).not.toBeNull();
    expect(d.createBugThread!.title).toBe('Spec bar shows double the real cost');
    expect(d.createBugThread!.body).toContain('<@u1>');
    expect(d.createBugThread!.body).toContain('The spec bar shows 50%');
    expect(d.tags).toEqual(['bug', 'acknowledged']);
    expect(d.reply).toBe('This looks like a bug report, so I opened {thread} for it.');
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
    const d = decide(input('feedback'), new Error('429 rate limited'), OPTS);
    expect(d.tags).toEqual([]);
    expect(d.reply).toBeNull();
    expect(d.createBugThread).toBeNull();
    expect(d.record).toMatchObject({ status: 'unclassified', kind: null, rationale: '429 rate limited' });
  });
});
