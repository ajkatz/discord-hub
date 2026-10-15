---
id: DOC-borders
type: evergreen
status: active
owner: eng
title: Blueprint — walls and cavities of discord-hub
version: 3
---

## Walls (module borders)

| Module | Owns (write-set) | Interface (the doorway) |
|---|---|---|
| model | src/model.ts | `loadHub(path) -> Hub`, `saveHub(path, Hub)`, `desiredFor(project) -> DesiredProject` — the declarative truth; no I/O beyond hub.json |
| plan | src/plan.ts | `plan(hub, snapshot) -> Op[]` — pure diff of desired vs observed guild; never touches the network |
| discord | src/discord.ts, src/fake.ts | `DiscordApi` interface (`snapshot()`, `createRole`, `createChannel`, `modifyChannel`, `createWebhook`, `getOnboarding`, `putOnboarding`); `RestDiscordApi` (live) and `FakeDiscordApi` (in-memory, records mutations) |
| apply | src/apply.ts | `apply(ops, api, log) -> ApplyResult` — executes ops in order, stops on first failure with the completed list |
| onboarding | src/onboarding.ts | `mergeOnboarding(current, desiredOptions) -> PutBody or null` — pure merge preserving existing ids |
| triage | src/bot/types.ts, src/bot/triage.ts, src/bot/ledger.ts | `Classifier` interface (`classify(input) -> Classification`); `decide(input, classification, open) -> Decision` (pure: tags, reply, thread-to-create, ledger record); `Ledger` (JSONL append/read/open-records) |
| classifier | src/bot/classifier.ts | `ClaudeClassifier` — the only module that imports `@anthropic-ai/sdk` |
| bot | src/bot/index.ts, src/bot/channels.ts | discord.js gateway shell: maps channel ids to (project, kind) from hub.json + snapshot, wires events to `decide`, executes the Decision; `channels.ts` is the pure map builder |
| announcer | announcer/announce.mjs, .github/workflows/announce.yml, templates/discord-announce.yml | reusable `workflow_call` workflow; callers pass DISCORD_WEBHOOK_URL + ANTHROPIC_API_KEY secrets |
| deploy | deploy/discord-hub-bot.service, scripts/deploy-pi.sh | systemd unit + rsync/ssh deploy script (DRY_RUN=1 prints) |
| cli | src/cli.ts, bin/discord-hub.mjs | `init | new | plan | apply | archive`; env DISCORD_BOT_TOKEN; `--snapshot`, `--dry-run` |

## Cavities (pre-routed channels)

- **GitHub mirror**: forum thread -> GitHub issue. Hangs off the `#bug-reports` channel
  id the model already records; a resident bot would be a new module behind `discord`.
- **Multi-guild**: `Hub.guildId` is a single field today; the planner is guild-agnostic.
- **Universal defaults**: a11y, i18n, EU-compliance, security/privacy (ADR-0012 inherited).
  Token lives in env only; webhook URLs printed once, never persisted.
