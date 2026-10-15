---
id: PRD-01M4YRFMPVGJJ0XENSA97NBGBW
type: prd
status: draft
owner: pm
title: discord-hub — one server, one sub-community per plugin, spawned by CLI
version: 2
open_questions: []
locales: [all]
compliance: [gdpr, eaa]
data: [discord-guild-structure, bot-token-env-only]
---

> REQ-001 (verbatim, Andrew, 2026-10-14): "I have all these plugins for runescape and
> world of warcraft. i am finding that discord is a great place to manage these
> communities. i was initially spawning 1 new discord server per plugin. i have one
> for loadout lab and one for goal planner. what i'd like is more of a server for all
> of my plugins and hvae subcommunities within the discord which can be activited by
> server or whatever. I'd like it to be really easy to spawn new sub-communities when
> i create new projects and have the ability to have users provide feedback and
> report bugs per project"

> REQ-002 (refinement answers, Andrew, 2026-10-14): deliverable = "Provisioning CLI"
> (TypeScript CLI + bot token; `new <project>` spawns role, category, channels, forum
> tags, webhook, and onboarding entry; runbook for the one-time server setup) ·
> home = "New Mural project" at ~/Development/discord-hub

> REQ-003 (verbatim, Andrew, 2026-10-14, mid-flight): "i also want the ability for each
> community to: * automatically detect and manage new issues based on user feedback -
> does not mean automatically act on each piece of feedback but at least intake and
> rationalize each piece * report when changes are being published automatically (like
> in loadout lab) * the ability to create threads  for issues and automatically mark
> their status as acknowledged, known, not an issue, etc"

## Problem

Each plugin currently gets its own Discord server (Loadout Lab, Goal Planner). That
splits one audience into silos, duplicates moderation and announcements, and makes the
next project's community a chore to set up. Andrew wants one server where each project
is a sub-community a member can switch on, where bugs and feedback are collected per
project, and where creating that sub-community for a new project is trivial.

## Non-goals

- Merging the two existing servers (Discord cannot merge servers; migration is a
  pinned invite plus re-pointing the Loadout Lab push-announcer webhook — runbook).
- Acting on feedback automatically (REQ-003: intake and rationalize only; fixes stay
  human).
- Slash commands and a gateway-connected bot (triage runs on a schedule, see REQ-003
  requirements).
- Moderation tooling, roles beyond one per project, voice channels.
- Multi-guild: one hub config describes one guild.
- Enabling the Community feature or accepting Discord's community guidelines — a human
  does that once in the Discord UI (runbook); the API cannot.

## Requirements

- WHEN Andrew runs `discord-hub new <slug> --name <Name> [--emoji E] [--repo owner/repo]`,
  THE SYSTEM SHALL add the project to `hub.json` and create in the guild: one
  mentionable role named `<slug>`, one private category named `<Name>` visible only to
  that role, and under it `#announcements` (text, role cannot post), `#general` (text),
  `#bug-reports` (forum, status tags acknowledged/known/in-progress/fixed/not-an-issue/
  needs-info) and `#feedback` (forum, tags idea/question/praise/acknowledged/planned/
  declined). (REQ-003 "mark their status as acknowledged, known, not an issue, etc") (REQ-001 "spawn new sub-communities", "feedback
  and report bugs per project", REQ-002)
- WHEN a project is created, THE SYSTEM SHALL create a webhook in that project's
  `#announcements`, print its URL once to the terminal with the instruction to store it
  as the repo's `DISCORD_WEBHOOK_URL` secret, and never write the URL to disk.
  (REQ-001; reuses the existing Loadout Lab push announcer)
- WHEN a project is created, THE SYSTEM SHALL add an option to the guild's onboarding
  prompt titled "Which plugins do you use?" (creating the prompt if absent) whose
  selection grants the project role and opts the member into the project's channels,
  so members activate the sub-community themselves. (REQ-001 "activited by server or
  whatever")
- WHEN `discord-hub apply` runs against a guild that already matches `hub.json`,
  THE SYSTEM SHALL perform zero mutating API calls; WHEN it partially matches, it SHALL
  create only what is missing. Every command is idempotent. (REQ-001 "really easy")
- WHEN `discord-hub plan` runs, THE SYSTEM SHALL print the operations `apply` would
  perform without performing any. WHEN `--snapshot <file>` is given, both `plan` and
  `apply --dry-run` SHALL read guild state from that JSON file instead of the API.
- WHEN `discord-hub init` runs, THE SYSTEM SHALL ensure the shared top-level channels
  exist (`#welcome`, `#rules`, `#all-announcements`, `#lounge`, `#introductions`,
  `#help`, `#off-topic` — the seven default channels onboarding requires, at least
  five of them @everyone-writable) and ensure the onboarding prompt exists.
- WHEN `discord-hub archive <slug>` runs, THE SYSTEM SHALL remove the project's
  onboarding option and rename its category with an `[archived]` prefix, deleting
  nothing.
- WHEN the bot token is needed, THE SYSTEM SHALL read it from `DISCORD_BOT_TOKEN`
  only; it SHALL never be stored in `hub.json` or any file in the repo.
- WHEN a Discord API call fails, THE SYSTEM SHALL print the endpoint, HTTP status and
  Discord's error message, and exit non-zero with the operations completed so far
  listed; a re-run SHALL resume from the current guild state.

## Acceptance

- Given an empty guild snapshot and a `hub.json` with one project When `plan` runs
  Then it lists exactly: 1 role, 1 category, 4 channels (2 text, 2 forum with the
  specified tags), 1 webhook, 1 onboarding option, in dependency order.
- Given a snapshot where the role and category already exist When `plan` runs Then it
  lists only the 4 channels, the webhook and the onboarding option.
- Given a snapshot that fully matches `hub.json` When `apply` runs against the
  in-memory fake Then the fake records zero mutations and exits 0.
- Given the in-memory fake When `new loadout-lab --name "Loadout Lab"` runs twice
  Then the second run records zero mutations and `hub.json` lists the project once.
- Given a snapshot with an onboarding prompt that already has an option for another
  project When `apply` runs Then the PUT body contains both options and the existing
  option's id is preserved.
- Given `archive loadout-lab` When applied to the fake Then the onboarding option is
  gone, the category name starts with `[archived]`, and no channel or role was deleted.
- Given no `DISCORD_BOT_TOKEN` When any live command runs Then it exits 2 with a
  one-line message naming the variable.
- Given the real guild (ready --live) When `new` runs for a test project Then the
  structures appear in Discord and a second `apply` is a no-op (validates
  ASM-01M4YRFMTAFAVY3TMZ72H5QP92).

## Build-vs-adopt

See RS-01M4YRFMRKKVE1W27FR16BP0FD. Adopted: Discord Community Onboarding (the
opt-in mechanism, native), `@discordjs/rest` + `discord-api-types` (auth, rate limits,
typed routes), the existing Loadout Lab push announcer (`.github/scripts/announce.mjs`,
unchanged — it only needs a webhook URL). Not found off the shelf: anything that
reconciles a declared project list against a live guild idempotently; Server Templates
only clone whole servers once. Build: the hub model, planner, applier, onboarding
reconciliation, CLI, runbook.
