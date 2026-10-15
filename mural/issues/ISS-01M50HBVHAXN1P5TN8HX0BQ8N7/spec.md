---
id: ISS-01M50HBVHAXN1P5TN8HX0BQ8N7
type: issue
status: draft
owner: eng
title: onboarding PUT carries the seven shared channels as default_channel_ids
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@4]
derives_from: []
depends: [ISS-01M4YRK2AMTS9NS8QGGV8PZRCV, ISS-01M4YRK28WWY8PXJ54M3MNX4M0]
paths: [src/apply.ts, src/discord.ts, src/fake.ts, tests/apply.test.ts]
acceptance: [bash tests/accept-apply.sh]
cw_tokens: 2500
cw_files: 4
phase: finish
model: mid
max_turns: 25
method: retroactive
shipped_sha: [5ba07d329b287ef38da8ef11426aceb6c1380f5b]
shipped_time: 2026-10-15T05:26:07Z
---

## Contract

Shipped 2026-10-14 (commit 5ba07d3) after the live guild refused an onboarding PUT:
Discord rejects onboarding edits unless at least seven default channels (five of them
`@everyone`-writable) are listed in the same request, and the shared top-level set is
exactly that.

`src/discord.ts`: `DiscordApi.putOnboarding(guildId, { prompts, default_channel_ids?
})`.

`src/apply.ts` `upsert-onboarding`: resolves `SHARED_CHANNELS` by name among the
snapshot's top-level text channels; when all seven resolve, sends `{ prompts,
default_channel_ids: [the seven ids] }`; otherwise sends `{ prompts }` alone (the
runbook's `init` creates the seven first).

`src/fake.ts`: records the last `default_channel_ids` as `defaultChannelIds` for
assertions.

Tests (tests/apply.test.ts "onboarding defaults via apply"): sends the seven shared
channels as default channels when they all exist; sends only prompts when the shared
set is incomplete.
