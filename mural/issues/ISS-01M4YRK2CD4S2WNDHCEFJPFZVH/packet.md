<!-- GENERATED packet for ISS-01M4YRK2CD4S2WNDHCEFJPFZVH — the worker's entire briefing -->
<!-- source-hash: 222da1cac283eda9 -->
# Packet: cli + runbook + readme — init, new, plan, apply, archive

## Contract of record (from frontmatter — the enforced envelope)

- write-set manifest (only paths you may touch): src/cli.ts (NEW — a deliverable), bin/discord-hub.mjs (NEW — a deliverable), docs/runbook.md (NEW — a deliverable), README.md (NEW — a deliverable), hub.example.json (NEW — a deliverable), tests/cli.test.ts (EXISTS — modify only if the contract says so), tests/fixtures (EXISTS — modify only if the contract says so), tests/accept-cli.sh (EXISTS — modify only if the contract says so), mural/manual/index.md (EXISTS — modify only if the contract says so), .gitignore (EXISTS — modify only if the contract says so)
- acceptance commands (must exit 0 for done): ['bash tests/accept-cli.sh']
- upstream pins: ['PRD-01M4YRFMPVGJJ0XENSA97NBGBW@3']  |  depends: ['ISS-01M4YRK271FFV7JQGVRH31XMB5', 'ISS-01M4YRK28WWY8PXJ54M3MNX4M0', 'ISS-01M4YRK2AMTS9NS8QGGV8PZRCV']
- budget: model=mid max_turns=25 cw_tokens=9000 cw_files=10 phase=breadth
- report exactly one status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED — proof lives in receipts, not your report.
- if any decision is not answerable from this packet: write blocked.md with the question + a proposed default, and stop.

## Task
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

## Context: PRD-01M4YRFMPVGJJ0XENSA97NBGBW — discord-hub — one server, one sub-community per plugin, spawned by CLI [draft]
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
- Slash commands. The bot listens to events only; owner actions stay in the Discord UI
  (changing a tag is the owner's verdict, REQ-003).
- Mirroring threads into GitHub issues (cavity in borders.md; not in this PRD).
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

### Triage (REQ-003, resident bot on pi5 — Andrew's choice 2026-10-14)

- WHEN a member opens a thread in a project's `#bug-reports` or `#feedback`, THE SYSTEM
  SHALL classify it (kind: bug/feature/question/praise/other; one-line summary;
  severity; duplicate-of among that project's open triage records), apply the status
  tag — `acknowledged` for a new report, `known` when it duplicates an open one,
  `not-an-issue` when it is not a defect (bug-reports only) — plus the kind tag on
  `#feedback`, reply in the thread with a short acknowledgment that states the
  rationale, and append one record to the triage ledger (`data/triage.jsonl`). It SHALL
  never delete, edit, lock or close a member's post. (REQ-003 "intake and rationalize
  each piece", "mark their status as acknowledged, known, not an issue")
- WHEN a member posts in a project's `#general` and the classifier judges it a bug
  report with high confidence, THE SYSTEM SHALL open a thread in that project's
  `#bug-reports` quoting the message and its author, tag it `acknowledged`, reply under
  the original message with the thread link, and record it. Low-confidence or non-bug
  messages produce no action. (REQ-003 "automatically detect ... create threads for
  issues")
- WHEN the owner changes a triage tag by hand, THE SYSTEM SHALL record the new status in
  the ledger and SHALL NOT revert or re-tag that thread. (REQ-003 "does not mean
  automatically act on each piece")
- WHEN the classifier fails (API error or refusal), THE SYSTEM SHALL apply no tag, post
  nothing, log the error with the thread id, and record `unclassified` in the ledger so
  the owner can find it.
- WHEN a push lands on a project's default branch, that project's announcer workflow
  SHALL post the push summary to the project's `#announcements` via its webhook, using
  the reusable workflow in this repo; `new --repo` SHALL print the caller snippet and
  the secret names to set. (REQ-003 "report when changes are being published
  automatically (like in loadout lab)")
- WHEN deployed, THE SYSTEM SHALL run on pi5 as a systemd service (`Restart=always`,
  secrets from an env file outside the repo), with `scripts/deploy-pi.sh` and the
  runbook prepared for Andrew to run himself (pi runbook: no unprompted pushes to his
  machines).

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
- Given a thread in `#bug-reports` whose fake classifier returns bug/new When the bot's
  decision runs Then tags = [acknowledged], the reply names the summary, and the ledger
  gains one record with status acknowledged.
- Given a thread whose classifier returns bug/duplicate-of an open record When decided
  Then tags = [known] and the reply links the duplicate.
- Given a thread classified question in `#bug-reports` When decided Then tags =
  [not-an-issue]; the same classification in `#feedback` yields [question,
  acknowledged].
- Given a `#general` message classified bug with high confidence When decided Then a
  bug thread is requested with the quoted message and tag acknowledged; with low
  confidence nothing is requested.
- Given a classifier error When decided Then no tags, no reply, ledger status
  unclassified.
- Given a thread tag changed by a human When the update is observed Then the ledger
  record's status becomes the new tag and no re-tag is issued.
- Given the reusable announcer workflow When `node --check` and the caller template
  are validated Then both pass and the template references this repo's workflow.
- Given `scripts/deploy-pi.sh` When run with DRY_RUN=1 Then it prints the rsync and ssh
  commands for the target and executes nothing.
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
reconciliation, CLI, runbook, the triage bot (discord.js gateway client + Claude
classification behind a `Classifier` seam), the reusable announcer workflow (Loadout
Lab's announce.mjs generalized), and the pi5 systemd deployment.
