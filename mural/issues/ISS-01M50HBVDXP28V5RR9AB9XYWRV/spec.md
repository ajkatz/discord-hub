---
id: ISS-01M50HBVDXP28V5RR9AB9XYWRV
type: issue
status: draft
owner: eng
title: one #feedback forum per project — kind + status tags; #bug-reports removed
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@4]
derives_from: []
depends: [ISS-01M4YS4JPD4GTYTH3BC87FY61Q, ISS-01M4YRK271FFV7JQGVRH31XMB5]
paths: [README.md, docs/runbook.md, mural/manual/index.md, src/bot/channels.ts, src/bot/classifier.ts, src/bot/index.ts, src/bot/triage.ts, src/bot/types.ts, src/model.ts, tests/apply.test.ts, tests/channels.test.ts, tests/cli.test.ts, tests/model.test.ts, tests/plan.test.ts, tests/triage.test.ts]
acceptance: [npx vitest run tests/triage.test.ts tests/channels.test.ts tests/model.test.ts tests/plan.test.ts tests/apply.test.ts, bash tests/accept-cli.sh]
cw_tokens: 8000
cw_files: 15
phase: finish
model: mid
max_turns: 25
method: retroactive
shipped_sha: [0804576daeb74ff52274c8c855bb4a8ae0f10133]
shipped_time: 2026-10-15T05:17:52Z
---

## Contract

Shipped 2026-10-14 (commit 0804576). Two forums per project split one small audience
and sent members to the wrong one; one `#feedback` forum carries everything and the
kind tag says what a post is.

`src/model.ts`: `KIND_TAGS = [bug, idea, question, praise]`, `STATUS_TAGS =
[acknowledged, known, in-progress, fixed, not-an-issue, needs-info, planned,
declined]`, `FEEDBACK_TAGS = [...KIND_TAGS, ...STATUS_TAGS]` (kind first); `BUG_TAGS`
and `BUG_GUIDELINES` removed; `FEEDBACK_GUIDELINES` covers bugs ("For a bug include
what you did, what happened, what you expected, the plugin version, and a screenshot");
`desiredFor` yields three channels: `#announcements`, `#general`, `#feedback`.

`src/bot/types.ts`: `TriageChannelKind = feedback | general`; `siblings` removed from
`ClassifyInput`. `src/bot/channels.ts`: `MappedKind = feedback | general |
announcements`.

`src/bot/triage.ts` `decide()`: `KIND_TAG = { bug: bug, feature: idea, question:
question, praise: praise }` (other gets none). `#feedback` thread: bug with
`duplicateOf` -> tags `[bug, known]` + the one linking reply; otherwise `[kindTag,
acknowledged]` (or `[acknowledged]` for other), no reply. `#general` message: bug with
high confidence -> `createBugThread` in `#feedback`, tags `[bug, acknowledged]`, reply
naming the thread; anything else -> no tags, no reply, no record. Error -> no tags, no
reply, `unclassified` record.

`src/bot/index.ts`: thread handlers accept only `feedback` parents; the `#general`
path creates the thread in the project's `#feedback` forum. `src/bot/classifier.ts`:
prompt names `#feedback`.

Docs: README.md, docs/runbook.md and mural/manual/index.md describe one forum with
kind + status tags.

Tests: every suite that enumerated four channels or the `bug-reports` kind now
expects three channels / `feedback`: tests/triage.test.ts (all decide branches above),
tests/channels.test.ts, tests/model.test.ts, tests/plan.test.ts, tests/apply.test.ts,
tests/cli.test.ts ("prints the seven ops for one project").
