---
id: ISS-01M50HBVFMAQKAMG2HEBC3AGP7
type: issue
status: done
owner: eng
title: onboarding options carry a custom emoji id — hub.json emojiId, emoji_id in the PUT
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@4]
derives_from: []
depends: [ISS-01M4YRK2AMTS9NS8QGGV8PZRCV, ISS-01M4YRK271FFV7JQGVRH31XMB5]
paths: [hub.json, README.md, src/apply.ts, src/discord.ts, src/model.ts, src/onboarding.ts, src/plan.ts, tests/helpers.ts, tests/onboarding.test.ts, tests/plan.test.ts]
acceptance: [bash tests/accept-onboarding.sh, bash tests/accept-plan.sh]
cw_tokens: 4000
cw_files: 10
phase: finish
model: mid
max_turns: 25
method: retroactive
shipped_sha: [6dda599645f5152d1ef4cef660ec6a36264d3a70, 2fb61b45d248925fcc1184117b94967c97bc06b6]
shipped_time: 2026-10-15T04:47:04Z
receipt_sha: 01009a7d6540e0439e830d6deba89950ecbd178a
receipt_time: 2026-10-15T19:42:40Z
receipt_tests: 2c1a030dc87e6e32
actual_files: -1
actual_files_total: -1
actual_wall_s: 1.4
---

## Contract

Shipped 2026-10-14 (commits 6dda599, 2fb61b4). The pick-list shows each plugin's own
icon instead of a unicode stand-in.

`src/model.ts`: `ProjectConfig.emojiId?: string` (custom server emoji id; `emoji` is
ignored when set), carried through `DesiredProject`; `SnapOption.emoji_id?: string |
null`.

`src/onboarding.ts`: `DesiredOption.emojiId`, `PutOption.emoji_id`; `echoPrompt` and
the option builder write `emoji_id` when present, else `emoji_name`, never both; the
in-sync check compares the emoji too (id when desired has one, name when it has only a
unicode emoji, nothing when it has neither), so a changed emoji re-plans onboarding.

`src/discord.ts` `mapOnboarding`: records `emoji_id` from `opt.emoji.id`.
`src/plan.ts`: `PlannedOption.emojiId` passed through to `upsert-onboarding`.
`src/apply.ts`: builds `DesiredOption` with `emojiId`.

`hub.json`: loadout-lab and goal-planner carry both `emoji` and `emojiId`. README:
`emoji` (unicode) or `emojiId` (server emoji id) is what members see.

Tests: tests/onboarding.test.ts "prefers a custom emoji id over a unicode emoji, and
re-syncs when the emoji changes"; tests/plan.test.ts "re-plans onboarding when a
project gains a custom emoji id"; tests/helpers.ts option helper carries `emoji_id`.
