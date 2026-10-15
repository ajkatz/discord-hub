---
id: CO-01M50HBW4FGVWW46SFDG3SGP1B
type: co
status: active
owner: pm
title: PRD v3 -> v4 — reconcile the requirements with what shipped on 2026-10-14/15
version: 1
bumps: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@4]
---

## Change

The PRD moved from v3 to v4 (commit 144374c) so its requirements describe the live
behaviour: one `#feedback` forum per project with kind + status tags; triage silent
except the duplicate link and the thread opened from `#general`; the bot grants itself
a member overwrite; onboarding options carry a custom emoji id and `new --icon` uploads
one; the onboarding PUT carries the seven shared channels as defaults; `--no-onboarding`;
the bot reloads `hub.json`; both workflow files must parse as YAML. The REQ quote blocks
are unchanged.

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
  ISS-01M50HBV6NCCMT1TCCCYEGD1EY [draft] — bot self-overwrite — apply grants the bot a member overwrite on every category and child
  ISS-01M50HBV8MWYWE7AYH7NG7W7AX [draft] — cli --no-onboarding — plan/apply/new/init leave the onboarding prompt alone
  ISS-01M50HBVACSZN74PWSES9DYY05 [draft] — forum guidelines + announcements topic — set-topic op reconciles existing channels
  ISS-01M50HBVC51E683DF67K2RD058 [draft] — silent triage — tags are the answer; kind tags; set-tags op adds missing forum tags
  ISS-01M50HBVDXP28V5RR9AB9XYWRV [draft] — one #feedback forum per project — kind + status tags; #bug-reports removed
  ISS-01M50HBVFMAQKAMG2HEBC3AGP7 [draft] — onboarding options carry a custom emoji id — hub.json emojiId, emoji_id in the PUT
  ISS-01M50HBVHAXN1P5TN8HX0BQ8N7 [draft] — onboarding PUT carries the seven shared channels as default_channel_ids
  ISS-01M50HBVK4SF3SD203P4ADTV4D [draft] — new --icon — upload the project icon as a server emoji for the pick-list
  ISS-01M50HBVMWMACX1JZ9WTAPPRF0 [draft] — bot reloads hub.json on every channel-map refresh
  ISS-01M50HBVPQQW1P0YNM7AP6ZXZD [draft] — announce.yml — quote input descriptions; test parses both workflow files
  ISS-01M50HBVRFPJCRQBC5XV8KR7QR [draft] — docs — handoff note for provisioning from another machine
```

## Dispositions

All seven are **keep**. Each is done with a receipt against v3; nothing in v4 removes
behaviour those receipts certify except the `#bug-reports` forum, and the suites that
enumerated it were rewritten in the shipped change (now covered by the retroactive
issue for the forum merge). The v3 -> v4 deltas are specified and receipted by eleven
retroactive issues pinned to v4 (`method: retroactive`, no red receipt possible):

- ISS-01M50HBV6NCCMT1TCCCYEGD1EY — bot self-overwrite — apply grants the bot a member overwrite on every category and child
- ISS-01M50HBV8MWYWE7AYH7NG7W7AX — cli --no-onboarding — plan/apply/new/init leave the onboarding prompt alone
- ISS-01M50HBVACSZN74PWSES9DYY05 — forum guidelines + announcements topic — set-topic op reconciles existing channels
- ISS-01M50HBVC51E683DF67K2RD058 — silent triage — tags are the answer; kind tags; set-tags op adds missing forum tags
- ISS-01M50HBVDXP28V5RR9AB9XYWRV — one #feedback forum per project — kind + status tags; #bug-reports removed
- ISS-01M50HBVFMAQKAMG2HEBC3AGP7 — onboarding options carry a custom emoji id — hub.json emojiId, emoji_id in the PUT
- ISS-01M50HBVHAXN1P5TN8HX0BQ8N7 — onboarding PUT carries the seven shared channels as default_channel_ids
- ISS-01M50HBVK4SF3SD203P4ADTV4D — new --icon — upload the project icon as a server emoji for the pick-list
- ISS-01M50HBVMWMACX1JZ9WTAPPRF0 — bot reloads hub.json on every channel-map refresh
- ISS-01M50HBVPQQW1P0YNM7AP6ZXZD — announce.yml — quote input descriptions; test parses both workflow files
- ISS-01M50HBVRFPJCRQBC5XV8KR7QR — docs — handoff note for provisioning from another machine

No re-gating of the seven; their PIN-STALE marks on the map are the record that they
pre-date v4.
