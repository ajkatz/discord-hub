#!/bin/bash
# Stop hook for worker sessions: a worker cannot end its turn with a broken mural
# OR red acceptance tests. Exit 2 blocks the stop (Claude Code hook contract).
[ -z "$MURAL_ISSUE" ] && exit 0
cd "$(dirname "$0")/../.." || exit 0
if ! scripts/mural check; then
  echo "mural check failed — fix the tree before ending the turn" >&2
  exit 2
fi
if ! scripts/mural verify "$MURAL_ISSUE"; then
  echo "acceptance tests for $MURAL_ISSUE are red — a worker cannot end its turn green with red tests" >&2
  exit 2
fi
exit 0
