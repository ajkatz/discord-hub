---
id: ISS-01M4YRK2CD4S2WNDHCEFJPFZVH
type: issue
status: draft
owner: eng
title: cli + runbook + readme — init, new, plan, apply, archive
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@3]
derives_from: []
depends: [ISS-01M4YRK271FFV7JQGVRH31XMB5, ISS-01M4YRK28WWY8PXJ54M3MNX4M0, ISS-01M4YRK2AMTS9NS8QGGV8PZRCV]
paths: [src/cli.ts, bin/discord-hub.mjs, docs/runbook.md, README.md, hub.example.json, tests/cli.test.ts, tests/fixtures, tests/accept-cli.sh, mural/manual/index.md, .gitignore]
acceptance: [bash tests/accept-cli.sh]
cw_tokens: 9000
cw_files: 10
phase: breadth
model: mid
max_turns: 25
---
## Contract

`discord-hub <cmd> [--hub hub.json] [--snapshot file.json] [--dry-run]` via
`bin/discord-hub.mjs` -> `dist/cli.js` (`npm run build`). Commands: `init` (plan with
shared channels + onboarding prompt, apply), `new <slug> --name <Name> [--emoji E]
[--repo owner/repo]` (addProject, saveHub, plan + apply for the whole hub, print the new
webhook URL once with the GitHub-secret instruction), `plan` (print ops, no mutation),
`apply` (plan + apply; `--dry-run` prints), `archive <slug>` (set archived, save, apply).
Live commands read `DISCORD_BOT_TOKEN` and `hub.guildId`; a missing token exits 2 with a
one-line message naming the variable. `--snapshot` substitutes a JSON `GuildSnapshot`
for the API and implies dry-run. API failures print endpoint, status and Discord's
message, list completed ops, exit 1. Exit codes: 0 ok, 1 failure, 2 usage.

`docs/runbook.md`: one-time server setup (create server, enable Community, create the
bot application + invite URL with MANAGE_GUILD, MANAGE_ROLES, MANAGE_CHANNELS,
MANAGE_WEBHOOKS, bot role above project roles; `init`; enable onboarding in the UI;
migrating the Loadout Lab and Goal Planner servers: pinned invite + re-point
DISCORD_WEBHOOK_URL). README: install, use, contracts, develop. `mural/manual/index.md`
filled per ADR-0018. `hub.example.json` ships with loadout-lab and goal-planner.

Tests (tests/cli.test.ts): `plan --snapshot tests/fixtures/empty.json --hub
tests/fixtures/hub.json` prints the eight ops; missing token on `apply` exits 2 and
names DISCORD_BOT_TOKEN; `--snapshot` with `apply` performs no mutation. `tests/accept-cli.sh`
runs them after `npm run build`.
