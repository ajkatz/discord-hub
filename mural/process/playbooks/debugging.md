---
id: DOC-debugging
type: playbook
status: active
owner: eng
title: Debugging discipline (adapted from superpowers systematic-debugging)
version: 1
---

Four phases, in order — skipping a phase is the red flag itself:
1. **Reproduce** — a failing command you can run on demand. No reproduction, no debugging.
2. **Localize** — instrument at component boundaries (walls/doorways) and bisect; single
   active hypothesis at a time, written as an ASM record if it survives the session.
3. **Root-cause** — trace to the causing line/decision; "it works now" without a cause is
   a detractor, not a fix (Law 6: unexplained green is presumed wrong).
4. **Prove** — fix goes green AND the regression test runs red with the fix stashed
   (red-green-revert; receipt-grade version on the roadmap).

**Architecture tripwire:** three failed fixes on the same defect = stop patching, question
the wall placement — file a finding against borders.md instead of a fourth patch.

Rationalizations that mean you are off-process: "it's probably just…", "one more quick
try", "the test is flaky" (prove it: 5 reps), "I'll add logging later".


## Mutation proof — the runs-red equivalent for characterization tests

Red-first assumes you are FIXING something: write the failing test, prove it red,
make it pass. Tests written to CHARACTERIZE already-correct code have no red state,
so `mural red` refuses them ("acceptance already passes — the test proves nothing
new"). Correct in letter, useless in spirit: the doctrine's real goal is *this test
is not vacuous*, and characterization needs a different proof of it.

    mural mutate ISS-<id> --file <path> --replace OLD --with NEW

Breaks the code deliberately, runs the issue's acceptance, restores the file
byte-identical, and records `mutation_receipt` / `mutation_sha` /
`mutation_restored`. **A mutation that kills nothing FAILS the gate** — that is the
vacuous-test signal, and it is the whole point. `done` accepts a mutation receipt in
place of a red receipt, and uses `mutation_sha` to anchor the actuals window.

**Which proof to use:** red-first for a fix; mutation proof for characterization.
Never a green test with no evidence it can fail.

**Hazard, found by this tool failing on itself:** mutations are usually the same
LENGTH as what they replace (`a + b` -> `a - b`), and CPython invalidates bytecode on
(mtime, size) at second granularity. Mutate and restore inside one second and the
interpreter reuses the stale `.pyc` — the mutation appears to survive and the tool
reports a vacuous test that is actually fine. `mutate` purges `__pycache__` around
both writes for this reason. Any language with a build cache keyed on timestamps has
the same failure mode; if you add one, purge it there too.
