# Handoff: adding the WoW addon communities from another machine

The hub lives in Discord server **AK Addons** (guild `1524847121562468514`). Three
sub-communities exist (Loadout Lab, Goal Planner, Trappy Chinchompa). Adding one for a WoW
addon is one command per addon, run from the machine that has the addon's icon.

## One-time on that machine

```bash
git clone git@github.com:ajkatz/discord-hub.git && cd discord-hub
npm install && npm run build
```

Create `.env` (gitignored, mode 600) with the bot token. Get it from the Discord developer
portal → application **Triage** → Bot → Reset Token (resetting invalidates the token on
the pi; after a reset, update `/home/andrew/discord-hub.env` there and
`sudo systemctl restart discord-hub-bot`). Or copy the `.env` from the Mac over a secure
channel; it is the same token.

```
DISCORD_BOT_TOKEN=...
```

## Per addon

```bash
node bin/discord-hub.mjs plan --hub hub.json            # expect "nothing to do" first
node bin/discord-hub.mjs new katz-stats --name "KatzStats" --icon /path/to/icon.png --repo owner/repo
```

What `new` does: adds the project to `hub.json`, creates the role, the private category,
`#announcements` / `#general` / `#feedback` (forum with kind + status tags), the push
announcer webhook (URL printed once), uploads the icon as a server emoji and puts it on
the onboarding pick-list option. Then:

1. Store the printed webhook URL as the repo's `DISCORD_WEBHOOK_URL` Actions secret
   (`gh secret set DISCORD_WEBHOOK_URL -R owner/repo`), add `ANTHROPIC_API_KEY`, and copy
   `templates/discord-announce.yml` into the repo as `.github/workflows/discord-announce.yml`
   with `project_name` set; it passes the two secrets by name (`secrets: inherit` fails
   from an org-owned repo). Only if the repo should announce pushes.
2. `git commit -am "hub: katz-stats" && git push` so every machine has the same `hub.json`.
3. On the pi, the bot reloads `hub.json` every 15 minutes, but it reads its own copy:
   `scripts/deploy-pi.sh andrew@pi5.localdomain` from any machine rsyncs it (no restart
   needed for a new project; a restart is needed only when `dist/` changed).

Slug rules: lowercase, digits, dashes. The emoji name is the slug without dashes.
Icons: PNG/JPG/GIF under 256 KB; Discord squares them. WoW addon icons are often `.tga`
or `.blp`; convert to PNG first.

## Checks

```bash
node bin/discord-hub.mjs plan --hub hub.json        # must be "nothing to do" after new
```

In Discord: Channels & Roles should list the new addon with its icon; picking it reveals
the category.
