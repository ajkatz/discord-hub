#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
npx vitest run tests/onboarding.test.ts
