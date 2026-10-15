# discord-hub

One Discord server for all of Andrew's plugins, with a sub-community per project that
members switch on themselves, and a CLI that spawns a new one in one command.

Per project: a mentionable role, a private category visible to that role, `#announcements`
(read-only, fed by the push announcer), `#general`, `#bug-reports` (forum with status tags
`acknowledged known in-progress fixed not-an-issue needs-info`), `#feedback` (forum with
`idea question praise acknowledged planned declined`), an announcer webhook, and an option
in the server's onboarding prompt ("Which plugins do you use?") that grants the role.

A resident bot (pi5) triages every new forum thread: Claude classifies it, the bot applies
the status tag, posts a one-line acknowledgment with the rationale, and appends a record to
`data/triage.jsonl`. Clear bug reports in `#general` get a `#bug-reports` thread opened for
them. Tags you change by hand are recorded, never reverted.

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
node bin/discord-hub.mjs new loadout-lab --name "Loadout Lab" --emoji 🧪 --repo ajkatz/runelite-loadout-lab
node bin/discord-hub.mjs plan                                    # diff only
node bin/discord-hub.mjs apply                                   # reconcile everything in hub.json
node bin/discord-hub.mjs archive loadout-lab                     # drop from onboarding, rename category
node bin/discord-hub.mjs apply --no-onboarding                   # build projects behind the wall; add the prompt later
node bin/discord-hub.mjs plan --snapshot tests/fixtures/empty.json --hub tests/fixtures/hub.json   # offline
```

`hub.json` is the truth; every command diffs it against the live guild and creates only
what is missing, so re-running is safe. Webhook URLs print once and are never written to
disk. Full setup, migration of the old servers, and the pi deployment: [docs/runbook.md](docs/runbook.md).

## Announcer

`.github/workflows/announce.yml` is a reusable workflow (Loadout Lab's push announcer,
generalized). Each project repo copies [templates/discord-announce.yml](templates/discord-announce.yml)
and sets the `DISCORD_WEBHOOK_URL` and `ANTHROPIC_API_KEY` secrets.

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
