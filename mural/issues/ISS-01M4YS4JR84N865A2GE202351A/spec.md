---
id: ISS-01M4YS4JR84N865A2GE202351A
type: issue
status: draft
owner: eng
title: announcer — reusable push-summary workflow + caller template
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@3]
derives_from: []
depends: []
paths: [announcer/announce.mjs, announcer/package.json, .github/workflows/announce.yml, templates/discord-announce.yml, tests/announcer.test.ts, tests/accept-announcer.sh]
acceptance: [bash tests/accept-announcer.sh]
cw_tokens: 5000
cw_files: 6
phase: breadth
model: mid
max_turns: 25
---
## Contract

`announcer/announce.mjs` (NEW): Loadout Lab's `.github/scripts/announce.mjs` moved
here, generalized: embed author/title come from `PROJECT_NAME` (default: repo name),
everything else identical (push summary via `@anthropic-ai/sdk`, model from
`ANTHROPIC_MODEL` default `claude-haiku-5-5`, plain commit list fallback, features.json
call-out when the file exists). `.github/workflows/announce.yml` (NEW): `on:
workflow_call` with inputs `project_name` (string) and secrets `DISCORD_WEBHOOK_URL`
(required), `ANTHROPIC_API_KEY` (optional); checks out the CALLER repo with
fetch-depth 0, then this repo's `announcer/` at the pinned ref, runs it.
`templates/discord-announce.yml` (NEW): the 15-line caller each project repo copies to
`.github/workflows/discord-announce.yml` (`uses: ajkatz/discord-hub/.github/workflows/announce.yml@main`,
`secrets: inherit`). Tests: `node --check announcer/announce.mjs`; the reusable
workflow declares `workflow_call` and the two secrets; the template references the
reusable workflow path and passes `secrets: inherit`.
