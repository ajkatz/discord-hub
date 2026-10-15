---
id: ISS-01M4YRK28WWY8PXJ54M3MNX4M0
type: issue
status: draft
owner: eng
title: discord api seam + in-memory fake + applier — idempotent execution
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@1]
derives_from: []
depends: [ISS-01M4YRK271FFV7JQGVRH31XMB5]
paths: [src/discord.ts, src/fake.ts, src/apply.ts, tests/apply.test.ts, tests/accept-apply.sh]
acceptance: [bash tests/accept-apply.sh]
cw_tokens: 9000
cw_files: 5
phase: breadth
model: mid
max_turns: 25
---
## Contract

`src/discord.ts` (NEW): `interface DiscordApi { snapshot(guildId), createRole(guildId,
{name, mentionable}), createChannel(guildId, body), modifyChannel(id, {name}),
createWebhook(channelId, name) -> {id, token}, getOnboarding(guildId),
putOnboarding(guildId, body) }`. `RestDiscordApi(token)` implements it over
`@discordjs/rest` + `discord-api-types` v10 routes; `snapshot` maps roles, channels
(forum `available_tags` names), webhooks per announcements channel, and onboarding into
`GuildSnapshot`. Permission bits exported: VIEW_CHANNEL 1<<10, SEND_MESSAGES 1<<11,
CREATE_PUBLIC_THREADS 1<<35, SEND_MESSAGES_IN_THREADS 1<<38, as bigint strings.

`src/fake.ts` (NEW): `FakeDiscordApi` — same interface over an in-memory guild seeded
from a `GuildSnapshot`; assigns incrementing snowflake-like ids; records every mutating
call in `mutations: string[]`; `failOn?: string` makes the named method throw once, to
exercise the stop-on-failure path. @everyone role id == guildId (Discord invariant).

`src/apply.ts` (NEW): `apply(ops, api, hub, snapshot) -> ApplyResult { completed: Op[],
failed?: {op, error}, webhooks: {slug, url}[] }`. Resolves names to ids from the
snapshot plus ids created earlier in the same run. Category overwrites: @everyone deny
VIEW_CHANNEL, project role allow VIEW_CHANNEL; children repeat the category overwrites
(synced) and additionally deny SEND_MESSAGES + CREATE_PUBLIC_THREADS to the role on
announcements, allow SEND_MESSAGES + CREATE_PUBLIC_THREADS + SEND_MESSAGES_IN_THREADS on
general and both forums. Forum channels get `available_tags` from the op. Webhook url =
`https://discord.com/api/webhooks/<id>/<token>`, returned, never written to disk. On the
first thrown error apply stops and returns `failed` with the ops completed so far.
Onboarding ops call `mergeOnboarding` (ISS-01M4YRK2AMTS9NS8QGGV8PZRCV) and PUT only when it returns a body.

Tests (tests/apply.test.ts) use the REAL applier and planner against the fake: empty
guild -> structures exist with the right parents, tags and overwrites; re-plan against
`fake.snapshot()` is [] and a second apply records zero mutations; `failOn` stops with
the preceding ops listed. `tests/accept-apply.sh` runs them.
