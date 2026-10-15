---
id: DOC-borders
type: evergreen
status: active
owner: eng
title: Blueprint — walls and cavities of discord-hub
version: 2
---

## Walls (module borders)

| Module | Owns (write-set) | Interface (the doorway) |
|---|---|---|
| model | src/model.ts | `loadHub(path) -> Hub`, `saveHub(path, Hub)`, `desiredFor(project) -> DesiredProject` — the declarative truth; no I/O beyond hub.json |
| plan | src/plan.ts | `plan(hub, snapshot) -> Op[]` — pure diff of desired vs observed guild; never touches the network |
| discord | src/discord.ts, src/fake.ts | `DiscordApi` interface (`snapshot()`, `createRole`, `createChannel`, `modifyChannel`, `createWebhook`, `getOnboarding`, `putOnboarding`); `RestDiscordApi` (live) and `FakeDiscordApi` (in-memory, records mutations) |
| apply | src/apply.ts | `apply(ops, api, log) -> ApplyResult` — executes ops in order, stops on first failure with the completed list |
| onboarding | src/onboarding.ts | `mergeOnboarding(current, desiredOptions) -> PutBody or null` — pure merge preserving existing ids |
| cli | src/cli.ts, bin/discord-hub.mjs | `init | new | plan | apply | archive`; env DISCORD_BOT_TOKEN; `--snapshot`, `--dry-run` |

## Cavities (pre-routed channels)

- **GitHub mirror**: forum thread -> GitHub issue. Hangs off the `#bug-reports` channel
  id the model already records; a resident bot would be a new module behind `discord`.
- **Multi-guild**: `Hub.guildId` is a single field today; the planner is guild-agnostic.
- **Universal defaults**: a11y, i18n, EU-compliance, security/privacy (ADR-0012 inherited).
  Token lives in env only; webhook URLs printed once, never persisted.
