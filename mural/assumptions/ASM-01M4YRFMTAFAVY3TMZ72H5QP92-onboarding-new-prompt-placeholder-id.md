---
id: ASM-01M4YRFMTAFAVY3TMZ72H5QP92
type: asm
status: validated
owner: pm
title: New onboarding prompts accept a placeholder id and new options accept no id
version: 2
---
## Assumption

`PUT /guilds/{id}/onboarding` accepts a NEW prompt whose `id` is a client-chosen
placeholder snowflake-shaped string (unique within the request) and reassigns a real
id; a NEW option may omit `id` entirely (discord-api-types marks prompt `id` required
and option `id` optional; Discord's docs say nothing about placeholders). Existing
prompts and options keep their ids when echoed back unchanged.

Confidence: medium. Cost if wrong: the onboarding step fails with a 400 on first live
run; nothing else is affected.

## Validation plan

`gate ready --live` on the onboarding issue runs `discord-hub apply` against the real
guild: first run must create the prompt + option (200), second run must be a no-op.
If Discord rejects the placeholder, fall back to creating the prompt empty via the UI
(runbook step) and only ever appending options; record the result on this ASM.

## Result (2026-10-14, live guild 1524847121562468514)

VALIDATED. First `apply` PUT a new prompt with a Date.now() placeholder id and two
id-less options: 200. Read-back shows Discord-assigned snowflakes for the prompt and
both options; the second `plan` is a no-op. The prompt appeared in Server Settings ->
Onboarding -> Customization Questions as "Question 1" with both answers and emoji.
