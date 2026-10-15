---
id: RETRO-001
type: retro
status: active
owner: pm
title: R-001 — founding day and the live-iteration evening (2026-10-14/15)
version: 1
---

Grades the process, not the product. Window: founding (467699c, 2026-10-14) through the
reconciliation commits of 2026-10-15 (b74a96c). Evidence is the ledger, the git log and
the issue receipts; nothing here is from memory.

## Numbers

| measure | value |
|---|---|
| mural docs | 39 (27 before reconciliation: 1 PRD v4, 18 issues, 1 CO, 2 ADR, 1 ASM, 1 finding, 1 scan, 8 playbooks, 6 evergreen) |
| issues gated end-to-end (dor, red, ready, done) | 7 |
| issues filed retroactively (dor, ready, done; `method: retroactive`, no red) | 11 |
| ledger events | red 7 · gate-ready pass 18 / fail 4 · done 18 · calibrate 2 |
| bounces | 4 READY-FAIL on the first three issues, one error each, cleared within four minutes (03:13 → 03:18Z) |
| commits | 25: 8 coordination (mural only), 2 mixed (PRD + specs + failing suites), 13 build, 2 data (`hub.json` projects) |
| coordination:build | 8:13 pure, 10:15 counting mixed on both sides |
| tests | 36 → 67 (gated build) → 78 (live-iteration evening); every build commit carried its test |
| calibration | n=5 window mean\|ratio-1\|=0.85, threshold 0.5 → CALIBRATE-FAIL (exit 1) |
| calibration validity | none: `actual_files` 0/0/1/1/4 are the untracked-directory artefact in F-01M4YSPEQSEHZREY1K1006BK1A, not estimate error; the 11 retroactive rows record -1 and are excluded by design |
| PRD | v1 → v2 → v3 (founding day), v4 (reconciliation, 14 h after the behaviour it describes shipped); CO-01M50HBW4FGVWW46SFDG3SGP1B is the disposition for the seven v3-pinned issues (all keep) |

## What the gates caught

- **gate ready, 4 bounces** on the first three issues. The ledger stores only
  `errors: 1`; the message is gone. Whatever it was, it was fixed in four minutes.
- **gate dor on the 11 retroactive specs: 0 bounces.** Expected — the contracts were
  written from diffs, so there was nothing left to discover. A dor pass on a
  retroactive spec is a formatting receipt, not a readiness one.
- **pre-commit (check + smoke): no evidence of a blocked commit** in 25 commits. The
  tree stayed parseable throughout; `scripts/mural check` was green at every commit.
- **done acceptance: 18/18 passed first time.** The gated seven because the suites
  were written red first; the retroactive eleven because the tests already existed.

## What bypassed the gates, and why

Between 21:07 and 22:29 on 2026-10-14 (eleven commits), then two more on 2026-10-15,
every change went straight to main with a test but without an issue:

| change | commit | trigger |
|---|---|---|
| bot self-overwrite on categories/children | 6bcb56b | live 403 50013 on the first real `apply` |
| `--no-onboarding` | 6bcb56b | needed to build behind the wall while onboarding was off |
| forum guidelines + announcements topic (`set-topic`) | 0915a50 | first look at the live forum: no guidance for posters |
| silent triage, kind tags, `set-tags` | ba984bc, ba249ac | first live posts: the per-post reply read as noise |
| one `#feedback` forum, `#bug-reports` gone | 0804576 | two forums split a small audience |
| custom emoji ids on onboarding options | 6dda599, 2fb61b4 | pick-list should show plugin icons |
| onboarding PUT carries seven default channels | 5ba07d3 | live PUT refused below Discord's minimum |
| `new --icon` | 77aecb3 | one command per project, icon included |
| bot reloads `hub.json` | 77aecb3 | add projects from another machine without a restart |
| handoff note | 77aecb3 | WoW addon icons live on another machine |
| announce.yml quoted descriptions + YAML parse test | 1c7ce08, 4330920 | every caller failed on push to main |

Why: the loop was discover-on-the-live-guild → fix → re-apply, with the in-memory fake
making each fix testable in minutes. Writing a spec, earning a red receipt and gating
before each fix would have cost more than the fix. The pipeline has no lane for that
loop, so it was skipped entirely.

What it cost: the PRD described two forums and a replying bot for 14 hours; the ledger
has no done events for 11 changes until today; calibration has nothing from the most
productive 90 minutes of the project; the reconciliation itself (this retro, the CO,
eleven specs, 5 commits) is pure coordination spend that a live lane would have
avoided.

## Stimulators observed → bolster

