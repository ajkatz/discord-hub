<!-- GENERATED packet for ISS-01M5EZHEM8H09W2WFTB1SB48R3 — the worker's entire briefing -->
<!-- source-hash: 7440d5dd261feb60 -->
# Packet: announcer avatar falls back to the project's hub emoji

## Contract of record (from frontmatter — the enforced envelope)

- write-set manifest (only paths you may touch): announcer/announce.mjs (EXISTS — modify only if the contract says so), tests/announcer.test.ts (EXISTS — modify only if the contract says so), docs/runbook.md (EXISTS — modify only if the contract says so)
- acceptance commands (must exit 0 for done): ['bash tests/accept-announcer.sh']
- upstream pins: []  |  depends: ['ISS-01M50QB7KJS0363BAHA26Q2AM1']
- budget: model=small max_turns=12 cw_tokens=3000 cw_files=3 phase=breadth
- report exactly one status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED — proof lives in receipts, not your report.
- if any decision is not answerable from this packet: write blocked.md with the question + a proposed default, and stop.

## Task
## Contract

Andrew, 2026-10-21: "announcements for forever addons aren't announcing
with the icon as the avatar".

Cause: ISS-01M50QB7KJS0363BAHA26Q2AM1 REQ-4 dresses the post in the repo's
`icon.png` at the announced commit and assumed "the hub plugins all carry
icon.png at the root". The RuneLite plugins do (the Plugin Hub requires
it); the WoW: Forever addons carry the game's `icon.tga` and no PNG, so
their posts go out with Discord's default avatar. Each project's picture
already lives on the server as its custom emoji (`emojiId` in hub.json,
the icon of its Channels & Roles option).

REQ-1 The avatar falls back to the project's hub emoji. When neither
PROJECT_ICON_URL nor an `icon.png` at the announced commit gives an
avatar, the announcer reads hub.json - by default the one at the root of
its own checkout (`../hub.json` beside `announcer/`; `HUB_JSON` overrides
the path) - finds the project whose `repo` equals the announced
repository's full name (case-insensitive) and, when that project carries
an `emojiId`, sets `avatar_url` to
`https://cdn.discordapp.com/emojis/<emojiId>.png`. No such project, no
emojiId, or a hub.json that is missing or unreadable: no avatar, and the
post still goes out. The order is PROJECT_ICON_URL, icon.png, hub emoji,
nothing. Everything else about the post is unchanged.

## Acceptance

- tests/announcer.test.ts: with HUB_JSON naming a hub whose project has
  repo `akaddons/DEMO` and emojiId `1234` -> avatar_url is
  `https://cdn.discordapp.com/emojis/1234.png`; the same hub with an
  icon.png at the announced commit -> the icon.png URL; a hub without the
  project, and a HUB_JSON path that does not exist -> no avatar_url, the
  post still sent.
- bash tests/accept-announcer.sh green.
- docs/runbook.md names the new fallback.
