---
id: DOC-security
type: playbook
status: active
owner: pm
title: Security playbook — sacred privacy, defended org (standards pinned 2026-08)
version: 1
---

**Sacred, precisely:** mechanism non-negotiable (consent design, minimization, retention
limits, deletion paths as cavities, zero-disk secrets); policy parametric (telemetry
existence = per-project PRD declaration with `data:` classification — ADR-0012).

## Standards adopted (verified current, 2026-08-20 scan)

| Standard | Version/state | Role in Mural |
|---|---|---|
| OWASP ASVS | 5.0.0 (May 2025) | L1 = default security cavity checklist; L2 where data is sacred; CSV export = checked-in gate artifact |
| LINDDUN | GO/PRO/MAESTRO, refreshed KB + 2026 GenAI ext | threats.md per data-touching feature; 7 categories, zero unresolved = gate; PRO via armament |
| OWASP GenAI LLM Top 10 | 2026 (2026-08-04, incident-weighted) | user-side checklist spine |
| OWASP Agentic Top 10 | ASI01-ASI10 (2025-12-09) | producer-side checklist — the org IS an agentic app |
| SLSA | v1.2 — Build L2 + Source L2 target | supply chain; Source L4 two-party review = hat-separation merge rule |
| NIST SSDF | v1.1 + 800-218A GenAI profile (v1.2 draft — re-map at final) | practice-to-gate mapping table |
| EU CRA | Art. 14 reporting binds 2026-09-11; Annex I 2027-12-11 | runbook required BEFORE any commercial EU ship |
| EDPB | Guidelines 4/2019 v2.0 by-default elements | privacy-by-default gate rows (GDPR Art. 25 demonstrability) |
| NIST AI 600-1 | final 2024-07; COSAiS multi-agent overlay: adopt when final | agent-org risk categories |

## Gates (all exit codes)

- gitleaks (per-commit, maintenance mode — paired with) trufflehog v3 --only-verified (weekly sweep)
- osv-scanner v2.3.x on every lockfile diff + scheduled SBOM scan
- semgrep ci with pinned ruleset — SET STRICT/ERROR FLAGS: internal errors exit 0 by default (a broken scan must not read as a pass)
- invisible/bidi unicode scan on every artifact + diff (Rules-File-Backdoor class; extends checkGlyphs)
- **Lethal-trifecta invariant:** no armament profile grants one agent untrusted-content ingestion + private-data access + an external channel. Research quarantine = canonical compliance. Statically checkable over profile definitions.
- **MCP servers are dependencies:** adopt-scan required; official registry namespaces only; tool-description hashes pinned at adoption, drift = gate failure (rug-pull defense)
- **Slopsquatting controls:** agent-proposed packages never auto-install; must exist in lockfile OR pass registry-age (>90d) + download thresholds; internal-namespace collision check
- Secrets: never on disk agent-visible; broker/runtime injection; ignore-files are defense-in-depth only

## Deliberately not adopted

Prompt-injection filters as primary defense (adaptive bypass >90% in 2026 — architecture,
not classifiers). SAMM as a gate source (it measures process; quarterly self-assessment
only). Stale citations to ASVS 4.x, SLSA v0.1/"SLSA 4", NIST Privacy Framework 1.1 (still
draft), OWASP LLM Top 10 2025 (superseded 2026-08-04).
