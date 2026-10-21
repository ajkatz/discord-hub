---
id: ADR-0004
type: adr
status: active
owner: user
title: A game layer above the projects - a game question first, then one plugin question per game
version: 1
---

## Context

Andrew, 2026-10-21 (REQ-004): "maybe welcome can route one level higher from OSRS / WoW
Forever into the subcategories from there". The hub serves two families: RuneLite plugins
for Old School RuneScape and WoW: Forever addons. Until now one onboarding question ("Which
plugins do you use?") listed every project of both games, and nothing in the server
belonged to a game as a whole. Discord's Community Onboarding has no branching: a question
cannot be shown or hidden by the answer to another (medium confidence, Discord's docs and
editor show no condition field).

## Decision

Andrew chose B (REQ-005, 2026-10-21: "B but lets call it #wow-forever-chat"):

- `hub.json` gains `games`: each with a slug (its role), a name (its option and its
  category), a chat channel (`#osrs-chat`, `#wow-forever-chat`) and the title of its own
  plugin question; `gamePrompt` titles the game question ("What do you play?"); every live
  project names its `game`.
- Per game the guild gets a role, a private category visible to that role, and the chat
  channel in it (everyone with the role posts).
- Onboarding: the game question first (picking a game grants its role and its chat), then
  one plugin question per game in `games` order, each project's option granting its own
  role and channels. (Amended after review, same day: project options had also granted the
  game's role and chat; that was dropped - several options sharing one role means
  unpicking one addon could strip the game chat if Discord removes an option's roles
  without looking at the member's other picks. The game question is the one way in.)
- The single question named by `onboardingPrompt` is dropped from onboarding once games
  exist; a hub without `games` keeps exactly the old single question.
- The hub's questions are written as one block in `hub.json` order; a question whose title
  changes leaves through `retiredPrompts` - the hub never deletes a question it does not
  know by title.

## Considered options

- A. Two plugin questions (one per game), no game layer: smallest change, but nothing
  "one level higher" - no place for a game as a whole.
- B. Game question + game areas + per-game plugin questions: chosen.
- C. The one question, ordered or prefixed by game: trivial, still one long list.

## Consequences

- Members who joined before the change keep their project roles but do not get a game role
  until they pick their game in Channels & Roles: onboarding grants roles on selection
  only. A backfill would need the privileged members intent.
- The planner manages several prompts: its own are written as one block in order where
  the first of them stands (ids kept), the legacy one and retired titles dropped; prompts
  the hub does not manage are echoed untouched.
- New game categories land at the bottom of the channel list (the planner does not manage
  positions); placing them above their projects is a drag in Discord.
- Several new prompts go out in one PUT with distinct placeholder ids
  (ASM-01M5F0H4Y5DW3MRCQ0YSM51KJ2, validated at the first live apply).
