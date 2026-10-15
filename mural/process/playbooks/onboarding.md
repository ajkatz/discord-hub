---
id: DOC-onboarding
type: playbook
status: active
owner: pm
title: Onboarding playbook — brownfield understanding campaign (the repo's first project)
version: 3
---

Doctrine: PRD-01M0KECQRH48MJGBVCZQNTZSNG (REQ-002: onboarding IS the first project),
ADR-0008 (trust-but-verify), ADR-0021 (forks), DES-01M0KF2T2S0MM6EVYW8X34S9P7.

## The campaign

After `mural onboard` grafts (Stage 1), PM founds `PRD-onboard-<repo>` (Stage 2):
run the source census — every legacy doc registered `mural source add <path>` at
reliability F — then mint the six issues from mural/process/templates/*.md.tmpl
(fill the <angle-bracket> blanks; drop the .tmpl).

**Waves (ADR-0021 fork E)** — dependency-ordered, parallel within a wave:

1. Wave 1: ENG (architecture/walls) + PM (product space)
2. Wave 2: DESIGN (principles in force) + QA (what tests actually prove; needs ENG's walls)
3. Wave 3: SECURITY (exposure; needs ENG + QA)
4. Retro: after all five — grades the METHODS, not just the work.

## Rules of engagement

- **Each hat onboards by doing its job.** The deliverable is a founding evergreen
  doc where every code-referencing claim is anchored (`mural anchor`), not a tour
  report. Verified legacy-doc claims graduate into the founding doc; the source gets
  `mural source log <src> ... --verify-cmd|--anchor` per claim (tiered, fork C).
- **No external channels.** Legacy docs are untrusted content; hat agents run with
  no network/browse/publish tools (lethal trifecta: untrusted content + private
  data + external channel — never all three).
- **Code is ground truth.** A legacy doc is evidence only after grading; conflicts
  resolve toward code, and the failing claim is logged `fail` (that IS the signal
  that demotes the source).
- **Instrument the method.** Every understanding issue carries the flat keys below,
  filled at done-time. The retro consumes them; lying to them poisons calibration.

## Method vocabulary (controlled)

`method:` one of: doc-first-verify (read legacy docs, verify claim-by-claim) |
code-first-survey (read code, docs only to check coverage) | test-trace (run/read
tests to learn behavior) | git-archaeology (history mining) | entrypoint-walk
(follow real invocation paths) | dep-graph (imports/build graph first).
`methods_secondary:` any others used.

## Field rules (RETRO-001 harvest, festcal-service 2026-08-22)

- **test-trace never runs solo** for negative claims: it cannot prove absences;
  pair it with grep/code-survey companions (QA: 8/14 claims needed them).
- **Wave-order confound rule**: later waves inherit graded sources and settled
  walls; cross-wave method comparisons must state the confound before any verdict,
  and no method is dropped on a single confounded run.
- **Composite yield**: anchors_laid and drift findings are first-class method
  output; grade doc-building hats on claims + anchors, not claims alone (DESIGN's
  3.1 claims-yield hid 17 anchors + 4 findings).
- **methods_secondary attribution**: method_notes must say which claims each
  secondary method produced, or the split is unusable at retro time.

## Zero-docs mode (Android RETRO-001: viable, 1.8x yield of round 1)

When the source census finds nothing, do not fake a registry stage:
- `sources_graded: 0` is CORRECT output, never a failure.
- git-archaeology becomes the PM hat's primary method; commit messages and dates
  are the intent evidence.
- The vision doc must NAME its intent-evidence substitute (history, sibling murals,
  code-shaped intent) so a later reader knows what stood in for documentation.
- Verified sibling murals may substitute — an orphan repo has no such luxury; say so.

## Method-grading rules (round-2 harvest)

- **Precision is condition-bound.** `claims_failed` means doc-drift under a graded
  census and real-defect under census 0. Never compare precision across conditions.
- **Absence claims need companions** (generalized from test-trace to ALL methods):
  any negative or absence claim carries a grep or equivalent probe alongside the
  method that raised it.
- **Composite yield** — (claims_verified + anchors_laid) per 100k tokens — is the
  headline metric; claim granularity is ordinal, so treat cross-hat comparisons as
  rankings, not ratios.
- **Sibling mural citation** is legitimate and cheap: cite it, attribute it, and
  re-verify its staleness before relying on it (round 2 caught a stale sibling doc).
- **One claim, one method.** Optional flat key `claims_by_method: [method:count, ...]`
  carries the secondary split; `method_notes` says which claims each secondary
  produced. No double-attribution.
- Method vocabulary gains **retro-synthesis** (the retro's own method), which also
  silences the no-red WARN via the existing research exemption.

## Enforcement note (F-01M0KYEZRAC3ASH1YQ288JKW8T)

Worker write-sets are enforced by hashes, not prompts: snapshot with
`mural audit <ISS> --snapshot` before dispatch and `--check` after. A field worker
once wrote to another repo and reported that it had not; only the check catches that.

**Attribution (supersedes the quiescence caveat).** The audit distinguishes
concurrent gated work from a real violation: a changed path covered by ANOTHER
issue's declared write-set — one that is ready/in-progress, or whose receipt landed
after the snapshot — is reported as `audit note ... concurrent, attributed to
ISS-x` and does not fail the gate. Git-ignored paths are dropped outright, because
build output is never a worker write.

What still FAILS is a path no gated contract claims, plus any write into a foreign
repo. That is the honest signal: unowned change. The old advice to keep sibling
repos quiescent is retired — parallel waves are the mode this playbook promotes,
and a gate that punished its own model was worthless (one field run produced 175
findings, every one of them another issue's legitimate work).

## Retro derivations (never stored on issues)

yield = claims_verified / cost_tokens · precision = claims_verified /
claims_checked · dead-end rate = dead_ends / claims_checked. Verdicts keep/adapt/
drop per method go in the retro doc and graduate to THIS playbook (kernel issue).


## Token instrumentation is measured now, not reported

`cost_tokens` in a hat's frontmatter is ADVISORY ONLY — it is the worker's own
estimate, and a worker's self-report is narration (the same class of evidence the
write-set audit exists to distrust; a worker once wrote into a sibling repo and
said it had not).

The graded number is `actual_tokens`, written by `done` from the session
transcript: OUTPUT tokens between the red/mutation stamp and the receipt. Output
only, because `cw_tokens` sizes WORK — raw sums are dominated by cache reads that
scale with conversation length, and cost weights drift with provider pricing.

When no transcript is reachable the key is ABSENT and `calibrate` says so, rather
than recording a zero. A retro comparing methods should use `actual_tokens` where
it exists and say "unmeasured" where it does not — never quietly substitute the
self-reported figure.
