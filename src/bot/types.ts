export type Kind = 'bug' | 'feature' | 'question' | 'praise' | 'other';
export type Confidence = 'low' | 'medium' | 'high';
export type Severity = 'low' | 'medium' | 'high';

/** What the classifier says about one post. */
export interface Classification {
  kind: Kind;
  /** One line, <= 100 chars, usable as a thread title. */
  summary: string;
  severity: Severity | null;
  confidence: Confidence;
  /** Thread id of an open record this duplicates, or null. */
  duplicateOf: string | null;
  rationale: string;
}

export type TriageChannelKind = 'bug-reports' | 'feedback' | 'general';

export interface ClassifyInput {
  project: string;
  channelKind: TriageChannelKind;
  channelId: string;
  threadId: string | null;
  messageId: string;
  title: string;
  body: string;
  author: { id: string; name: string };
  openRecords: TriageRecord[];
}

export interface Classifier {
  readonly model: string;
  classify(input: ClassifyInput): Promise<Classification>;
}

export type Status =
  | 'acknowledged'
  | 'known'
  | 'not-an-issue'
  | 'in-progress'
  | 'fixed'
  | 'needs-info'
  | 'unclassified'
  | 'planned'
  | 'declined';

export const STATUSES: Status[] = ['acknowledged', 'known', 'not-an-issue', 'in-progress', 'fixed', 'needs-info', 'unclassified', 'planned', 'declined'];
export const OPEN_STATUSES: Status[] = ['acknowledged', 'known', 'in-progress', 'needs-info'];

/** One line of data/triage.jsonl. Append-only; the newest record per thread wins. */
export interface TriageRecord {
  ts: string;
  project: string;
  channelId: string;
  threadId: string | null;
  messageId: string;
  kind: Kind | null;
  status: Status;
  summary: string;
  rationale: string;
  duplicateOf: string | null;
  model: string;
}

export interface Decision {
  /** Forum tag names to apply (resolved to ids by the bot). */
  tags: string[];
  /** Reply text; `{thread}` is replaced with the created thread mention. */
  reply: string | null;
  createBugThread: { title: string; body: string } | null;
  record: TriageRecord | null;
}
