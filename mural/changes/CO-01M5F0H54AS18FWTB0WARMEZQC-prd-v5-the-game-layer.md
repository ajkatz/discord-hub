---
id: CO-01M5F0H54AS18FWTB0WARMEZQC
type: co
status: active
owner: pm
title: PRD v4 -> v5 - the game layer above the projects (REQ-004, REQ-005, ADR-0004)
version: 1
bumps: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@5]
---
## Change

The PRD moves from v4 to v5: REQ-005 quotes Andrew's answer to OQ-1 ("B but lets call it
#wow-forever-chat"), OQ-1 is closed, and a "Games" section adds the requirements of
ADR-0004 - `games` and `gamePrompt` in hub.json, per game a role, a private category and
its chat channel, every live project naming its game, onboarding as the game question
then one plugin question per game (project options grant the project role and the game
role), the single question dropped once games exist, the old behaviour kept for a hub
without games, and `new --game`. Six acceptance items cover them. Earlier REQ quote
blocks and requirements are unchanged.

## Blast radius

```
impact of PRD-01M4YRFMPVGJJ0XENSA97NBGBW: 18 downstream doc(s)
  ISS-01M4YRK271FFV7JQGVRH31XMB5 [done] — model + planner — hub.json truth, pure diff against a guild snapshot  PIN-STALE
  ISS-01M4YRK28WWY8PXJ54M3MNX4M0 [done] — discord api seam + in-memory fake + applier — idempotent execution  PIN-STALE
  ISS-01M4YRK2AMTS9NS8QGGV8PZRCV [done] — onboarding merge — preserve ids, add/remove options, placeholder prompt id  PIN-STALE
  ISS-01M4YRK2CD4S2WNDHCEFJPFZVH [done] — cli + runbook + readme — init, new, plan, apply, archive  PIN-STALE
  ISS-01M4YS4JPD4GTYTH3BC87FY61Q [done] — triage bot — classify, tag status, acknowledge, ledger; bug threads from #general  PIN-STALE
  ISS-01M4YS4JR84N865A2GE202351A [done] — announcer — reusable push-summary workflow + caller template  PIN-STALE
  ISS-01M4YS4JT1NBYWK02Q0X4XHT4G [done] — pi deploy — systemd unit, rsync deploy script (DRY_RUN), runbook section  PIN-STALE
  ISS-01M50HBV6NCCMT1TCCCYEGD1EY [done] — bot self-overwrite — apply grants the bot a member overwrite on every category and child  PIN-STALE
  ISS-01M50HBV8MWYWE7AYH7NG7W7AX [done] — cli --no-onboarding — plan/apply/new/init leave the onboarding prompt alone  PIN-STALE
  ISS-01M50HBVACSZN74PWSES9DYY05 [done] — forum guidelines + announcements topic — set-topic op reconciles existing channels  PIN-STALE
  ISS-01M50HBVC51E683DF67K2RD058 [done] — silent triage — tags are the answer; kind tags; set-tags op adds missing forum tags  PIN-STALE
  ISS-01M50HBVDXP28V5RR9AB9XYWRV [done] — one #feedback forum per project — kind + status tags; #bug-reports removed  PIN-STALE
  ISS-01M50HBVFMAQKAMG2HEBC3AGP7 [done] — onboarding options carry a custom emoji id — hub.json emojiId, emoji_id in the PUT  PIN-STALE
  ISS-01M50HBVHAXN1P5TN8HX0BQ8N7 [done] — onboarding PUT carries the seven shared channels as default_channel_ids  PIN-STALE
  ISS-01M50HBVK4SF3SD203P4ADTV4D [done] — new --icon — upload the project icon as a server emoji for the pick-list  PIN-STALE
  ISS-01M50HBVMWMACX1JZ9WTAPPRF0 [done] — bot reloads hub.json on every channel-map refresh  PIN-STALE
  ISS-01M50HBVPQQW1P0YNM7AP6ZXZD [done] — announce.yml — quote input descriptions; test parses both workflow files  PIN-STALE
  ISS-01M50HBVRFPJCRQBC5XV8KR7QR [done] — docs — handoff note for provisioning from another machine  PIN-STALE
```

## Dispositions

- All 18: keep. Every one is done and already stale against v4; the v5 requirements add a
  layer that is absent from a hub without `games`, where their behaviour stands unchanged
  (the earlier tests are kept as the regression for it).
- New work: ISS-01M5F0H5A8A4P1HP887ZBTM53C (model, planner, onboarding prompts, applier)
  and ISS-01M5F0H5G5JP4RGQED9TAKEKSH (`new --game`, runbook, manual), both upstream of
  PRD v5.
