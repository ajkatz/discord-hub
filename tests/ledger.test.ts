import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Ledger } from '../src/bot/ledger.js';
import type { TriageRecord } from '../src/bot/types.js';

function rec(over: Partial<TriageRecord>): TriageRecord {
  return { ts: '2026-10-14T20:00:00.000Z', project: 'loadout-lab', channelId: 'c1', threadId: 't1', messageId: 'm1', kind: 'bug', status: 'acknowledged', summary: 's', rationale: 'r', duplicateOf: null, model: 'fake', ...over };
}

describe('Ledger', () => {
  it('creates the file on first append and round-trips records', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'));
    const path = join(dir, 'data', 'triage.jsonl');
    const l = new Ledger(path);
    expect(existsSync(path)).toBe(false);
    l.append(rec({ threadId: 't1' }));
    l.append(rec({ threadId: 't2', ts: '2026-10-14T21:00:00.000Z' }));
    expect(existsSync(path)).toBe(true);
    expect(new Ledger(path).all().map((r) => r.threadId)).toEqual(['t1', 't2']);
  });

  it('open() returns the latest status per thread, open statuses only, newest first', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'));
    const l = new Ledger(join(dir, 'triage.jsonl'));
    l.append(rec({ threadId: 't1', ts: '2026-10-14T20:00:00.000Z' }));
    l.append(rec({ threadId: 't2', ts: '2026-10-14T21:00:00.000Z', status: 'known' }));
    l.append(rec({ threadId: 't3', ts: '2026-10-14T22:00:00.000Z', status: 'not-an-issue' }));
    l.append(rec({ threadId: 't4', ts: '2026-10-14T23:00:00.000Z', project: 'goal-planner' }));
    l.setStatus('t1', 'fixed', '2026-10-15T00:00:00.000Z');
    const open = l.open('loadout-lab');
    expect(open.map((r) => r.threadId)).toEqual(['t2']);
  });

  it('setStatus appends rather than rewriting', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'));
    const l = new Ledger(join(dir, 'triage.jsonl'));
    l.append(rec({ threadId: 't1' }));
    l.setStatus('t1', 'in-progress', '2026-10-15T00:00:00.000Z');
    const all = l.all();
    expect(all).toHaveLength(2);
    expect(all[1]).toMatchObject({ threadId: 't1', status: 'in-progress', project: 'loadout-lab' });
  });

  it('ignores an unknown thread on setStatus', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'));
    const l = new Ledger(join(dir, 'triage.jsonl'));
    expect(l.setStatus('nope', 'fixed', '2026-10-15T00:00:00.000Z')).toBe(false);
    expect(l.all()).toEqual([]);
  });
});
