---
id: ISS-01M5F0H5A8A4P1HP887ZBTM53C
type: issue
status: done
owner: eng
title: games above projects - model, planner, onboarding prompts, applier
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@5]
derives_from: [ADR-0004]
depends: []
paths: [src/model.ts, src/plan.ts, src/onboarding.ts, src/apply.ts, src/fake.ts, tests/games.test.ts, tests/accept-games.sh, tests/plan.test.ts, mural/assumptions/ASM-01M5F0H4Y5DW3MRCQ0YSM51KJ2-several-new-onboarding-prompts-in-one-put.md]
acceptance: [bash tests/accept-games.sh, bash tests/accept-plan.sh, bash tests/accept-onboarding.sh, bash tests/accept-apply.sh]
cw_tokens: 18000
cw_files: 9
phase: breadth
model: mid
max_turns: 25
red_receipt: 1c493278cee86773
red_time: 2026-10-21T10:41:25Z
red_sha: 4bfc53c950d379ea2dbc67fba38c76013d69d33f
receipt_sha: 4bfc53c950d379ea2dbc67fba38c76013d69d33f
receipt_time: 2026-10-21T11:04:58Z
receipt_tests: 296af6ae7c6d17b7
actual_files: 9
actual_files_total: 22
actual_wall_s: 7.5
---
## Contract

Andrew, 2026-10-21: "maybe welcome can route one level higher from OSRS / WoW Forever
into the subcategories from there" (REQ-004), then, choosing B among A/B/C: "B but lets
call it #wow-forever-chat" (REQ-005). Design: ADR-0004.

REQ-1 hub.json games. `Hub` gains optional `gamePrompt` and `games`: each game a `slug`
(SLUG_RE, also its role), `name` (its option title and category name), `chat` (SLUG_RE,
the channel name), `prompt` (its plugin question's title), optional `emoji` / `emojiId`.
`ProjectConfig` gains optional `game`. With games: `gamePrompt` non-empty; game slugs,
names and the titles of all questions unique; no game slug equal to a project slug (they
are role names) and no game name equal to a project name (category names); every live
project names a game of the list; a project naming an unknown game fails with that game
in the message, a live project without one fails with the project's slug. Without games
(absent or empty) a project naming a game fails, and so does a `gamePrompt`. A game entry
that is no object fails cleanly; shown names and titles (project and game names, question
titles) may not start or end with spaces. Optional `retiredPrompts` (question titles) may
not hold a title that is asked. `desiredForGame(g)`: role `<slug>`, category `<name>`,
chat = text channel `<chat>`, roleCanPost true, topic `gameChatTopic(name)`.

REQ-2 The planner builds the game areas. Per game, before the projects: create-role
(mentionable) when the role is missing, create-category (private to the role) when the
category is missing, create-channel for the chat when missing under it, set-topic when the
chat's known topic differs. Nothing else about projects changes.

REQ-3 One onboarding op, several questions. `upsert-onboarding` becomes
`{ prompts: { title, options }[]; drop: string[] }` with options
`{ title, emoji?, emojiId?, roles: string[], channels: { category, name }[] }`. Without
games: one question titled `onboardingPrompt`, one option per live project (role = the
slug, channels = its three), drop [] - the old behaviour, the old dirty rules. With games:
the `gamePrompt` question (one option per game: its role, its chat, its emoji), then per
game with at least one live project its `prompt` question (one option per live project of
that game: its own role and its three channels - after the critic's review the game role
no longer rides on project options: if Discord takes an option's roles away on deselect
without looking at the member's other picks, unpicking one addon would strip the game
chat); `drop` = the live titles that must go, each once: `onboardingPrompt` unless it is
one of these, the question of a game left with no live project, and every title in
`retiredPrompts` (in both modes - how a renamed question's old title leaves). The op is
planned when any desired question is missing, out of order, differs (option set by title,
roles, channels, emoji: the custom one, else the unicode one compared without U+FE0F, else
none), or a dropped one is live.

REQ-4 The merge keeps ids and order. `mergePrompts(current, desired, drop, newPromptId)`:
for each desired title its FIRST live match is the hub's (a later same-titled question is
echoed, as before); the hub's questions are written as one block in desired order where
the first of them stands (ids kept by title; questions not yet live with distinct
placeholder ids `newPromptId`, then +1, +2 when numeric), or at the end when none is live;
a dropped one is omitted; any other is echoed in place; null when every desired question
matches in order and nothing to drop is live. `mergeOnboarding(current, title, options,
id)` stays as the one-question wrapper.

REQ-5 The applier resolves several roles and channels per option (by name, through the
existing resolver) and writes the merged questions with the seven default channels as
before. The fake keeps `emoji_id` on the options it stores (it dropped it).

## Acceptance

- tests/games.test.ts: the validation cases of REQ-1; an empty guild planned with two games
  and three projects (game areas, the three questions in order, project options with their
  own role and channels, the game option with the game role and chat); the fake carrying
  the single question, switched to games: one PUT drops it and creates the three in order,
  a second plan is empty; mergePrompts writes the block in order with distinct
  placeholders, echoes an unmanaged question and a same-titled second one, returns null in
  sync; a game without live projects gets no question, gets it back in its place when a
  project comes, and a plan sees questions out of order; a retired title is dropped once;
  a unicode emoji change re-plans, a U+FE0F difference does not.
- The critic's fuzzers (scratchpad exp/games_fuzz.ts, 3 seeds x 300 runs of 12 edits: no
  order drift, stale emoji, archived-but-pickable, non-convergence or duplicate ids) and
  exp/compat.ts (2000 hub x guild cases without games: 0 differences from HEAD).
- tests/plan.test.ts: the two assertions on the onboarding op restated in its new shape,
  same content; every other plan, onboarding and apply test unchanged and green.
- bash tests/accept-games.sh, accept-plan.sh, accept-onboarding.sh, accept-apply.sh green.

## Review (one critic, armament tier 4k-20k; round 1, 2026-10-21)

1. should-fix, questions orphaned when a title changes or a game goes: ADDRESSED with
   `retiredPrompts` (explicit; the hub never guesses which foreign-looking question to
   delete) and `gamePrompt` without games refused.
2. should-fix, question order drifts (append rule): ADDRESSED - the block in desired order,
   and the planner checks order.
3. nit, two live questions of one title both rebuilt (differs from HEAD): ADDRESSED - the
   first is the hub's, the second echoed.
4. nit, unicode emoji changes never planned: ADDRESSED - compared without U+FE0F; an option
   wearing an emoji the hub no longer wants is re-planned too.
5. nit, a title dropped twice: ADDRESSED - drops are unique.
6. nit, validation holes: ADDRESSED for `gamePrompt` without games, non-object game
   entries, names and titles with spaces at an end; NOT for Discord's length limits (not
   pinned down; a too-long name fails loudly at apply).
7. risk, deselecting one addon could strip the game role shared by several options:
   ADDRESSED by design - project options no longer carry the game role (ADR-0004 amended).
