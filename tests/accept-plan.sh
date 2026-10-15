#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
npx vitest run tests/plan.test.ts tests/model.test.ts
