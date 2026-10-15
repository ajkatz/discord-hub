---
id: DOC-design-system
type: evergreen
status: active
owner: design
title: Design system — kernel surfaces
version: 1
---

The kernel's only surfaces are CLI output and markdown. Conventions: gate output is
`GATE-VERB target: PASS|FAIL` with failures on stderr naming the DoR field; generated
files carry a first-line GENERATED banner; diagrams are Mermaid-in-markdown per the
system doc's "diagrams are documents too" convention.

## Universal defaults (all peoples)

Every product seeded from this template designs for all peoples unless the PRD's
parameters descope it against a named constraint (e.g. a plugin-hub token cap pricing
out multi-language string tables). Silence means all peoples; descoping is a recorded
trade, never an omission. Defaults: accessibility (per-state a11y notes in every design spec), internationalization from
the first commit (`locales: [all]` is the PRD default — externalized strings, RTL-safe
layouts, locale-aware formats), and European compliance (`compliance: [gdpr, eaa]` PRD
default; add eu-ai-act when the product ships AI). Law 4: adopt WCAG 2.2 / axe-core /
pseudolocalization tooling — never invent compliance in-house.
