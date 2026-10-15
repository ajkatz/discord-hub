---
id: DOC-glossary
type: evergreen
status: active
owner: pm
title: Glossary
version: 1
---

One meaning per term. The only hand-edited shared file.

- **mural** — the shared information layer (this tree). Read/written by all agents, gated by exit codes.
- **CW (computational work)** — predicted build tokens + predicted files touched. Numeric, calibrated weekly.
- **packet** — the GENERATED briefing a worker receives: issue spec + its derives_from closure. Workers never browse.
- **bounce** — a blocking-ambiguity escalation. Must name the DoR field violated + a proposed default with reversal cost.
- **finding** — ground truth discovered downstream, flowing up with evidence. Evidence outranks tier.
- **change order (CO)** — an audible: a version bump on an upstream doc plus dispositions for its blast radius.
- **armament** — the machinery a task gets (model tier, reader count, adversary depth), selected by CW estimate + phase.
- **fog** — unresolved ambiguity. Idle time burns it: prototypes, spikes, ranked digests.
- **blueprint** — walls (module borders) + cavities (pre-routed channels for cross-cutting change) in engineering/borders.md.
- **status lifecycle** — draft → ready (via `gate ready`, script-owned) → in-progress → done (via `done`, script-owned); blocked/disputed are side states; stale/superseded are curation states. Hand-editing into ready/done is hook-blocked.
- **frontmatter subset** — flat keys only: strings, ints, one-line `[a, b]` lists (quote items containing commas). Nested maps (e.g. bounce counters) are not representable yet — tracked as a kernel limitation.
- **breadcrumb** — a stable-id event logged at a decision point documented in a flow diagram. Requirements, not debug noise: designed at spec time, shipped with the feature, testable (QA asserts paths). Emits through the telemetry cavity — the ledger here; OTel/Datadog sinks in products.
- **steward test** — would the feature still deliver its stated benefit off-by-default, described honestly in one sentence, and reversible in one step — and would an informed user turn it on? Extraction fails mechanically (it needs defaults, euphemism, or friction). Catalog + tiers: process/playbooks/stewardship.md.
- **sacred (privacy)** — mechanism non-negotiable (consent, minimization, deletion paths, zero-disk secrets); policy parametric (telemetry existence = PRD declaration with data: classification). ADR-0012.
- **lethal trifecta** — untrusted content + private data + external channel in one agent profile = exfiltration risk; no armament profile may hold all three (gate-checked invariant; the research quarantine is the canonical compliance).
- **wrong until evidenced (Law 6)** — every mechanism/estimate/belief starts presumed wrong; evidence and data flip it, nothing else does. New mechanisms ship with their falsification test as an assumption record. ADR-0013.
- **human-shaped part** — work the blueprint deliberately assigns to the human (`model: human`): same packet, gates, and receipts, delivered via the digest queue. The human is the scarcest armament tier, not a fallback. ADR-0014.
- **evidence hierarchy (Law 6)** — measured data/experiment > reproduced experience > expert judgment > anecdote/feeling; lower never overrules higher where both exist.
- **steer, never wall (ADR-0015)** — stewardship findings flag, counter-propose, and require an owned decision; they never refuse. Walls push builders off-platform where influence is zero.
- **Loki's wager (border trap)** — arguing where the neck ends means Loki keeps his head; a border is settled when the fresh-reader gate stops asking about it, disputes carry bounce budgets, and walls are versioned. 90%-right-and-movable beats perfect-and-never.
- **doorway (junction)** — the touch point where components connect is a designed component in its own right; `modules/<name>/interface.md` is its spec, the only artifact a neighbor may cite.
- **manual layer (ADR-0018)** — human-readable, Engineer-owned product documentation in manual/: accurate account of what the software does + critical things to know; zero disinformation by anchor+delta gates; humans first, machines second.
- **hypothesis loop** — hypothesizing and experimenting are encouraged and cheap: file an ASM record (with its falsification test), run a token-boxed spike, and either outcome is a win because it becomes O(1) data (validated/falsified, never vibes). Unvalidated hypotheses that gate active work get priority.
- **grep-green** — a passing check that proves nothing (string-presence tests, mirror assertions). Banned by QA falsifiability rules.