- **The Discord seam + in-memory fake** made every live discovery a unit test within
  minutes (36 → 78 tests; each of the 13 build commits carries its test). Bolster:
  keep every new API capability behind the seam with a fake counterpart
  (`createEmoji` followed the pattern on the same evening).
- **`hub.json` as the truth with idempotent `apply`** made live iteration cheap: after
  each fix, re-run; nothing to clean up. Bolster: keep `plan` as the first command in
  every runbook step; it was the no-op proof after every live change.
- **The kernel's `method` key and -1 actuals** let the eleven retroactive issues close
  honestly: `method: retroactive` silences the red warning, and with no red window
  `done` records actuals as ungradeable rather than 0. Bolster: this is the sanctioned
  shape for after-the-fact issues; keep `shipped_sha`/`shipped_time` on them so the
  provenance is in the frontmatter, not only in git.

## Detractors observed → remove

- **No live-iteration lane** (above). Remove: when a session is about to iterate against
  a live external system, open ONE umbrella issue first (contract: "reconcile against
  the live guild; discoveries appended below as they land"), earn its red with the first
  failing test, and append each discovery to the contract as it ships. Predicted effect
  (for R-002 to grade): the next live session produces ≥1 gated issue and 0 retroactive
  ones, and the PRD bump lands in the same session.
- **Calibration is red on fiction.** `done` recorded 0 actual files for greenfield
  issues (F-01M4YSPEQSEHZREY1K1006BK1A); the threshold is breached by a measurement
  bug, and the doctrine says a breach needs a process ADR. Remove: the kernel fix
  (expand untracked directories before the write-set match) is the adjustment; the ADR
  naming it is still to be filed. Predicted effect: the next three gated issues grade
  within 0.5.
- **Retroactive receipts are indistinguishable in the ledger.** The done event carries
  no `method`; only the spec says `retroactive`. Remove (kernel): log `method` on done
  events so calibrate and audits can filter them without opening specs.
- **Gate-fail events drop the message.** `gate-ready fail errors: 1` four times, cause
  unknown today. Remove (kernel): log the first error string on fail events.
- **An existence-only acceptance yields an empty receipt.** The handoff-docs issue's
  `test -s` + `grep -q` produce no output, so `receipt_tests` is the hash of the empty
  string (e3b0c442…). Remove: docs issues use an acceptance that prints (e.g.
  `grep -c`), or the kernel refuses an empty receipt.
- **borders.md still names `#bug-reports`** in the GitHub-mirror cavity and lists
  neither `createEmoji` nor the new CLI flags. Remove: refresh the blueprint (version 4)
  in the next engineering issue that touches those walls.

## Discord lessons (for the next guild, not the next sprint)

- **A private category hides the bot from itself.** Denying `@everyone` View on a
  category denies the bot too; its next create inside returns 403 50013. Every category
  and child now carries a member overwrite for the bot user with `BOT_PERMS`. The bot
  can only grant what it holds — keep its role above the project roles.
- **Onboarding has minimums that apply to every edit, not just enabling.** A PUT to
  `/guilds/{id}/onboarding` is refused unless at least seven default channels, five of
  them writable, are in the same request. The seven shared channels are exactly that
  set; `apply` sends their ids as `default_channel_ids` whenever all seven exist. `init`
  therefore has to run before any project's onboarding option can be written.
- **A colon in an unquoted YAML description breaks the whole workflow,** and a
  reusable workflow's callers only run on push to main, so PR CI never sees it. Both
  workflow files are now parsed in the test suite; quote every description.
- **Custom emoji on an option is `emoji_id`, unicode is `emoji_name`, never both;** the
  merge compares whichever the desired option has. Upload is idempotent by name.
- **Placeholder prompt ids work** (ASM-01M4YRFMTAFAVY3TMZ72H5QP92 validated live):
  a new prompt with a client-chosen snowflake-shaped id and id-less options returns 200
  and comes back with real ids.
- **Open, from the announcer-rollout session's note (2026-10-15):** `ajkatz/discord-hub`
  is private with Actions access `none`, so the eleven public callers cannot use the
  reusable workflow until the repo is public or the announcer is published elsewhere.
  Hub-side decision; the runbook does not mention visibility yet.

## Graded interventions

First retro — nothing to grade. R-002 grades the five removals above and the kernel
fix proposed in F-01M4YSPEQSEHZREY1K1006BK1A.

## Process ADRs filed

None this retro. ADR-0001 (seeded from the kernel) and ADR-0002 (resident bot on pi5)
are product decisions. The calibration breach still owes a process ADR naming the
adjustment and its predicted effect (see Detractors); it is Andrew's to file.
