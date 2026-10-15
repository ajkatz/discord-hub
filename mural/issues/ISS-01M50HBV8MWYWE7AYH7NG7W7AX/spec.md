---
id: ISS-01M50HBV8MWYWE7AYH7NG7W7AX
type: issue
status: draft
owner: eng
title: cli --no-onboarding — plan/apply/new/init leave the onboarding prompt alone
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@4]
derives_from: []
depends: [ISS-01M4YRK2CD4S2WNDHCEFJPFZVH]
paths: [src/cli.ts, tests/cli.test.ts, README.md]
acceptance: [bash tests/accept-cli.sh]
cw_tokens: 2000
cw_files: 3
phase: finish
model: mid
max_turns: 25
method: retroactive
shipped_sha: [6bcb56b2f832312cce1b2746927f00c4c901a65b]
shipped_time: 2026-10-15T04:07:54Z
---

## Contract

Shipped 2026-10-14 (commit 6bcb56b, same commit as the bot self-overwrite). Needed to
build the first sub-communities behind the wall and reveal them once the onboarding
prompt was ready.

`src/cli.ts`: `--no-onboarding` flag parsed into `Args.noOnboarding` (default false);
after `plan(hub, snapshot, { shared })` the ops are filtered so no `upsert-onboarding`
op is printed or applied when the flag is set. Usage text gains the option line
"leave the onboarding prompt alone (keeps new projects behind the wall)".

`README.md`: `apply --no-onboarding` example in the Use section.

Test (tests/cli.test.ts): "holds back the onboarding prompt with --no-onboarding" — the
empty-snapshot plan for one project prints six numbered ops instead of seven.
