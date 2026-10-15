<!-- GENERATED packet for ISS-01M50QB7KJS0363BAHA26Q2AM1 — the worker's entire briefing -->
<!-- source-hash: 7dc5c30515fc224d -->
# Packet: announcer commit list spans fields instead of cutting to "and N more"

## Contract of record (from frontmatter — the enforced envelope)

- write-set manifest (only paths you may touch): announcer/announce.mjs (EXISTS — modify only if the contract says so), tests/announcer.test.ts (EXISTS — modify only if the contract says so)
- acceptance commands (must exit 0 for done): ['bash tests/accept-announcer.sh']
- upstream pins: []  |  depends: ['ISS-01M50NYZ1380FBNRBGPTF4X2EP']
- budget: model=mid max_turns=25 cw_tokens=3000 cw_files=2 phase=breadth
- report exactly one status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED — proof lives in receipts, not your report.
- if any decision is not answerable from this packet: write blocked.md with the question + a proposed default, and stop.

## Task
## Contract

Andrew, 2026-10-15, on the first replayed post (Loadout Lab 0.5.4, ten
commits): "the announcer is doing this `…and 6 more` and i cann't expand
and see more". The commit list is ONE embed field capped near Discord's
1024-character field limit; a linked line costs about 120 characters, so
a release of more than eight commits loses the rest with no way to see
them.

REQ-1 The commit list spans fields. Lines go into fields of at most 1024
characters each (the first named "Commits (N)", the rest "Commits
(continued)"), as many as fit under Discord's 6000-character embed total
after the summary and the features field, so a ten-commit release lists
all ten. Only when even that runs out does the last field end with
"…and N more".

REQ-2 Nothing else changes: line format, newest first, the features
field, the colour, the footer.

## Acceptance

- tests/announcer.test.ts: given a replay of twelve commits with long
  subjects, then every short sha appears across the "Commits" fields, no
  field exceeds 1024 characters, and no "…and N more" is posted.
- The nine-and-under cases still produce a single "Commits (N)" field.
- bash tests/accept-announcer.sh green.
