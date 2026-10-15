---
id: ISS-01M50QB7KJS0363BAHA26Q2AM1
type: issue
status: done
owner: eng
title: announcer field batch - long commit lists, empty AI summaries, file lists from git, the project's icon
version: 1
upstream: []
derives_from: []
depends: [ISS-01M50NYZ1380FBNRBGPTF4X2EP]
paths: [announcer/announce.mjs, tests/announcer.test.ts, docs/runbook.md]
acceptance: [bash tests/accept-announcer.sh]
cw_tokens: 4000
cw_files: 3
phase: breadth
model: mid
max_turns: 25
red_receipt: 12258d6432ad47df
red_time: 2026-10-15T21:32:17Z
red_sha: 7c7f94b30e5807a4edb401846ddb389c87390fcb
receipt_sha: 7c7f94b30e5807a4edb401846ddb389c87390fcb
receipt_time: 2026-10-15T21:33:08Z
receipt_tests: a31400b6bb034880
actual_files: 3
actual_files_total: 8
actual_wall_s: 14.7
---
## Contract

Andrew, 2026-10-15, looking at the first two posts after the replay
landed (screenshot): "the announcer is doing this `…and 6 more` and i
cann't expand and see more" and "the announcer should use the icon of
its app". The same screenshot shows two more defects: the replayed
ten-commit embed has NO summary paragraph although the run logged
"Generated summary via Claude", and the `.github`-only push of 541f584
was announced although the announcer is meant to stay silent on those
(locally the same payload shape is silenced, so the live push payload
must have carried no per-commit file lists).

REQ-1 The commit list spans fields. Lines go into fields of at most 1024
characters each (the first "Commits (N)", the rest "Commits
(continued)"), as many as fit under Discord's 6000-character embed total
after the summary; only when even that runs out does the last field end
with "…and N more". Line format, order, colour and footer unchanged.

REQ-2 An empty AI summary falls back. When the Claude reply carries no
text, the plain summary is used and the log says so; the embed always
has a description.

REQ-3 Changed files come from git when the payload has none. When no
commit in the payload lists added/modified/removed files, the announcer
takes `git diff --name-only before..after` from the checked-out
workspace (fetch-depth 0 is already there), so the CI-only silence and
the feature-registry diff work on every push. The silence log line names
the file count.

REQ-4 The post wears the project's icon. `avatar_url` is
PROJECT_ICON_URL when the workflow passes one (new optional input
`project_icon_url`), else the repo's own `icon.png` at the announced
commit (raw.githubusercontent.com/<repo>/<after>/icon.png) when git says
the file exists there; otherwise no avatar is sent. The hub plugins all
carry icon.png at the root.

## Acceptance

- tests/announcer.test.ts: twelve long commits -> every short sha across
  the "Commits" fields, each field at most 1024 characters, no "…and N
  more", embed under 6000 characters; nine-and-under still one field.
- A fake Anthropic endpoint (ANTHROPIC_BASE_URL) returning no text ->
  the description is the plain summary.
- A push payload whose commits carry no file lists: a `.github`-only
  range posts nothing; a code range posts and spots the added feature.
- A workspace with icon.png at the announced commit -> avatar_url is the
  raw URL for that commit; without it -> no avatar_url.
- bash tests/accept-announcer.sh green.
