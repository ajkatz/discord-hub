#!/bin/bash
# SessionStart hook: inject the generated index — the O(1) onboarding packet.
cd "$(dirname "$0")/../.." && cat mural/index.md 2>/dev/null || echo "no index yet — run scripts/mural index"
