#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
npx vitest run tests/triage.test.ts tests/ledger.test.ts tests/channels.test.ts
