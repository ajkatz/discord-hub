#!/bin/bash
# dispatch.sh — fan out ready issues to worktree-isolated workers.
# Default is --dry (print the plan). --run creates worktrees and prints the launch
# commands; actually spawning `claude -p` is gated behind --live (kernel prototype).
set -euo pipefail
cd "$(dirname "$0")/.."
MODE="${1:---dry}"
CAP="${MURAL_CONCURRENCY:-3}"
echo "== mural plan (cap $CAP) =="
scripts/mural plan
[ "$MODE" = "--dry" ] && { echo "(dry run — pass --run to create worktrees)"; exit 0; }
n=0
scripts/mural plan | awk '/^launch /{print $2}' | while read -r ISS; do
  [ "$n" -ge "$CAP" ] && break
  WT="../wt-$ISS"
  git worktree add "$WT" -b "issue/$ISS" 2>/dev/null || echo "worktree exists: $WT"
  (cd "$WT" && scripts/mural packet "$ISS")   # packet generated IN the worktree the worker sees
  MODEL=$(grep '^model:' "mural/issues/$ISS/spec.md" | awk '{print $2}'); MODEL=${MODEL:-mid}
  MT=$(grep '^max_turns:' "mural/issues/$ISS/spec.md" | awk '{print $2}'); MT=${MT:-25}
  scripts/mural audit "$ISS" --snapshot          # pre-image: prompts do not bind workers, hashes do
  echo "LAUNCH: (cd $WT && MURAL_ISSUE=$ISS claude -p \"\$(cat mural/issues/$ISS/packet.md)\" --model $MODEL --max-turns $MT)"
  echo "POST-FLIGHT (required): scripts/mural audit $ISS --check"
  [ "$MODE" = "--live" ] && echo "(live spawn not implemented in kernel prototype)" 
  n=$((n+1))
done
