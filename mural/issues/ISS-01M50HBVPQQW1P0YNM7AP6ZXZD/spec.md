---
id: ISS-01M50HBVPQQW1P0YNM7AP6ZXZD
type: issue
status: done
owner: eng
title: announce.yml — quote input descriptions; test parses both workflow files
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@4]
derives_from: []
depends: [ISS-01M4YS4JR84N865A2GE202351A]
paths: [.github/workflows/announce.yml, tests/announcer.test.ts, package.json, package-lock.json]
acceptance: [bash tests/accept-announcer.sh]
cw_tokens: 2000
cw_files: 4
phase: finish
model: mid
max_turns: 25
method: retroactive
shipped_sha: [1c7ce08d6862c5a468c4838426a94c4f1cc0c642, 4330920b774d3d21ba1462a6dba54d877d6dda1a]
shipped_time: 2026-10-15T18:53:01Z
receipt_sha: a9481df1942a09dc52bf42daa6d1f980c41931ce
receipt_time: 2026-10-15T19:43:13Z
receipt_tests: ecf93feb79e2c968
actual_files: -1
actual_files_total: -1
actual_wall_s: 0.7
---

## Contract

Shipped 2026-10-15 (commits 1c7ce08, 4330920). The `project_name` input's description
read `(default: the repo name)` unquoted; the colon made `announce.yml` invalid YAML,
so every caller's push-to-main run failed ("workflow was not found" / invalid
workflow). PR CI never showed it because the caller only triggers on push to main.

`.github/workflows/announce.yml`: the five `description:` strings under
`workflow_call.inputs` and `workflow_call.secrets` are double-quoted (the backticks
around `discord-hub new` dropped). No input, secret or step changes.

`package.json`: devDependency `yaml ^2.9.1` (package-lock.json updated).

`tests/announcer.test.ts`: "both workflow files parse as YAML (an unquoted colon in a
description broke every caller once)" — parses `.github/workflows/announce.yml` and
`templates/discord-announce.yml` with the `yaml` package (the first version shelled out
to python3 PyYAML; replaced within the minute so the suite has no system-Python
dependency) and asserts the `workflow_call.inputs` keys are exactly `project_name`,
`project_description`, `hub_ref`.
