---
id: ISS-01M5F0H5G5JP4RGQED9TAKEKSH
type: issue
status: done
owner: eng
title: new --game, the runbook and the manual for the game layer
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@5]
derives_from: [ADR-0004]
depends: [ISS-01M5F0H5A8A4P1HP887ZBTM53C]
paths: [src/cli.ts, tests/cli.test.ts, docs/runbook.md, mural/manual/index.md, README.md]
acceptance: [bash tests/accept-cli.sh]
cw_tokens: 4000
cw_files: 5
phase: breadth
model: mid
max_turns: 25
red_receipt: 50a9737d8d24808d
red_time: 2026-10-21T10:46:24Z
red_sha: 4bfc53c950d379ea2dbc67fba38c76013d69d33f
receipt_sha: 4bfc53c950d379ea2dbc67fba38c76013d69d33f
receipt_time: 2026-10-21T11:05:11Z
receipt_tests: 058304b2325c4045
actual_files: 5
actual_files_total: 22
actual_wall_s: 6.3
---
## Contract

REQ-005 (Andrew, 2026-10-21): "B but lets call it #wow-forever-chat"; ADR-0004.

REQ-1 `new <slug> --name <Name> --game <game>`: when hub.json has games, `--game` is
required and must name one of them (exit 2 listing the game slugs otherwise) and the new
project is saved with it; without games `--game` is refused (exit 2). The usage text names
`--game`.

REQ-2 The runbook gets a "Games" section: the hub.json shape (`gamePrompt`, `games` with
slug, name, chat, prompt, emoji), what `apply` builds and how onboarding then reads, that
the single question goes, that members who joined before keep their project roles and pick
their game in Channels & Roles, and that new game categories land at the bottom of the
channel list (drag them above their projects). The manual's critical list gains the game
layer in one line; the README names it.

## Acceptance

- tests/cli.test.ts: with games, `new` without `--game` exits 2 naming the games; with an
  unknown game exits 2; with `--game wow-forever` hub.json holds the project with that
  game; without games `--game` exits 2.
- bash tests/accept-cli.sh green.
