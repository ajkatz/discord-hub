#!/bin/bash
# Standing gate (seeded minimal; grows with every caught defect — see kernel smoke for the pattern).
set -euo pipefail
cd "$(dirname "$0")/.."
export MURAL_LEDGER="$(mktemp)"
scripts/mural index >/dev/null || { echo "SMOKE FAIL: index"; exit 1; }
scripts/mural check >/dev/null || { echo "SMOKE FAIL: check"; exit 1; }
scripts/mural map >/dev/null   || { echo "SMOKE FAIL: map"; exit 1; }
scripts/mural health >/dev/null || { echo "SMOKE FAIL: health"; exit 1; }
rm -f "$MURAL_LEDGER"
echo "SMOKE PASS"
