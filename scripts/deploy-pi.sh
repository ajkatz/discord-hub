#!/bin/bash
# deploy-pi.sh [user@host] — build locally, rsync the runtime to ~/discord-hub on the
# target, install production deps there, and print the systemd commands (sudo is yours).
#   DRY_RUN=1   print every command, execute none
# Default target is pi5 over the LAN (see the pi runbook); the wired Pi 4 is
# andrew@pi.local if the bot needs an always-on host.
set -euo pipefail
TARGET="${1:-andrew@pi5.localdomain}"
DRY_RUN="${DRY_RUN:-0}"
cd "$(dirname "$0")/.."

run() {
  echo "+ $*"
  [ "$DRY_RUN" = 1 ] || "$@"
}

run npm run build
run rsync -az --delete \
  --exclude node_modules --exclude .env --exclude .git \
  dist package.json package-lock.json hub.json deploy \
  "$TARGET:discord-hub/"
run ssh "$TARGET" "cd discord-hub && npm ci --omit=dev --no-audit --no-fund"

cat <<MSG

Next, on $TARGET (sudo is yours to run):
  sudo cp ~/discord-hub/deploy/discord-hub-bot.service /etc/systemd/system/
  sudo systemctl daemon-reload && sudo systemctl enable discord-hub-bot
  sudo systemctl restart discord-hub-bot && sudo systemctl status discord-hub-bot --no-pager

Env file (create once, chmod 600): /home/andrew/discord-hub.env
  DISCORD_BOT_TOKEN=...
  ANTHROPIC_API_KEY=...
  HUB_PATH=/home/andrew/discord-hub/hub.json
  TRIAGE_LEDGER=/home/andrew/discord-hub/data/triage.jsonl
Logs: journalctl -u discord-hub-bot -f
MSG
