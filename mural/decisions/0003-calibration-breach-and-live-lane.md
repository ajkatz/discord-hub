---
id: ADR-0003
type: adr
status: draft
owner: user
title: Calibration breach — fix the measurement, add a live-iteration lane
version: 1
---
## Context

`scripts/mural calibrate` exits 1 on this repo: window n=5, mean|ratio-1|=0.85 against a
threshold of 0.5. Kernel doctrine says a breach must produce a process ADR naming the
adjustment and its predicted effect, and the next calibrate grades the prediction. This
is that ADR. It is a process decision, not a product one (ADR-0001 and ADR-0002 are
product decisions).

The breach is not estimate error. The five graded rows (RETRO-001 Numbers) are the
first gated issues of founding day, with `actual_files` 0 / 4 / 0 / 1 / 1 against
predictions 4 / 10 / 6 / 4 / 9, although every write-set file was created. Finding
F-01M4YSPEQSEHZREY1K1006BK1A traces it to `cmd_done`: it reads `git status --porcelain`,
which lists an untracked directory as one line (`?? src/`), so `in_writeset` compares
`src/` against `src/model.ts` and matches nothing; the committed-diff path was empty
because `done` ran before the first commit. Greenfield issues therefore grade as if
no work happened. The eleven retroactive issues record -1 and are excluded by design,
so the window consists entirely of this artefact.

RETRO-001 also records the second process gap that the same window exposes: between
21:07 and 22:29 on 2026-10-14 (eleven commits, plus two on 2026-10-15) every change went
to main with a test but without an issue, because the loop was discover-on-the-live-guild
→ fix → re-apply and the pipeline had no lane for it. The cost was a PRD that described
the wrong forums for 14 hours, no done events for 11 changes until the reconciliation,
nothing in calibration from the most productive 90 minutes, and a reconciliation
(PRD v4, CO-01M50HBW4FGVWW46SFDG3SGP1B, eleven specs, RETRO-001, five commits) that was
pure coordination spend.

## Decision

Two adjustments, both named in RETRO-001 Detractors, adopted here so the next calibrate
can grade them.

1. **Kernel fix — expand untracked directories before the write-set match.** `cmd_done`
   in ~/Development/mural (and the copy at `scripts/mural` here) switches to
   `git status --porcelain --untracked-files=all` (or stages first) so greenfield files
   are matched individually. No estimates are changed: the predictions were plausible
   and the actuals were wrong. This repo picks up the fix on the next kernel sync; until
   then the breach stands and is understood.

   Predicted effect: each of the next three gated issues in this repo records
   `actual_files` within 0.5 of `predicted_files` (ratio in [0.5, 1.5]). Because
   `calibrate` grades the last five gradeable rows, the aggregate stays red until five
   post-fix rows have displaced the five artefact rows; it then reads ≤ 0.5. R-002 grades
   both the per-issue rows and the aggregate.

2. **Live-iteration lane — one umbrella issue per live session.** When a session is
   about to iterate against a live external system (the Discord guild, a Pi, GitHub
   Actions), it opens ONE issue first with the contract "reconcile against the live
   system; discoveries appended below as they land", a write-set covering the seams it
   expects to touch, and earns its red with the first failing test. Each discovery is
   appended to the contract as it ships, with its test; `done` closes the umbrella at
   the end of the session, and the PRD bump lands in the same session. The per-change
   spec, red and gate are not required for discoveries inside the umbrella.

   Predicted effect: the next live-iteration session produces ≥1 gated issue (dor, red,
   ready, done) and 0 retroactive issues (`method: retroactive`), and the PRD version
   bump is committed in the same session rather than the next day.

## Considered options

(a) **Fix the measurement, keep the threshold and the estimates** — chosen. The data
measures nothing, so moving anything else would be tuning to fiction.

(b) **Reset the ledger or mark the five rows -1 by hand** — rejected. The ledger is
append-only evidence; editing receipts to pass a gate defeats the gate, and the window
of 5 displaces the rows naturally once real actuals arrive.

(c) **Raise the threshold or widen the window** — rejected. There is no estimate error
to accommodate; a looser gate would hide the next real breach.

(d) **Require a full spec + red + gate for every live fix** — rejected. RETRO-001 shows
the per-fix ceremony costs more than the fix during live iteration; the predictable
outcome is that the pipeline is skipped again, as it was.

(e) **No lane; keep filing retroactive issues after live sessions** — rejected. The
reconciliation cost (five commits, eleven specs, a retro) is the price of this option,
and retroactive rows contribute nothing to calibration.

## Consequences

- The calibrate gate stays red in this repo until the kernel fix lands and five gated
  issues have been closed with it; that red is read as "known measurement artefact,
  ADR-0003 filed", not as a new breach. A second breach after the window turns over is
  a new ADR.
- The kernel fix belongs in ~/Development/mural (`cmd_done`); F-01M4YSPEQSEHZREY1K1006BK1A
  is the harvest pointer. This repo's `scripts/mural` is the kernel copy and follows it.
- Umbrella issues have looser write-sets and longer contracts than ordinary issues; their
  calibration rows will be noisier. The lane trades per-change precision for having any
  receipts at all from live sessions.
- The remaining RETRO-001 removals (log `method` on done events, log the first error
  string on gate-fail events, refuse an empty acceptance receipt, refresh borders.md) are
  kernel or engineering follow-ups, not process rule changes, and are not decided here.
- R-002 grades both predictions. If either fails, the adjustment is revisited in a
  superseding ADR rather than re-tuned in place.
