---
id: ISS-01M50HBVRFPJCRQBC5XV8KR7QR
type: issue
status: draft
owner: eng
title: docs — handoff note for provisioning from another machine
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@4]
derives_from: []
depends: [ISS-01M4YRK2CD4S2WNDHCEFJPFZVH]
paths: [docs/handoff-wow.md, README.md]
acceptance: [test -s docs/handoff-wow.md, grep -q docs/handoff-wow.md README.md]
cw_tokens: 2500
cw_files: 2
phase: finish
model: mid
max_turns: 25
method: retroactive
shipped_sha: [77aecb35cae73873143977f2581377bc3ccf6653]
shipped_time: 2026-10-15T05:28:58Z
---

## Contract

Shipped 2026-10-14 (commit 77aecb3). The WoW addon icons live on another machine, so
the provisioning steps had to be runnable there.

`docs/handoff-wow.md` (NEW): the guild name and id; one-time setup on the other machine
(clone, install, build, `.env` with the bot token and how to get or copy it, including
that resetting the token invalidates the pi's copy); the per-addon command (`plan`
first, then `new <slug> --name --icon --repo`); what `new` creates; the three
follow-ups (webhook secret + announcer template, commit `hub.json` so every machine
agrees, `scripts/deploy-pi.sh` so the bot's copy picks the project up within 15
minutes); slug and icon rules (lowercase/digits/dashes; emoji name is the slug without
dashes; PNG/JPG/GIF under 256 KB; convert .tga/.blp first); the checks (`plan` must be
"nothing to do"; Channels & Roles lists the addon with its icon).

`README.md`: links the note from the Use section.

Acceptance is existence plus the README link: there is no behaviour to test.
