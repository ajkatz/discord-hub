---
id: ISS-01M4YS4JT1NBYWK02Q0X4XHT4G
type: issue
status: draft
owner: eng
title: pi deploy — systemd unit, rsync deploy script (DRY_RUN), runbook section
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@3]
derives_from: []
depends: [ISS-01M4YS4JPD4GTYTH3BC87FY61Q]
paths: [deploy/discord-hub-bot.service, scripts/deploy-pi.sh, tests/deploy.test.ts, tests/accept-deploy.sh]
acceptance: [bash tests/accept-deploy.sh]
cw_tokens: 4000
cw_files: 4
phase: breadth
model: mid
max_turns: 25
---
## Contract

`deploy/discord-hub-bot.service` (NEW): `[Service]` User=andrew,
WorkingDirectory=/home/andrew/discord-hub, EnvironmentFile=/home/andrew/discord-hub.env
(DISCORD_BOT_TOKEN, ANTHROPIC_API_KEY, HUB_PATH), ExecStart=/usr/bin/node
dist/bot/index.js, Restart=always, RestartSec=5; `[Install]` WantedBy=multi-user.target.
`scripts/deploy-pi.sh <user@host>` (NEW): builds locally (`npm run build`), rsyncs
dist/, package.json, package-lock.json, hub.json, deploy/ to `~/discord-hub` on the
target (excludes node_modules, .env, .git), then over ssh runs `npm ci --omit=dev` and
prints the three sudo commands to install/enable/restart the unit (does not run sudo).
`DRY_RUN=1` prints every command and executes none. Target defaults to
`andrew@pi5.localdomain` (LAN-direct per the pi runbook; the wired Pi 4 is the
always-on alternative). Tests: unit has Restart=always, EnvironmentFile, ExecStart;
`DRY_RUN=1 scripts/deploy-pi.sh` exits 0, prints rsync + ssh lines, touches nothing.
