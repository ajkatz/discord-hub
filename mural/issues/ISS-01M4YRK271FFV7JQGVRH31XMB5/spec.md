---
id: ISS-01M4YRK271FFV7JQGVRH31XMB5
type: issue
status: draft
owner: eng
title: model + planner — hub.json truth, pure diff against a guild snapshot
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@1]
derives_from: []
depends: []
paths: [src/model.ts, src/plan.ts, tests/model.test.ts, tests/plan.test.ts, tests/helpers.ts, tests/accept-plan.sh, package.json, tsconfig.json]
acceptance: [bash tests/accept-plan.sh]
cw_tokens: 9000
cw_files: 8
phase: breadth
model: mid
max_turns: 25
---
## Contract

`src/model.ts` (NEW): `Hub { guildId, onboardingPrompt, projects: ProjectConfig[] }`,
`ProjectConfig { slug, name, emoji?, repo?, archived? }`. `loadHub(path)` /
`saveHub(path, hub)` round-trip JSON. `addProject(hub, p)` returns a new Hub; throws on
duplicate slug or slug not matching `^[a-z0-9-]+$`. `desiredFor(p) -> DesiredProject`:
roleName = slug; categoryName = name, or `[archived] <name>` when archived; four
channels in order: announcements (text, roleCanPost false), general (text), bug-reports
(forum, status tags acknowledged/known/in-progress/fixed/not-an-issue/needs-info),
feedback (forum, tags idea/question/praise/acknowledged/planned/declined). `SHARED_CHANNELS` = the seven top-level names (welcome, rules,
all-announcements, lounge, introductions, help, off-topic); rules + all-announcements
are read-only, the other five @everyone-writable. `GuildSnapshot` = observed roles,
channels (id, name, type, parentId, tags), webhooks (id, channelId, name), onboarding
(enabled, prompts[id, title, options[id, title, roleIds, channelIds]]).

`src/plan.ts` (NEW): `plan(hub, snapshot, {shared?: boolean}) -> Op[]`, pure. Name
matches are case-insensitive. Emits only what is missing, in order: create-role,
create-category, create-channel x4 (parent by category name, role by slug),
create-webhook ("Push announcer" in announcements, only if absent), rename-channel
(archived project whose category still carries the live name), create-shared-channel
(when shared true, each missing top-level text channel), and at most one
upsert-onboarding carrying the desired options for every non-archived project, emitted
only when the snapshot prompt is missing, has an option missing or extra, or any option's
roleIds/channelIds differ from the matched ids. A fully matching snapshot yields [].

Tests (vitest, tests/model.test.ts + tests/plan.test.ts) cover the PRD Acceptance rows
1-3 and the archive planning row; `tests/accept-plan.sh` runs them.
