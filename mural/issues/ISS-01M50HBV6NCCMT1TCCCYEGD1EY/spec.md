---
id: ISS-01M50HBV6NCCMT1TCCCYEGD1EY
type: issue
status: draft
owner: eng
title: bot self-overwrite — apply grants the bot a member overwrite on every category and child
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@4]
derives_from: []
depends: [ISS-01M4YRK28WWY8PXJ54M3MNX4M0]
paths: [src/apply.ts, src/discord.ts, src/fake.ts, src/model.ts, tests/apply.test.ts]
acceptance: [bash tests/accept-apply.sh]
cw_tokens: 4000
cw_files: 5
phase: finish
model: mid
max_turns: 25
method: retroactive
shipped_sha: [6bcb56b2f832312cce1b2746927f00c4c901a65b]
shipped_time: 2026-10-15T04:07:54Z
---

## Contract

Shipped 2026-10-14 (commit 6bcb56b) after the first live `apply` failed with
403 50013 while creating children inside a category that denies `@everyone` View:
a category hidden from `@everyone` is hidden from the bot too, so Discord refuses
every create or edit inside it.

`src/discord.ts`: `READ_MESSAGE_HISTORY`, `MANAGE_WEBHOOKS`, `MANAGE_THREADS` bit
constants and `BOT_PERMS = VIEW_CHANNEL | SEND_MESSAGES | SEND_MESSAGES_IN_THREADS |
CREATE_PUBLIC_THREADS | READ_MESSAGE_HISTORY | MANAGE_WEBHOOKS | MANAGE_THREADS`.
`RestDiscordApi.snapshot()` also fetches `/users/@me` and records `botId`.

`src/model.ts`: `GuildSnapshot.botId?: string`.

`src/apply.ts`: `botOverwrite(botId)` returns `[{ id: botId, type: 1 (member), allow:
BOT_PERMS, deny: '0' }]` when the snapshot carries a bot id, else `[]`;
`categoryOverwrites` and `childOverwrites` append it after the `@everyone` deny and
the role allow. Nothing else about the overwrites changes.

`src/fake.ts`: `FakeDiscordApi.botId = '999000000000000000'`, reported in its snapshot.

Test (tests/apply.test.ts): "grants the bot itself access on the category and every
child" — every created category and child carries a member overwrite for the fake's
bot id whose allow bits equal `BOT_PERMS`.
