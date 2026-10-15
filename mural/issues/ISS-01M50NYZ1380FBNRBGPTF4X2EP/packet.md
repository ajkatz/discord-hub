<!-- GENERATED packet for ISS-01M50NYZ1380FBNRBGPTF4X2EP — the worker's entire briefing -->
<!-- source-hash: 615d3309fb3dd3d8 -->
# Packet: announcer replays a missed push on demand

## Contract of record (from frontmatter — the enforced envelope)

- write-set manifest (only paths you may touch): announcer/announce.mjs (EXISTS — modify only if the contract says so), .github/workflows/announce.yml (EXISTS — modify only if the contract says so), templates/discord-announce.yml (EXISTS — modify only if the contract says so), tests/announcer.test.ts (EXISTS — modify only if the contract says so), docs/runbook.md (EXISTS — modify only if the contract says so), README.md (EXISTS — modify only if the contract says so)
- acceptance commands (must exit 0 for done): ['bash tests/accept-announcer.sh']
- upstream pins: []  |  depends: ['ISS-01M4YS4JR84N865A2GE202351A']
- budget: model=mid max_turns=25 cw_tokens=5000 cw_files=6 phase=breadth
- report exactly one status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED — proof lives in receipts, not your report.
- if any decision is not answerable from this packet: write blocked.md with the question + a proposed default, and stop.

## Task
## Contract

Andrew, 2026-10-15: "can we fix the announcer to be able to do a make up
announcement if it misses?" Loadout Lab 0.5.4's push went unannounced
(the secrets: inherit failure); a rerun replays the broken workflow and
the reusable job skips itself without a pushed commit, so there was no
way to post it afterwards.

REQ-1 A manual run with a range. The caller template gains
`workflow_dispatch` with inputs `from` (required: a sha or tag, the last
commit already announced) and `to` (optional, default the branch head)
and passes them to the reusable workflow as `replay_from` / `replay_to`.
The reusable job runs on a push OR when `replay_from` is set, and hands
the range to the announcer as `REPLAY_FROM` / `REPLAY_TO`.

REQ-2 The announcer rebuilds the push payload from git. With
`REPLAY_FROM` set, announce.mjs resolves both refs, lists `from..to`
oldest first, and builds the same event shape a push delivers: commits
with id, message, url, author, timestamp and added/modified/removed
files (from `git show --name-status`), `before`/`after`, the GitHub
compare link, the dispatcher as pusher, the last commit as head_commit.
Everything after that - the feature-registry diff, the CI-only silence,
the Claude or plain summary, the embed - runs unchanged, so a replay
looks exactly like the post the push would have made.

REQ-3 Documented. The runbook's per-project section says how to replay
(Actions, "Announce pushes to Discord", Run workflow, from = the last
announced commit or tag); the README's Announcer section mentions it.

## Acceptance

- tests/announcer.test.ts "announcer replay": given a temporary git
  repo with three commits after a base and a local webhook, when the
  script runs with REPLAY_FROM = base and REPLAY_TO = the release
  commit, then one embed is posted titled "2 new commits", newest
  first, with the compare link, the dispatcher in the footer and the
  feature the range added called out; a tag works as `from` and an
  empty `to` means HEAD; a CI-only range and an empty range post nothing.
- The workflow and template YAML parse; the reusable inputs are exactly
  project_name, project_description, hub_ref, replay_from, replay_to;
  the template's dispatch inputs are exactly from, to.
- bash tests/accept-announcer.sh green.
