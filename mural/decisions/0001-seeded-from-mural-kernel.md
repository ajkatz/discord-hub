---
id: ADR-0001
type: adr
status: active
owner: user
title: discord-hub seeded from the mural kernel template
version: 1
---

## Context

discord-hub is a Mural-managed project seeded by `mural seed` on the voice-mirror founding
pattern. Platform doctrine lives in the kernel (~/Development/mural, ADRs 0001+).

## Decision

Platform ADRs are inherited by reference, never copied; this repo's decisions start here
and cover discord-hub only.

## Considered options

(a) inherit by reference — chosen; (b) copy platform ADRs — duplicated truth drifts.

## Consequences

Kernel changes propagate by deliberate re-seed decisions, recorded here when taken.
