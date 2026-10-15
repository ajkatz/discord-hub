#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build >/dev/null
npx vitest run tests/cli.test.ts
