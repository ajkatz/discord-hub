---
id: ISS-01M50HBVK4SF3SD203P4ADTV4D
type: issue
status: draft
owner: eng
title: new --icon — upload the project icon as a server emoji for the pick-list
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@4]
derives_from: []
depends: [ISS-01M4YRK2CD4S2WNDHCEFJPFZVH]
paths: [README.md, src/cli.ts, src/discord.ts, src/fake.ts, tests/apply.test.ts, tests/cli.test.ts, tests/fixtures/icon.png]
acceptance: [bash tests/accept-cli.sh, bash tests/accept-apply.sh]
cw_tokens: 5000
cw_files: 7
phase: finish
model: mid
max_turns: 25
method: retroactive
shipped_sha: [77aecb35cae73873143977f2581377bc3ccf6653]
shipped_time: 2026-10-15T05:28:58Z
---

## Contract

Shipped 2026-10-14 (commit 77aecb3). One command provisions a project with its own icon
on the onboarding pick-list; no manual emoji upload.

`src/discord.ts`: `DiscordApi.createEmoji(guildId, name, imageDataUri) -> { id }`.
`RestDiscordApi` lists the guild's emojis first and returns the id of an existing emoji
with the same name (idempotent); otherwise POSTs `{ name, image }` with an audit reason
and returns the new id (throws when Discord returns no id).

`src/fake.ts`: in-memory `emojis` map; same name -> same id, one mutation recorded on
first creation. `src/cli.ts` `SnapshotApi.createEmoji` refuses like every mutation.

`src/cli.ts`: `--icon <file>` on `new` (usage: `[--emoji E | --icon icon.png]`).
Extension must be png, jpg (sent as jpeg) or gif, else an error naming the file. Emoji
name = slug with non-alphanumerics removed, at most 32 chars, padded to at least 2.
Under `--dry-run` or `--snapshot`: prints "would upload <file> as :name: and use it on
the pick-list", uploads nothing. Live: reads the file as a base64 data URI, calls
`createEmoji`, sets the project's `emojiId`, saves `hub.json` BEFORE the plan so the
same run's `upsert-onboarding` carries the id, and prints the id.

README: `new ... --icon icon.png` is the documented form.

Tests: tests/cli.test.ts "with --icon in snapshot mode reports the emoji it would
upload" (uses tests/fixtures/icon.png); tests/apply.test.ts "fake createEmoji returns
the same id for the same name and records one mutation".
