<!-- GENERATED packet for ISS-01M5F0H5G5JP4RGQED9TAKEKSH — the worker's entire briefing -->
<!-- source-hash: d1cf1e252c7fd534 -->
# Packet: new --game, the runbook and the manual for the game layer

## Contract of record (from frontmatter — the enforced envelope)

- write-set manifest (only paths you may touch): src/cli.ts (EXISTS — modify only if the contract says so), tests/cli.test.ts (EXISTS — modify only if the contract says so), docs/runbook.md (EXISTS — modify only if the contract says so), mural/manual/index.md (EXISTS — modify only if the contract says so), README.md (EXISTS — modify only if the contract says so)
- acceptance commands (must exit 0 for done): ['bash tests/accept-cli.sh']
- upstream pins: ['PRD-01M4YRFMPVGJJ0XENSA97NBGBW@5']  |  depends: ['ISS-01M5F0H5A8A4P1HP887ZBTM53C']
- budget: model=mid max_turns=25 cw_tokens=4000 cw_files=5 phase=breadth
- report exactly one status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED — proof lives in receipts, not your report.
- if any decision is not answerable from this packet: write blocked.md with the question + a proposed default, and stop.

## Task
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

## Context: ADR-0004 — A game layer above the projects - a game question first, then one plugin question per game [active]
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
  one plugin question per game in `games` order. A project's option grants the project's
  role AND its game's role, and opts the member into the project's channels AND the game's
  chat - picking an addon puts you in its game's area too.
- The single question named by `onboardingPrompt` is dropped from onboarding once games
  exist; a hub without `games` keeps exactly the old single question.

## Considered options

- A. Two plugin questions (one per game), no game layer: smallest change, but nothing
  "one level higher" - no place for a game as a whole.
- B. Game question + game areas + per-game plugin questions: chosen.
- C. The one question, ordered or prefixed by game: trivial, still one long list.

## Consequences

- Members who joined before the change keep their project roles but do not get a game role
  until they pick their game (or re-pick an addon) in Channels & Roles: onboarding grants
  roles on selection only. A backfill would need the privileged members intent.
- The planner manages several prompts: existing ones are rebuilt in place (ids kept),
  the legacy one dropped, new ones appended in order; prompts the hub does not manage are
  echoed untouched.
- New game categories land at the bottom of the channel list (the planner does not manage
  positions); placing them above their projects is a drag in Discord.
- Several new prompts go out in one PUT with distinct placeholder ids
  (ASM-01M5F0H4Y5DW3MRCQ0YSM51KJ2, validated at the first live apply).

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

> REQ-004 (verbatim, Andrew, 2026-10-21): "discord has some other issues: * users are
> going into the old welcome channel under archive instead of the new one *
> announcements for forever addons aren't announcing with the icon as the avatar *
> except for LFG radar and alt mailer, all of the channels & roles have the wrong icons
> for forever addons" · "and we need to rename forever weapon buffs to forever combat
> buffs in discord" · "maybe welcome can route one level higher from OSRS / WoW Forever
> into the subcategories from there". Routed: the avatar = ISS-01M5EZHEM8H09W2WFTB1SB48R3
> (done); the icons (emojiId per Forever project), the rename (category + role renamed in
> place, slug/name/repo in hub.json) and the system messages channel (from #old-general to
> #welcome) = operations run by Andrew (Development/Claude/fix-discord.ps1); the routing =
> OQ-1.

> REQ-005 (verbatim, Andrew, 2026-10-21, answering OQ-1 between A two plugin questions,
> B a game question that opens a game-wide area then the plugin questions, C one question
> grouped by game): "B but lets call it #wow-forever-chat". OQ-1 resolved; ADR-0004.

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
- Replying to every post. The tags are the bot's answer; it speaks only to link a
  duplicate or to point at a thread it opened on a member's behalf (v4 — the v3
  per-post acknowledgment was removed after the first live evening).
- A separate `#bug-reports` forum. One `#feedback` forum per project holds bugs, ideas,
  questions and praise, told apart by kind tags (v4 — two forums split one small
  audience and sent members to the wrong one).
