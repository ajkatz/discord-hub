---
id: DOC-armament
type: playbook
status: active
owner: pm
title: Armament table — the estimate picks the suit of armor
version: 1
---

The chain is never skipped; the depth of each link scales. Tuned by the calibration loop.

| cw_tokens | phase | worker model | thinking | fresh readers | adversaries | QA counter-examples | fan-out | max_turns |
|---|---|---|---|---|---|---|---|---|
| < 4k | breadth | small | low | 1 | 0 | 1 | yes | 12 |
| 4k–20k | breadth | mid | medium | 1 | 1 critic | 1 | yes | 25 |
| 20k–60k | breadth | frontier | high | 2 | 1 critic | 2 | yes | 40 |
| any | finish | frontier | max | 2 | refuter panel (3) | 3 | no — single owner | 60 |

Thinking is a dial independent of model, and decision class overrides issue size in both
directions: mural lookups run low-thinking regardless of issue size (speed is a feature);
architectural artifacts — ADRs, borders.md walls and cavities, interface contracts — run
max regardless. Thinking scales with the cost of being wrong, not the size of the task.

Nobody powers up a nuclear plant to move a button.

`model: human` is a valid route and the scarcest tier of all: same gates and receipts,
delivered through the digest queue. Spend it only where nothing substitutes — taste,
authority, accountability, the physical world (ADR-0014). Full automation is a non-goal.

## Process targets (tuned, not constant — ADR-0007)

| metric | warn | kill | adjusted by |
|---|---|---|---|
| coordination:build token ratio | 1.5:1 (seed prior) | 2.5:1 (seed prior) | FITTED from the ledger distribution — control-limit stats at small n, learned model when n earns it (ADR-0017); refits recorded as calibration ADRs |

## Fix-loop convergence (adapted from superpowers SDD)

Adversary/worker fix loops are bounded: **5 rounds, then forced adjudication** (park with
a recorded ruling — silent discards forbidden; every finding gets ADDRESSED / NOT / PARKED
with a reason). Rounds 1-3 resume the same worker; rounds 4-5 dispatch a fresh worker one
armament tier up (the escalation rung). Scoped re-reviews only: new findings on untouched
code go to the ledger, never into the running loop. Worker return contract: DONE |
DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED — proof lives in receipts, not reports.
