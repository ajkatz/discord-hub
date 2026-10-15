---
id: ADR-0002
type: adr
status: active
owner: user
title: Triage runs as a resident gateway bot on pi5, not a scheduled poll
version: 1
---

## Context

REQ-003 asks for automatic intake and status-marking of member feedback. Two hosts were
offered on 2026-10-14: a scheduled `discord-hub triage` poll (GitHub Action or cron, no
always-on process, latency = interval) or a resident gateway bot.

## Decision

Andrew chose "Resident bot on pi5" (own words, AskUserQuestion 2026-10-14). The bot is
a discord.js gateway client (`src/bot/index.ts`) behind the pure `decide` policy; it
runs under systemd from `deploy/discord-hub-bot.service`, deployed by
`scripts/deploy-pi.sh` which Andrew runs himself (pi runbook: no unprompted pushes).

## Considered options

(a) scheduled poll — simplest ops, 15-min latency, recommended; (b) resident bot —
instant reaction, needs hosting and restarts — chosen; (c) GitHub-webhook-driven —
rejected, pi5 is LAN-only and has no inbound path.

## Consequences

pi5 is WiFi-attached and sometimes powered off; triage pauses while it is. The wired
Pi 4 is the always-on alternative (same unit, different target). Classification goes
through `claude-opus-5-5` at low effort with server-side fallbacks; the `Classifier`
seam keeps the model swappable. Human tag changes are recorded, never reverted.
