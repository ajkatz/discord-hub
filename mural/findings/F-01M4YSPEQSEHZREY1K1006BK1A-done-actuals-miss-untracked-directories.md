---
id: F-01M4YSPEQSEHZREY1K1006BK1A
type: finding
status: active
owner: pm
title: done actuals miss untracked directories — actual_files 0 on a 15-file greenfield issue
version: 1
evidence: []
invalidates: []
---
## Observation

`mural done` on the first three issues (2026-10-14) recorded `actual_files: 0`,
`actual_files_total: 15` although every write-set file was created. `git status
--porcelain` lists an untracked directory as one line (`?? src/`), so `in_writeset`
compares `src/` against `src/model.ts` and matches nothing; the committed-diff path
was empty because `done` ran before the first commit. Calibration now reads
mean|ratio-1|=0.85 for this repo on data that measures nothing.

## Suggested fix (kernel)

Expand untracked directories (`git status --porcelain --untracked-files=all`) before
the write-set match, or stage first. Belongs in ~/Development/mural (cmd_done); this
finding is the harvest pointer.
