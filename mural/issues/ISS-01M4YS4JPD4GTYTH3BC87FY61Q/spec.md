---
id: ISS-01M4YS4JPD4GTYTH3BC87FY61Q
type: issue
status: done
owner: eng
title: triage bot — classify, tag status, acknowledge, ledger; bug threads from #general
version: 1
upstream: [PRD-01M4YRFMPVGJJ0XENSA97NBGBW@3]
derives_from: []
depends: [ISS-01M4YRK271FFV7JQGVRH31XMB5, ISS-01M4YRK28WWY8PXJ54M3MNX4M0]
paths: [src/bot, tests/triage.test.ts, tests/ledger.test.ts, tests/channels.test.ts, tests/accept-triage.sh, package.json]
acceptance: [bash tests/accept-triage.sh]
cw_tokens: 14000
cw_files: 9
phase: breadth
model: mid
max_turns: 25
red_receipt: b5c2771f076a7edd
red_time: 2026-10-15T03:23:35Z
red_sha: 1e8b554a19636b5ce2c760981fe85f3f4a908cfe
receipt_sha: 1e8b554a19636b5ce2c760981fe85f3f4a908cfe
receipt_time: 2026-10-15T03:28:35Z
receipt_tests: deb5a77825a9af38
actual_files: 1
actual_files_total: 30
actual_wall_s: 0.7
---
## Contract

`src/bot/types.ts` (NEW): `Classification { kind: bug|feature|question|praise|other,
summary (<=100 chars), severity: low|medium|high|null, confidence: low|medium|high,
duplicateOf: threadId|null, rationale }`; `ClassifyInput { project: slug, channelKind:
bug-reports|feedback|general, title, body, author, openRecords: TriageRecord[] }`;
`Classifier { classify(input): Promise<Classification> }`; `TriageRecord { ts, project,
channelId, threadId|null, messageId, kind, status, summary, rationale, duplicateOf|null,
model }` where status is one of acknowledged|known|not-an-issue|in-progress|fixed|
needs-info|unclassified|planned|declined; `Decision { tags: string[], reply: string|null,
createBugThread: { title, body }|null, record: TriageRecord }`.

`src/bot/triage.ts` (NEW): `decide(input, classification | Error, now) -> Decision`, pure.
bug-reports thread: bug+duplicateOf -> tags [known], reply links `<#duplicateOf>`;
bug (new) -> [acknowledged]; question/praise/other/feature -> [not-an-issue], reply
explains (feature requests are pointed to #feedback). feedback thread: [kindTag,
acknowledged] where kindTag in idea(feature)|question|praise, else [acknowledged].
general message: kind bug AND confidence high -> createBugThread { title: summary,
body: quoted message + author mention }, tags [acknowledged], reply = link
placeholder `{thread}`; otherwise tags [], reply null, record null (nothing to track). Error ->
tags [], reply null, status unclassified, rationale = error message. Replies are
first-person singular, <=2 sentences, state the rationale, no exclamation marks.

`src/bot/ledger.ts` (NEW): `Ledger(path)` with `append(record)`, `all()`,
`open(project)` (latest record per threadId whose status is acknowledged|known|
in-progress|needs-info, newest first, max 50), `setStatus(threadId, status)` (appends a status-change record; the
ledger is append-only). Creates the file and parent dir on first append.

`src/bot/channels.ts` (NEW): `buildChannelMap(hub, snapshot) -> Map<channelId, { slug,
kind: bug-reports|feedback|general|announcements }>` from each live project's category
children by name, plus `tagIdsFor(forumTags: {id,name}[], names) -> ids` (case-insensitive,
unknown names skipped).

`src/bot/classifier.ts` (NEW): `ClaudeClassifier(model = claude-opus-5-5)` using
`client.beta.messages.parse` with `zodOutputFormat`, `output_config.effort low`,
`fallbacks: "default"` + beta `server-side-fallback-2026-07-01`; a `refusal` stop reason
or null parsed_output throws. System prompt lists the project, channel kind, and the
open records (id + summary) for duplicate detection. Not unit-tested (network).

`src/bot/index.ts` (NEW): discord.js Client (Guilds, GuildMessages, MessageContent).
On ready: load hub.json, snapshot via RestDiscordApi, build the channel map. threadCreate
(newlyCreated, parent in map as bug-reports|feedback) -> starter message -> classify ->
decide -> setAppliedTags -> reply -> ledger. messageCreate (author not bot, channel in
map as general, not a thread) -> classify -> decide -> forum.threads.create + reply with
link -> ledger. threadUpdate with changed appliedTags by a non-bot -> ledger.setStatus.
Thin shell, not unit-tested; QA note in mural/qa.

Tests: tests/triage.test.ts (every decide branch above), tests/ledger.test.ts (tmp
file, open() filter + order, setStatus), tests/channels.test.ts (map from
fullSnapshot, archived excluded, tag id resolution). `tests/accept-triage.sh` runs them.
