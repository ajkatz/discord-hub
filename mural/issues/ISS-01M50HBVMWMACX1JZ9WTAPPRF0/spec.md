---
id: ISS-01M50HBVMWMACX1JZ9WTAPPRF0
type: issue
status: done
owner: eng
title: bot reloads hub.json on every channel-map refresh
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@4]
derives_from: []
depends: [ISS-01M4YS4JPD4GTYTH3BC87FY61Q]
paths: [src/bot/index.ts]
acceptance: [npm run typecheck]
cw_tokens: 1000
cw_files: 1
phase: finish
model: mid
max_turns: 25
method: retroactive
shipped_sha: [77aecb35cae73873143977f2581377bc3ccf6653]
shipped_time: 2026-10-15T05:28:58Z
receipt_sha: 3c3dd2b117c1612b514d28bb1570dd9dbb400d0d
receipt_time: 2026-10-15T19:43:11Z
receipt_tests: 883acc6b5fb04a6e
actual_files: -1
actual_files_total: -1
actual_wall_s: 1.0
---

## Contract

Shipped 2026-10-14 (commit 77aecb3, with `new --icon`). A project added by `new` on
any machine and rsynced to the pi with `scripts/deploy-pi.sh` is triaged without a bot
restart.

`src/bot/index.ts`: `HUB_PATH` constant (env `HUB_PATH` or `hub.json`); `hub` becomes
`let`. `refreshChannels()` first re-reads `hub = loadHub(HUB_PATH)` inside try/catch —
a `hub.json` that fails to load or validate logs "hub.json reload failed, keeping the
previous one: <reason>" and keeps the loaded hub — then rebuilds the channel map from
a fresh snapshot and logs the channel count. Called on ready and every 15 minutes
(unchanged interval).

The gateway shell is untested by design (ISS-01M4YS4JPD4GTYTH3BC87FY61Q); the
mechanical check is `npm run typecheck`. docs/handoff-wow.md documents the 15-minute
pickup.
