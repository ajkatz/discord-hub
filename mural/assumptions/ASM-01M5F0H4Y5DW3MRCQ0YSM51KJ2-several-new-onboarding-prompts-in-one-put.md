---
id: ASM-01M5F0H4Y5DW3MRCQ0YSM51KJ2
type: asm
status: validated
owner: pm
title: One onboarding PUT can create several new prompts with distinct placeholder ids and drop another
version: 2
---

## Assumption

`PUT /guilds/{id}/onboarding` accepts, in one request, several NEW prompts each carrying a
distinct client-chosen placeholder id, alongside the omission of a prompt that exists
(which deletes it), and assigns real ids to the new ones in the order sent.
ASM-01M4YRFMTAFAVY3TMZ72H5QP92 validated a single new prompt with a Date.now()
placeholder; the Discord client itself creates several questions in one save, which is
why the confidence is medium-high. Cost if wrong: the game rollout's apply fails with a 400
before anything in onboarding changes; nothing else is affected.

## Validation plan

The first live `apply` with `games` (ADR-0004): the PUT must return 2xx, the read-back must
show the game question first, then one plugin question per game, and no "Which plugins do
you use?"; a second `plan` must be a no-op. If Discord rejects it: write the new prompts one
PUT at a time (each request echoing the ones already created), record the result here.

## Result (2026-10-21, live guild 1524847121562468514)

VALIDATED. Andrew ran `Development/Claude/route-by-game.ps1` (build, the OSRS emoji upload, plan, apply, plan). One
`apply` wrote the game layer: Channels & Roles then read "What do you play?" (Old School RuneScape with the
:osrspartyhat: emoji 1562514652322209822, WoW: Forever with the unicode infinity), "Which RuneLite plugins do you
use?" (Loadout Lab, Goal Planner, Trappy Chinchompa) and "Which WoW: Forever addons do you use?" (the nine Forever
addons), in that order, and "Which plugins do you use?" was gone - three new questions with placeholder ids and one
dropped, in one PUT (read back in the browser pane). Andrew's Discord client showed the old option icon until it
reloaded: the client caches onboarding.
