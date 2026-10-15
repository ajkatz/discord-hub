---
id: ISS-01M4YRK2AMTS9NS8QGGV8PZRCV
type: issue
status: draft
owner: eng
title: onboarding merge — preserve ids, add/remove options, placeholder prompt id
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@1]
derives_from: []
depends: [ISS-01M4YRK271FFV7JQGVRH31XMB5]
paths: [src/onboarding.ts, tests/onboarding.test.ts, tests/accept-onboarding.sh, mural/assumptions/ASM-01M4YRFMTAFAVY3TMZ72H5QP92-onboarding-new-prompt-placeholder-id.md]
acceptance: [bash tests/accept-onboarding.sh]
cw_tokens: 5000
cw_files: 4
phase: breadth
model: mid
max_turns: 25
---
## Contract

`src/onboarding.ts` (NEW): `mergeOnboarding(current: SnapOnboarding, promptTitle,
desired: DesiredOption[], newPromptId?: string) -> OnboardingPutPrompt[] | null`.
`DesiredOption { title, emoji?, description?, roleIds, channelIds }`. Finds the prompt
whose title matches (case-insensitive). Returns null when that prompt exists and its
options equal `desired` by title with identical roleIds and channelIds (order-insensitive)
and nothing extra. Otherwise returns the FULL prompts array to PUT: every other prompt
echoed verbatim; the target prompt rebuilt with `type 0`, `single_select false`,
`required false`, `in_onboarding true`, options in `desired` order, each existing option
(matched by title) keeping its id, new options carrying no id, options absent from
`desired` dropped. A missing prompt is created with `newPromptId` (default: a
Date.now()-based string) per ASM-01M4YRFMTAFAVY3TMZ72H5QP92, which the live gate
validates. Emoji is passed as `emoji_name` (unicode) only.

Tests (tests/onboarding.test.ts): no prompt -> created with placeholder id and id-less
options; foreign option + new option -> both present, foreign id preserved; in sync ->
null; option removed from desired -> gone. `tests/accept-onboarding.sh` runs them.
