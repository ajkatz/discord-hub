import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { OPEN_STATUSES, type Status, type TriageRecord } from './types.js';

/** Append-only JSONL triage ledger; the newest record per thread is the current state. */
export class Ledger {
  constructor(private readonly path: string) {}

  append(r: TriageRecord): void {
    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, JSON.stringify(r) + '\n');
  }

  all(): TriageRecord[] {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, 'utf8')
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as TriageRecord);
  }

  /** Latest record per thread for one project, open statuses only, newest first, max 50. */
  open(project: string): TriageRecord[] {
    const latest = new Map<string, TriageRecord>();
    for (const r of this.all()) {
      if (r.project !== project || !r.threadId) continue;
      latest.set(r.threadId, r); // later lines overwrite earlier ones
    }
    return [...latest.values()]
      .filter((r) => OPEN_STATUSES.includes(r.status))
      .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
      .slice(0, 50);
  }

  /** Records a human (or bot) status change for a known thread. Returns false if unknown. */
  setStatus(threadId: string, status: Status, now: string): boolean {
    const prior = [...this.all()].reverse().find((r) => r.threadId === threadId);
    if (!prior) return false;
    this.append({ ...prior, ts: now, status, rationale: `status set to ${status}`, model: 'human' });
    return true;
  }
}
