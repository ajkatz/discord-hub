# Runbook

One-time server setup, then one command per project. Everything the bot token can do is
in the CLI; the steps below are the ones only a human can click.

## 1. One-time: server, Community, bot

1. Create the server (any name). Server Settings → Enable Community (accept the
   guidelines; pick any rules/updates channels — `init` creates the real ones).
2. Create the bot application at https://discord.com/developers/applications → Bot:
   - Privileged Gateway Intents: enable **Message Content** (the triage bot reads
     `#general` to spot bug reports).
   - Reset Token → copy it once into your shell (`export DISCORD_BOT_TOKEN=...`) and into
     the pi's env file later. The CLI never writes it to disk.
3. OAuth2 → URL Generator → scope `bot`, permissions: Manage Server, Manage Roles,
   Manage Channels, Manage Webhooks, Manage Threads, View Channels, Send Messages,
   Send Messages in Threads, Create Public Threads, Read Message History. Open the URL,
   add the bot to the server.
4. Server Settings → Roles: drag the bot's role **above** where project roles will sit
   (the bot can only grant permissions it holds).
5. Copy `hub.example.json` to `hub.json`, set `guildId` (Server Settings → Widget, or
   right-click the server with Developer Mode on → Copy Server ID). Leave `projects`
   empty or keep the examples.

## 2. One-time: shared channels + onboarding

```bash
npm install && npm run build
node bin/discord-hub.mjs init --dry-run     # look first
node bin/discord-hub.mjs init
```

`init` creates `#welcome #rules #all-announcements #lounge #introductions #help
#off-topic` (seven default channels, five writable: Discord's requirement for turning
onboarding on) and the "Which plugins do you use?" prompt with an option per project.

Then in Discord: Server Settings → Onboarding → Default Channels: pick the seven →
Enable Onboarding. Members now get the prompt on join and under "Channels & Roles" at
the top of the channel list. Picking a plugin grants its role and reveals its category.

## 3. Per project

```bash
node bin/discord-hub.mjs new goal-planner --name "Goal Planner" --emoji 🎯 --repo ajkatz/runelite-goal-planner
```

Creates the role, private category, `#announcements` (read-only), `#general`, `#feedback`
(one forum: kind tags + status tags), the announcer webhook, and the onboarding option. The webhook URL is printed **once**: paste it into the project repo
as the `DISCORD_WEBHOOK_URL` Actions secret, add `ANTHROPIC_API_KEY`, and copy
`templates/discord-announce.yml` into the repo as `.github/workflows/discord-announce.yml`
with `project_name` set (it passes the two secrets by name; `secrets: inherit` fails
from an org-owned repo). Every push to `main` then posts a summary to `#announcements`.

A push that went unannounced (a broken secret, a failed run) is replayed by hand:
Actions -> "Announce pushes to Discord" -> Run workflow, `from` = the last commit or tag
that was announced, `to` empty for the branch head. The post is built from git history
and looks exactly like the one the push would have made; a range that only touches
`.github/` posts nothing. The post wears the repo's `icon.png` when it has one at the
root (the RuneLite plugins do), else the project's custom emoji from `hub.json` (its
`emojiId`; the WoW addons, which carry only `icon.tga`); pass `project_icon_url` in the
caller to use another image.

Re-running `new`, `apply` or `init` is safe: only what is missing gets created.
`plan` always shows the diff first. `archive <slug>` removes the onboarding option and
prefixes the category with `[archived]`; nothing is deleted.

## 3a. Games: the game first, then its plugins

With games listed in `hub.json`, onboarding asks the game first and each game's plugins
after it (ADR-0004):

```json
"gamePrompt": "What do you play?",
"games": [
  { "slug": "osrs", "name": "Old School RuneScape", "chat": "osrs-chat", "prompt": "Which RuneLite plugins do you use?", "emoji": "🗡️" },
  { "slug": "wow-forever", "name": "WoW: Forever", "chat": "wow-forever-chat", "prompt": "Which WoW: Forever addons do you use?", "emoji": "♾️" }
]
```

Every live project then names its `game` (`new forever-x --name "Forever X" --game
wow-forever`). `apply` builds per game a role (`@osrs`), a private category named after the
game and its chat (`#osrs-chat`, where everyone with the role posts), and rewrites
onboarding: "What do you play?" first (a game grants its role and its chat), then one
question per game that has projects, each project's option granting its own role and
channels. The single "Which plugins do you use?" question goes; a hub without games keeps
it. To rename a question, change its title and put the old one in `retiredPrompts`: the hub
only ever drops questions it knows by title.

Members who joined before keep their project roles but get no game role until they pick
their game in Channels & Roles. New game categories land at the
bottom of the channel list: drag each above its projects.

## 4. Migrating the Loadout Lab and Goal Planner servers

Discord cannot merge servers. In each old server: pin a message with the new invite,
rename the server "(moved)", and after a couple of weeks turn off invites. In the
Loadout Lab repo, replace the `DISCORD_WEBHOOK_URL` secret with the one `new
loadout-lab` printed and switch the workflow to the template. Point the plugin's "Join
our Discord" link at the new invite.

## 5. Triage bot on pi5

The bot classifies every new `#feedback` thread (kind tag + `acknowledged`, or `known`
with a link when it duplicates an open thread, plus a ledger record), opens `#feedback`
threads for clear bug reports in `#general`, and records any tag you change by hand. Changing a tag is your verdict; the
bot never reverts it.

On the pi (once), create `/home/andrew/discord-hub.env`, mode 600:

```
DISCORD_BOT_TOKEN=...
ANTHROPIC_API_KEY=...
HUB_PATH=/home/andrew/discord-hub/hub.json
TRIAGE_LEDGER=/home/andrew/discord-hub/data/triage.jsonl
```

From the Mac:

```bash
DRY_RUN=1 scripts/deploy-pi.sh andrew@pi5.localdomain   # prints every command
scripts/deploy-pi.sh andrew@pi5.localdomain             # build, rsync, npm ci
```

Then the three `sudo systemctl` lines the script prints. Logs: `journalctl -u
discord-hub-bot -f`. The ledger is `data/triage.jsonl` on the pi (append-only JSONL;
`grep unclassified` finds the threads the classifier could not handle).

pi5 is WiFi-attached and sometimes powered off; the wired Pi 4 (`andrew@pi.local`) is the
always-on alternative. Same script, different target.
