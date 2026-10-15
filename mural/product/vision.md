---
id: DOC-vision
type: evergreen
status: active
owner: pm
title: Vision — discord-hub
version: 2
---

One Discord server for every plugin Andrew ships (RuneLite, World of Warcraft, whatever
comes next), with a sub-community per project that members switch on themselves and
that Andrew can spawn in one command the day a new project exists.

North star: **the cost of giving a new project a community is zero.** Role, private
category, announcements, general chat, a bug-report forum, a feedback forum, the
push-announcer webhook, and the onboarding entry that lets members opt in — all from
one declarative file and one CLI call, re-runnable without damage.

Off the shelf: Discord Server Templates clone a whole server once but cannot add a
sub-community to a live one; Community Onboarding ("Channels & Roles") is the native
opt-in mechanism and is adopted as-is; discord.js / @discordjs/rest handle auth, rate
limits and typed routes and are adopted. Nothing off the shelf reconciles a declared
set of projects against a live guild, which is the whole product (see the adopt scan).
