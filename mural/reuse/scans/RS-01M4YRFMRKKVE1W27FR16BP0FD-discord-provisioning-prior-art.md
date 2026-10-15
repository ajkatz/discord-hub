---
id: RS-01M4YRFMRKKVE1W27FR16BP0FD
type: scan
status: active
owner: pm
title: Discord sub-community provisioning — opt-in is native, reconciliation is not
version: 1
verdict: assemble-from-parts
---
## What exists

Scan 2026-10-14 against docs.discord.com (guild, channel, webhook, permissions pages)
plus the known library landscape. Confidence: high on the API surface, medium on
onboarding prompt-id semantics (ASM-01M4YRFMTAFAVY3TMZ72H5QP92).

- **Community Onboarding ("Channels & Roles")** — native. `GET/PUT
  /guilds/{id}/onboarding` (MANAGE_GUILD + MANAGE_ROLES). A prompt option carries
  `role_ids` + `channel_ids`; picking it grants the role and opts the member in.
  Enabling needs 7 default channels, 5 of them @everyone-writable. ADOPT: this is the
  "activate a sub-community" switch, no bot required.
- **Forum channels** (type 15) with `available_tags` (max 20) — native per-project
  bug and feedback intake with a resolve state. ADOPT.
- **Private categories** — deny VIEW_CHANNEL (1<<10) for @everyone on the category,
  allow for the project role; children carry the same overwrites so they stay synced.
  ADOPT.
- **Create Guild Channel** `POST /guilds/{id}/channels` (MANAGE_CHANNELS), **Create
  Role** `POST /guilds/{id}/roles` (MANAGE_ROLES), **Create Webhook** `POST
  /channels/{id}/webhooks` (MANAGE_WEBHOOKS, returns `token`; URL =
  `https://discord.com/api/webhooks/{id}/{token}`).
- **@discordjs/rest + discord-api-types** — typed routes, rate-limit queueing, auth
  header. ADOPT (one dependency pair, no gateway connection needed).
- **Discord Server Templates** — clone an entire server once. Cannot add a category to
  a live server, cannot touch onboarding. Not adopted.
- **Generic "server setup" bots** (MEE6, Dyno, Carl-bot) — reaction roles and
  reaction-based self-assignment predate onboarding; none take a declarative project
  list and none are run-from-a-repo. Not adopted.
- **Existing in-house**: runelite-loadout-lab `.github/scripts/announce.mjs` posts
  per-push summaries to a channel webhook. Reused unchanged; the CLI emits the webhook
  URL it needs.

## Verdict

assemble-from-parts. The opt-in mechanism, forums, permissions and REST plumbing are
all native or library-provided. The product is the thin reconciler on top: a `hub.json`
of projects, a planner that diffs it against a guild snapshot, an applier that executes
the diff idempotently, and the onboarding merge. Exit strategy for `@discordjs/rest`:
the `DiscordApi` interface is the seam; a fetch-based implementation is ~100 lines.