- Slash commands. The bot listens to events only; owner actions stay in the Discord UI
  (changing a tag is the owner's verdict, REQ-003).
- Mirroring threads into GitHub issues (cavity in borders.md; not in this PRD).
- Moderation tooling, roles beyond one per project, voice channels.
- Multi-guild: one hub config describes one guild.
- Enabling the Community feature or accepting Discord's community guidelines — a human
  does that once in the Discord UI (runbook); the API cannot.

## Requirements

- WHEN Andrew runs `discord-hub new <slug> --name <Name> [--emoji E | --icon icon.png]
  [--repo owner/repo]`, THE SYSTEM SHALL add the project to `hub.json` and create in the
  guild: one mentionable role named `<slug>`, one private category named `<Name>`
  visible only to that role, and under it `#announcements` (text, role cannot post,
  topic "Release notes and development updates"), `#general` (text) and `#feedback`
  (forum; kind tags `bug`/`idea`/`question`/`praise` then status tags `acknowledged`/
  `known`/`in-progress`/`fixed`/`not-an-issue`/`needs-info`/`planned`/`declined`; the
  post guidelines are the forum topic). (REQ-003 "mark their status as acknowledged,
  known, not an issue, etc") (REQ-001 "spawn new sub-communities", "feedback and
  report bugs per project", REQ-002)
- WHEN the CLI creates a category or a channel under it, THE SYSTEM SHALL add a member
  overwrite for the bot user itself (view, send, threads, history, webhooks, manage
  threads), because a category that hides `@everyone` hides the bot too and Discord
  then refuses every create or edit inside it (403 50013 on the first live apply).
- WHEN a project is created, THE SYSTEM SHALL create a webhook in that project's
  `#announcements`, print its URL once to the terminal with the instruction to store it
  as the repo's `DISCORD_WEBHOOK_URL` secret, and never write the URL to disk.
  (REQ-001; reuses the existing Loadout Lab push announcer)
- WHEN a project is created, THE SYSTEM SHALL add an option to the guild's onboarding
  prompt titled "Which plugins do you use?" (creating the prompt if absent) whose
  selection grants the project role and opts the member into the project's channels,
  so members activate the sub-community themselves. The option SHALL carry the
  project's emoji: `emojiId` (a custom server emoji, e.g. the plugin icon) when set,
  otherwise the unicode `emoji`. (REQ-001 "activited by server or whatever")
- WHEN `new` is given `--icon <file>` (png, jpg or gif), THE SYSTEM SHALL upload the
  image as a server emoji named after the slug (reusing an existing emoji of that
  name), store its id as the project's `emojiId` in `hub.json` before planning, and use
  it on the pick-list; under `--dry-run` or `--snapshot` it SHALL say what it would
  upload and upload nothing.
- WHEN the onboarding prompt is written, THE SYSTEM SHALL include the seven shared
  top-level channels as `default_channel_ids` in the same request whenever all seven
  exist, because Discord refuses onboarding edits below that minimum (seven default
  channels, five of them writable); with fewer it SHALL send the prompts alone.
- WHEN `discord-hub apply` runs against a guild that already matches `hub.json`,
  THE SYSTEM SHALL perform zero mutating API calls; WHEN it partially matches, it SHALL
  create only what is missing and reconcile what drifted on existing channels: set the
  guidelines or topic when they differ (`set-topic`) and add missing forum tags without
  recreating the existing ones (`set-tags`, existing tag ids preserved). Every command
  is idempotent. (REQ-001 "really easy")
- WHEN `plan`, `apply`, `new` or `init` is given `--no-onboarding`, THE SYSTEM SHALL
  leave the onboarding prompt untouched, so projects can be built behind the wall and
  revealed later.
- WHEN `discord-hub plan` runs, THE SYSTEM SHALL print the operations `apply` would
  perform without performing any. WHEN `--snapshot <file>` is given, both `plan` and
  `apply --dry-run` SHALL read guild state from that JSON file instead of the API.
- WHEN `discord-hub init` runs, THE SYSTEM SHALL ensure the shared top-level channels
  exist (`#welcome`, `#rules`, `#all-announcements`, `#lounge`, `#introductions`,
  `#help`, `#off-topic` — the seven default channels Discord requires before onboarding
  can be enabled or edited, at least five of them @everyone-writable) and ensure the
  onboarding prompt exists.
- WHEN `discord-hub archive <slug>` runs, THE SYSTEM SHALL remove the project's
  onboarding option and rename its category with an `[archived]` prefix, deleting
  nothing.

### Games (REQ-004 "route one level higher from OSRS / WoW Forever into the subcategories", REQ-005, ADR-0004)

- WHEN `hub.json` lists `games` (each a `slug`, a `name`, a `chat` channel name, the
  `prompt` title of its plugin question, an optional `emoji` or `emojiId`) with a
  `gamePrompt`, THE SYSTEM SHALL give every game a mentionable role named `<slug>`, a
  private category named `<name>` visible only to that role (with the bot's member
  overwrite), and in it a text channel named `<chat>` where the role posts
  (`#osrs-chat`, `#wow-forever-chat`).
- WHEN games exist, THE SYSTEM SHALL require every live project to name one of them in
  `game` and SHALL refuse a `hub.json` whose project names an unknown game; WHEN no
  games exist, a project SHALL NOT name one.
- WHEN games exist, THE SYSTEM SHALL keep the onboarding as: first the `gamePrompt`
  question, one option per game that grants the game's role, opts the member into the
  game's chat and carries its emoji; then one question per game, in `games` order,
  titled with its `prompt`, one option per live project of that game that grants the
  project's role and the game's role and opts the member into the project's channels and
  the game's chat. The question titled `onboardingPrompt` SHALL be dropped unless it is
  one of these. Existing questions and options keep their ids, new ones go after them
  in order, and questions the hub does not manage are left as they are.
- WHEN `hub.json` lists no games, THE SYSTEM SHALL keep the single question titled
  `onboardingPrompt` with one option per live project, exactly as before.
- WHEN `new <slug>` runs and `hub.json` has games, THE SYSTEM SHALL require
  `--game <game slug>` naming one of them; without games it SHALL refuse `--game`.
- WHEN the bot token is needed, THE SYSTEM SHALL read it from `DISCORD_BOT_TOKEN`
  only; it SHALL never be stored in `hub.json` or any file in the repo.
- WHEN a Discord API call fails, THE SYSTEM SHALL print the endpoint, HTTP status and
  Discord's error message, and exit non-zero with the operations completed so far
  listed; a re-run SHALL resume from the current guild state.

### Triage (REQ-003, resident bot on pi5 — Andrew's choice 2026-10-14)

- WHEN a member opens a thread in a project's `#feedback`, THE SYSTEM SHALL classify it
  (kind: bug/feature/question/praise/other; one-line summary; severity; duplicate-of
  among that project's open triage records), apply the kind tag (`bug`, `idea`,
  `question`, `praise`; none for other) plus `acknowledged` — or `bug` plus `known`
  when it duplicates an open record — and append one record with the rationale to the
  triage ledger (`data/triage.jsonl`). It SHALL post no reply, except one sentence
  linking the original thread when it marks a duplicate. It SHALL never delete, edit,
  lock or close a member's post. (REQ-003 "intake and rationalize each piece", "mark
  their status as acknowledged, known, not an issue")
- WHEN a member posts in a project's `#general` and the classifier judges it a bug
  report with high confidence, THE SYSTEM SHALL open a thread in that project's
  `#feedback` quoting the message and its author, tag it `bug` and `acknowledged`,
  reply under the original message with the thread link, and record it.
  Low-confidence or non-bug messages produce no action and no record. (REQ-003
  "automatically detect ... create threads for issues")
- WHEN the owner changes a triage tag by hand, THE SYSTEM SHALL record the new status in
  the ledger and SHALL NOT revert or re-tag that thread. (REQ-003 "does not mean
  automatically act on each piece")
- WHEN the classifier fails (API error or refusal), THE SYSTEM SHALL apply no tag, post
  nothing, log the error with the thread id, and record `unclassified` in the ledger so
  the owner can find it.
- WHEN the bot refreshes its channel map (on start and every 15 minutes), THE SYSTEM
  SHALL reload `hub.json` first, so a project added with `new` on any machine and
  deployed with `scripts/deploy-pi.sh` is triaged without a restart; a `hub.json` that
  fails to load keeps the previous one and logs the error.
- WHEN a push lands on a project's default branch, that project's announcer workflow
  SHALL post the push summary to the project's `#announcements` via its webhook, using
  the reusable workflow in this repo; `new --repo` SHALL print the caller snippet and
  the secret names to set. The reusable workflow and the caller template SHALL parse as
  YAML (an unquoted colon in an input description once broke every caller). (REQ-003
  "report when changes are being published automatically (like in loadout lab)")
- WHEN deployed, THE SYSTEM SHALL run on pi5 as a systemd service (`Restart=always`,
  secrets from an env file outside the repo), with `scripts/deploy-pi.sh` and the
  runbook prepared for Andrew to run himself (pi runbook: no unprompted pushes to his
  machines).

## Acceptance

- Given an empty guild snapshot and a `hub.json` with one project When `plan` runs
  Then it lists exactly: 1 role, 1 category, 3 channels (2 text, 1 forum with the
  twelve tags), 1 webhook, 1 onboarding option, in dependency order; with
  `--no-onboarding` the onboarding option is absent.
- Given a snapshot where the role and category already exist When `plan` runs Then it
  lists only the 3 channels, the webhook and the onboarding option.
- Given a snapshot whose `#feedback` forum has no guidelines or lacks some tags When
  `plan` runs Then it lists `set-topic` / `set-tags` for that forum and nothing once
  they match; When `set-tags` is applied to the fake Then the existing tag ids are kept
  and only the missing names are appended.
- Given a snapshot that fully matches `hub.json` When `apply` runs against the
  in-memory fake Then the fake records zero mutations and exits 0.
- Given the in-memory fake When `new loadout-lab --name "Loadout Lab"` runs twice
  Then the second run records zero mutations and `hub.json` lists the project once.
- Given the fake When `apply` creates a category and its children Then every overwrite
  list contains the bot user as a member overwrite with the bot permission set.
- Given a snapshot with an onboarding prompt that already has an option for another
  project When `apply` runs Then the PUT body contains both options and the existing
  option's id is preserved.
- Given a project with an `emojiId` When the option is written Then the PUT carries
  `emoji_id` and no `emoji_name`; Given a matching guild whose option carries a
  different emoji Then `plan` re-plans onboarding.
- Given a snapshot where all seven shared channels exist When onboarding is written
  Then the PUT carries their ids as `default_channel_ids`; with fewer than seven, only
  the prompts.
- Given `new --icon icon.png --snapshot <file>` When it runs Then the output names the
  emoji it would upload and nothing is uploaded; Given the fake When `createEmoji` is
  called twice with one name Then it returns the same id and records one mutation.
- Given `archive loadout-lab` When applied to the fake Then the onboarding option is
  gone, the category name starts with `[archived]`, and no channel or role was deleted.
- Given no `DISCORD_BOT_TOKEN` When any live command runs Then it exits 2 with a
  one-line message naming the variable.
- Given a thread in `#feedback` whose fake classifier returns bug/new When the bot's
  decision runs Then tags = [bug, acknowledged], there is no reply, and the ledger
  gains one record with status acknowledged.
- Given a thread whose classifier returns bug/duplicate-of an open record When decided
  Then tags = [bug, known] and the one reply links the duplicate.
- Given a thread classified feature, question or praise When decided Then tags =
  [idea | question | praise, acknowledged] with no reply; classified other Then
  [acknowledged].
- Given a `#general` message classified bug with high confidence When decided Then a
  `#feedback` thread is requested with the quoted message, tags [bug, acknowledged]
  and a reply naming the thread; with lower confidence or another kind nothing is
  requested and nothing is recorded.
- Given a classifier error When decided Then no tags, no reply, ledger status
  unclassified.
- Given a thread tag changed by a human When the update is observed Then the ledger
  record's status becomes the new tag and no re-tag is issued.
- Given the reusable announcer workflow When `node --check`, a YAML parse of both
  workflow files and the caller template are validated Then all pass, the workflow's
  inputs are exactly project_name, project_description and hub_ref, and the template
  references this repo's workflow.
- Given `scripts/deploy-pi.sh` When run with DRY_RUN=1 Then it prints the rsync and ssh
  commands for the target and executes nothing.
- Given the real guild (ready --live) When `new` runs for a test project Then the
  structures appear in Discord and a second `apply` is a no-op (validates
  ASM-01M4YRFMTAFAVY3TMZ72H5QP92; validated 2026-10-14 on guild 1524847121562468514,
  after the bot overwrite and onboarding-defaults fixes above).

- Given a hub with two games and three projects and an empty guild When `plan` runs Then
  per game it creates a role, a private category and its chat channel, per project what
  it did before, and one onboarding op whose questions are the game question and then one
  question per game in `games` order.
- Given the fake guild carrying the single "Which plugins do you use?" question When the
  game layer is applied Then the PUT has the game question first and one question per
  game, the single question is gone, every project option carries the project role and
  the game role with the project's channels and the game chat, and a second `plan` is
  empty.
- Given an onboarding with the hub's questions and a question the hub does not manage
  When the merge runs Then the managed ones keep their ids and positions, the unmanaged
  one is echoed unchanged, and a new game's question is appended.
- Given a hub without games Then every earlier plan, merge and apply test passes, the two
  plan assertions on the onboarding op restated in its new shape with the same content.
- Given games and a live project without `game`, or naming an unknown game When
  `hub.json` loads Then it fails naming the project or the game.
- Given games When `new forever-x --name "Forever X"` runs without `--game` Then it
  exits 2 naming the games; with `--game wow-forever` the project is saved with it.

## Build-vs-adopt

See RS-01M4YRFMRKKVE1W27FR16BP0FD. Adopted: Discord Community Onboarding (the
opt-in mechanism, native, including custom-emoji options), `@discordjs/rest` +
`discord-api-types` (auth, rate limits, typed routes), `discord.js` (gateway), the
existing Loadout Lab push announcer (`announcer/announce.mjs`, generalized — it only
needs a webhook URL), `yaml` (dev-only, to parse the workflow files in the test). Not
found off the shelf: anything that reconciles a declared project list against a live
guild idempotently; Server Templates only clone whole servers once. Build: the hub
model, planner, applier, onboarding reconciliation, CLI, runbook, the triage bot
(discord.js gateway client + Claude classification behind a `Classifier` seam), the
reusable announcer workflow, and the pi5 systemd deployment.
