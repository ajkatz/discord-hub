---
id: DOC-manual
type: evergreen
status: active
owner: eng
title: Manual — discord-hub
version: 2
---

## What this software does

`discord-hub` keeps one Discord server in sync with `hub.json`: one sub-community (role,
private category, announcements, general, one feedback forum, webhook, onboarding option)
per project. A resident bot triages new forum threads with Claude: kind tag + status tag,
ledger record, silent unless it links a duplicate.

## The critical things to know

- **`hub.json` is the truth; the guild is reconciled to it.** `plan` shows the diff,
  `apply`/`new`/`init` create only what is missing. Re-running is safe.
- **The bot token lives in `DISCORD_BOT_TOKEN` only.** Webhook URLs are printed once at
  creation and never written anywhere; losing one means deleting and re-creating the
  webhook in Discord.
- **Onboarding has to be switched on by a human** after `init` (seven default channels,
  five writable); the CLI only maintains the prompt and its options.
- **Archive renames, never deletes.** Nothing in the CLI or bot deletes a channel, role,
  thread or message.
- **A tag you set by hand is final.** The bot records it and does not re-tag that thread.
- **Classifier failures are visible, not silent:** no tag, no reply, a ledger record with
  status `unclassified`.
- `--snapshot <file>` runs any command offline against a saved guild snapshot.
