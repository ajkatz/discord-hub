---
id: ISS-01M50HBVACSZN74PWSES9DYY05
type: issue
status: draft
owner: eng
title: forum guidelines + announcements topic — set-topic op reconciles existing channels
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@4]
derives_from: []
depends: [ISS-01M4YRK271FFV7JQGVRH31XMB5, ISS-01M4YRK28WWY8PXJ54M3MNX4M0]
paths: [src/apply.ts, src/discord.ts, src/fake.ts, src/model.ts, src/plan.ts, tests/apply.test.ts, tests/helpers.ts, tests/plan.test.ts]
acceptance: [bash tests/accept-plan.sh, bash tests/accept-apply.sh]
cw_tokens: 4000
cw_files: 8
phase: finish
model: mid
max_turns: 25
method: retroactive
shipped_sha: [0915a50cf0b0c1b24481e7489a51e5cd24fe33ae]
shipped_time: 2026-10-15T04:24:07Z
---

## Contract

Shipped 2026-10-14 (commit 0915a50). Forums get post guidelines members read before
posting; `#announcements` gets a topic; existing channels are brought in line.

`src/model.ts`: `DesiredChannel.topic: string` (empty on `#general`); constants
`ANNOUNCEMENTS_TOPIC` ("Release notes and development updates. Posted automatically on
every push.") and the forum guidelines text (at this commit `BUG_GUIDELINES` and
`FEEDBACK_GUIDELINES`; a single `FEEDBACK_GUIDELINES` after the forum merge);
`desiredFor` fills `topic` per channel. `SnapChannel.topic?: string | null` — absent
when the snapshot does not report topics, null when the channel has none.

`src/plan.ts`: `create-channel` ops carry `topic`; new op `set-topic { channelId,
channel, category, topic }` planned for an existing channel whose desired topic is
non-empty, whose snapshot topic is known, and whose current topic differs; ordered
after renames and before webhooks. `describeOp` prints "set guidelines on ...".

`src/apply.ts`: `create-channel` passes `topic` when non-empty; `set-topic` calls
`api.modifyChannel(channelId, { topic })`.

`src/discord.ts` / `src/fake.ts`: `modifyChannel` accepts `topic`; the live snapshot
maps `topic` from the channel payload; the fake stores and reports it.

Tests: tests/plan.test.ts "plan guidelines" (sets guidelines on an existing forum that
has none and nothing when they match; leaves a channel alone when the snapshot does not
report topics); tests/apply.test.ts "writes the guidelines as the forum topic";
tests/helpers.ts snapshot helpers carry `topic`.
