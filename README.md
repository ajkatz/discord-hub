# discord-hub

One Discord server for all of Andrew's plugins, with a sub-community per project that
members switch on themselves, and a CLI that spawns a new one in one command.

Per project: a mentionable role, a private category visible to that role, `#announcements`
(read-only, fed by the push announcer), `#general`, `#feedback` (one forum for bugs, ideas,
questions and thanks: kind tags `bug idea question praise` plus status tags `acknowledged
known in-progress fixed not-an-issue needs-info planned declined`), an announcer webhook,
and an option in the server's onboarding prompt ("Which plugins do you use?") that grants
the role. Projects can be grouped by game: onboarding then asks "What do you play?" first,
each game gets a role, a private category and a chat (`#osrs-chat`, `#wow-forever-chat`),
and one plugin question follows per game (runbook section 3a).

A resident bot (pi5) triages every new forum thread: Claude classifies it, the bot applies
the tags (kind + `acknowledged`, or `known` with a link when it duplicates an open thread)
and appends a record with the rationale to `data/triage.jsonl`. It stays silent otherwise.
Clear bug reports in `#general` get a `#feedback` thread opened for them. Tags you change
by hand are recorded, never reverted.

A Mural-managed project (`mural/` is the artifact tree; gates are exit codes).

## Install

```bash
npm install
npm run build
cp hub.example.json hub.json   # set guildId
export DISCORD_BOT_TOKEN=...    # never stored; see docs/runbook.md for the bot setup
```

## Use

```bash
node bin/discord-hub.mjs init                                    # shared channels + onboarding prompt
node bin/discord-hub.mjs new loadout-lab --name "Loadout Lab" --icon icon.png --repo ajkatz/runelite-loadout-lab
node bin/discord-hub.mjs plan                                    # diff only
node bin/discord-hub.mjs apply                                   # reconcile everything in hub.json
node bin/discord-hub.mjs new forever-x --name "Forever X" --game wow-forever   # with games in hub.json
node bin/discord-hub.mjs archive loadout-lab                     # drop from onboarding, rename category
node bin/discord-hub.mjs apply --no-onboarding                   # build projects behind the wall; add the prompt later
node bin/discord-hub.mjs plan --snapshot tests/fixtures/empty.json --hub tests/fixtures/hub.json   # offline
```

`hub.json` is the truth; every command diffs it against the live guild and creates only
what is missing, so re-running is safe. A project's `emoji` (unicode) or `emojiId` (a
server emoji id, e.g. the plugin icon uploaded as an emoji) is what members see in the
onboarding pick-list. Webhook URLs print once and are never written to
disk. Full setup, migration of the old servers, and the pi deployment: [docs/runbook.md](docs/runbook.md).
Adding projects from another machine: [docs/handoff-wow.md](docs/handoff-wow.md).

## Announcer

`.github/workflows/announce.yml` is a reusable workflow (Loadout Lab's push announcer,
generalized). Each project repo copies [templates/discord-announce.yml](templates/discord-announce.yml)
and sets the `DISCORD_WEBHOOK_URL` and `ANTHROPIC_API_KEY` secrets. A missed push is
replayed from the Actions tab with a from/to range (runbook §3).

## Contracts

- `plan` never mutates; `apply` on a matching guild makes zero API calls.
- Private category: `@everyone` denied View, project role allowed; children synced.
- Onboarding merge preserves existing prompt/option ids and other prompts verbatim.
- Triage never deletes, edits, locks or closes a member's post; a classifier failure
  applies no tag and records `unclassified`.
- Exit codes: 0 ok, 1 failure (with the completed ops listed), 2 usage / missing token.

## Develop

```bash
npm test                        # vitest: planner, applier (real code vs in-memory fake), onboarding, triage, cli
npm run typecheck
scripts/mural check             # tree gate
tests/smoke.sh                  # standing gate
git config core.hooksPath scripts/githooks   # once per clone
```

`src/bot/index.ts` (the discord.js gateway shell) and `src/bot/classifier.ts` (the Claude
call) are the only untested modules; everything they do is in `decide`, `Ledger` and
`buildChannelMap`, which are.
