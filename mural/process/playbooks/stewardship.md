---
id: DOC-stewardship
type: playbook
status: active
owner: pm
title: Stewardship — pro-revenue, anti-extraction
version: 1
---

**The line:** revenue may scale with value delivered; never with user confusion, exit
friction, or captured attention beyond the user's task.

**The steward test (critic answers per feature, with artifacts):** would this feature
still achieve its stated user benefit if it were off by default, described honestly in
one sentence, and reversible in one step — and what evidence says an informed user would
turn it on?

## Tier-1 — strongest steer: never silently shipped, never walled (ADR-0015)

hidden subscription · roach-motel cancellation · fake urgency · fake scarcity ·
fake social proof · confirmshaming · preselected consent · hidden costs at checkout ·
trick wording on consent/purchase · currency confusion

Every tier-1 finding arrives with a concrete ethical counter-proposal attached; resolution
is the owner's own-words decision with a re-review date. Rationale (Andrew): walls select
for people willing to modify the tool — steering keeps them in-platform where defaults,
alternatives, and evidence still have influence.

## Tier-2 — critic differentiates ("IS / IS NOT pattern X"), max 3 ranked flags per PRD, routed to the user

nagging · obstruction · visual interference · disguised ads · comparison prevention ·
forced action · sneaking · addictive-design composites (streak + push + loss-framing)

## Mechanical symmetry rules (exit-code shaped; adopted from CCPA/CARL/EDPB)

- cancellation steps <= signup steps
- opt-out steps <= opt-in steps
- no button-prominence asymmetry on consent
- closing a dialog is never consent

## Allowed revenue mechanics

disclosed paywalls and tiers · usage-based pricing · upsells at task boundaries ·
clearly-labeled promotions. Test: what does the revenue grow WITH?

## Anti-theater instrumentation (Law 5 on the charter itself)

- benefit traces: segment + behavior change + measurement + counterfactual; blind swap test
- metrics: whitelist binds formulas not names; Goodhart scenario forces countermetrics
- decisions: owner-authored cost statement, re-review date, rolling budget (all tiers — steering instrumented, not enforced)
- canary suite: known-dark specs injected through the real pipeline; catch-rate drop fails pipeline CI
- portfolio review: composite catalog entries evaluated against the live-feature interaction graph
- catalog: versioned, externally fed (regulator actions, deceptive.design registry); a missed
  pattern becomes an entry before its incident closes

Sources: deceptive.design taxonomy (18 types) · EDPB Guidelines 03/2022 · CCPA regs +
CARL symmetry rules · Colorado catch-all definition · OECD dark-commercial-patterns sweep
method · DSA Art. 25 enforcement (X, €120M, 2025) · FTC ROSCA (Amazon, $2.5B, 2025).
