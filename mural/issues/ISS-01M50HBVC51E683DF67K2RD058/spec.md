---
id: ISS-01M50HBVC51E683DF67K2RD058
type: issue
status: draft
owner: eng
title: silent triage — tags are the answer; kind tags; set-tags op adds missing forum tags
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@4]
derives_from: []
depends: [ISS-01M4YS4JPD4GTYTH3BC87FY61Q, ISS-01M4YRK271FFV7JQGVRH31XMB5, ISS-01M4YRK28WWY8PXJ54M3MNX4M0]
paths: [src/apply.ts, src/bot/classifier.ts, src/bot/index.ts, src/bot/triage.ts, src/bot/types.ts, src/discord.ts, src/fake.ts, src/model.ts, src/plan.ts, README.md, tests/apply.test.ts, tests/model.test.ts, tests/plan.test.ts, tests/triage.test.ts]
acceptance: [bash tests/accept-triage.sh, bash tests/accept-plan.sh, bash tests/accept-apply.sh]
cw_tokens: 7000
cw_files: 14
phase: finish
model: mid
max_turns: 25
method: retroactive
shipped_sha: [ba984bc2ca5ce852611cddec2c5a1a33713930be, ba249ac946cf1cd234c250aaadb50701b1c4fa22]
shipped_time: 2026-10-15T04:42:49Z
---

## Contract

Shipped 2026-10-14 in two commits (ba984bc, ba249ac) within fifteen minutes of each
other, after watching the bot reply to the first live posts: the per-post
acknowledgment read as noise. The intermediate state (two forums, `feature` and
`question` kind tags on `#bug-reports`, sibling-channel links in replies) was
superseded 35 minutes later by the single-forum issue; what survives is below.

`src/bot/triage.ts` `decide()`: a thread that is acknowledged gets its tags and NO
reply (`reply: null`); the only thread reply left is the duplicate case, one sentence
linking `<#duplicateOf>` ("This looks like the same issue as ..., so I have marked it
known."); the `#general` reply shrinks to "This looks like a bug report, so I opened
{thread} for it." Rationale text never appears in a reply; it lives in the ledger
record. Kind tags are applied next to the status tag.

`src/bot/classifier.ts`: the system prompt asks for a one-sentence rationale.

`src/model.ts`: forum tag vocabularies gain the kind tags (at this commit `feature` and
`question` on `BUG_TAGS`; folded into `KIND_TAGS` by the forum merge).
`SnapChannel.tagObjects?: { id, name }[]` — forum tags with ids, needed to add tags
without recreating the existing ones.

`src/plan.ts`: new op `set-tags { channelId, channel, category, tags }` planned when an
existing forum lacks any desired tag name (case-insensitive); `describeOp` prints "add
missing tags on ...".

`src/apply.ts`: `set-tags` merges the snapshot's `tagObjects` (id + name preserved)
with the missing names and calls `api.modifyChannel(channelId, { available_tags })`
once. `src/discord.ts` maps forum `available_tags` into `tagObjects`; `src/fake.ts`
keeps tag ids stable across `modifyChannel`.

Tests: tests/triage.test.ts (silent acknowledgment, the one duplicate reply, kind tags);
tests/plan.test.ts "plan tags" (adds missing forum tags to an existing forum and nothing
when they match); tests/apply.test.ts "set-tags via apply" (keeps existing tag ids and
appends the missing names); tests/model.test.ts tag vocabulary.
