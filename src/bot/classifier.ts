import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { Classification, Classifier, ClassifyInput } from './types.js';

const Schema = z.object({
  kind: z.enum(['bug', 'feature', 'question', 'praise', 'other']),
  summary: z.string().describe('One line, at most 100 characters, usable as a thread title'),
  severity: z.enum(['low', 'medium', 'high']).nullable(),
  confidence: z.enum(['low', 'medium', 'high']),
  duplicateOf: z.string().nullable().describe('threadId of the open record this duplicates, else null'),
  rationale: z.string().describe('One sentence a member can read: why this kind and status'),
});

const SYSTEM = `You triage community posts for a hobby game-plugin project (RuneLite and World of Warcraft plugins written by one developer). Classify each post for the maintainer.

Rules:
- kind: bug = something behaves wrongly or crashes; feature = a request for new or changed behaviour; question = asking how something works; praise = thanks or compliments; other = anything else (off-topic, spam, unclear).
- summary: one neutral line, at most 100 characters, no trailing period, written so it works as a thread title.
- severity: only for bugs (high = crash, data loss, unusable; medium = wrong result; low = cosmetic); null otherwise.
- confidence: how sure you are of the kind. Use high only when the post plainly describes it.
- duplicateOf: if an open record in the list describes the same defect, its threadId; otherwise null. Never guess an id that is not in the list.
- rationale: one short sentence (at most 25 words) addressed to the member, stating why: no exclamation marks, no promises about fixes, and do not restate the kind label itself (the reply around it already does).`;

export class ClaudeClassifier implements Classifier {
  private readonly client: Anthropic;

  constructor(public readonly model: string = 'claude-opus-5-5', client?: Anthropic) {
    this.client = client ?? new Anthropic();
  }

  async classify(input: ClassifyInput): Promise<Classification> {
    const open = input.openRecords.length
      ? input.openRecords.map((r) => `- threadId ${r.threadId}: ${r.summary} [${r.status}]`).join('\n')
      : '(none)';
    const user = [
      `Project: ${input.project}`,
      `Channel: #${input.channelKind}${input.channelKind === 'feedback' ? ' (bugs, ideas, questions and thanks all land here)' : ''}`,
      `Author: ${input.author.name}`,
      `Title: ${input.title}`,
      '',
      'Post:',
      input.body || '(no text)',
      '',
      'Open records for this project:',
      open,
    ].join('\n');

    const res = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 1024,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'low', format: zodOutputFormat(Schema) },
      messages: [{ role: 'user', content: user }],
    });
    if (res.stop_reason === 'refusal') {
      throw new Error(`classifier refused: ${res.stop_details?.explanation ?? 'no explanation'}`);
    }
    if (!res.parsed_output) throw new Error('classifier returned no parseable output');
    return res.parsed_output;
  }
}
