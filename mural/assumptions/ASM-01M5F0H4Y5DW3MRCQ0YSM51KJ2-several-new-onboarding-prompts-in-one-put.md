---
id: ASM-01M5F0H4Y5DW3MRCQ0YSM51KJ2
type: asm
status: unvalidated
owner: pm
title: One onboarding PUT can create several new prompts with distinct placeholder ids and drop another
version: 1
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
