# sysadmin-skills

[繁體中文](README.zh-TW.md)

ITIL v5-aligned IT operations skills for system administrators — incident response, change management with CAB review, AI governance, SRE-style postmortems, and problem management.

## Skills

### Workflow Skills (user-invocable)

| Skill | Description |
|---|---|
| `/incident` | Full incident response lifecycle: detect, classify, investigate, resolve, communicate, close. Supports SRE error budget context and AIOps-detected incidents. |
| `/change-request` | ITIL change request (RFC) with risk assessment, rollback plan, CAB review checklist, AI/ML change guidance, and GitOps patterns. |
| `/statuspage` | Status page updates for incidents and maintenance (Atlassian Statuspage / Instatus compatible). |
| `/problem` | Problem Management: root cause analysis (5 Whys / Fishbone / Pareto), Known Error Database registration, and permanent fix tracking. |
| `/postmortem` | Blameless post-incident review following Google SRE culture. Focuses on systemic contributing factors, what went well, and SMART action items. |
| `/ai-change` | AI/ML system change request with ITIL v5 AI Governance (6C model), bias/fairness assessment, explainability requirements, and AI-specific rollback. |

### Methodology Skills (auto-loaded)

| Skill | Description |
|---|---|
| `itil` | ITIL (Version 5) framework reference: Priority Matrix, Incident Management, Change Enablement, AI Governance (6C model), and SRE integration. |
| `comms` | Stakeholder communication templates with severity-based tone guidance. |
| `done-ops` | Operations verification gate — evidence before claims. Includes SLO compliance check. |

## Installation

```bash
# From marketplace
/plugin marketplace add bouob/sysadmin-skills

# Local development
claude --plugin-dir ./sysadmin-skills
```

## Usage

```
/incident Email service is not sending outbound messages since 09:15
/change-request Upgrade Exchange Server 2019 to 2022
/statuspage VPN service experiencing intermittent connectivity issues
/problem VPN drops every Monday morning — 4th occurrence this month
/postmortem Payment service P1 outage resolved — blameless review needed
/ai-change Upgrade customer service chatbot from Claude 3.5 to Claude Sonnet 4.6
```

Methodology skills (`itil`, `comms`, `done-ops`) are auto-loaded by workflow skills — no need to invoke them directly.

## Output

All skills produce local markdown files:

| Skill | Output Directory | Filename Pattern |
|---|---|---|
| `/incident` | `./incidents/` | `incident-YYYY-MM-DD-slug.md` |
| `/change-request` | `./changes/` | `change-request-YYYY-MM-DD-slug.md` |
| `/statuspage` | `./statuspage/` | `statuspage-YYYY-MM-DD-slug.md` |
| `/problem` | `./problems/` | `problem-YYYY-MM-DD-slug.md` |
| `/postmortem` | `./postmortems/` | `postmortem-YYYY-MM-DD-slug.md` |
| `/ai-change` | `./changes/ai/` | `ai-change-YYYY-MM-DD-slug.md` |

If a `docs/{type}/` directory exists in the project, skills use that instead.

## Architecture

Three-layer architecture:

- **Workflow Skills** — user-invocable step-by-step processes
- **Methodology Skills** — auto-loaded domain knowledge (ITIL v5, SRE, communication patterns)
- **Reference Files** — deep content loaded on demand (`references/` per skill)

Reference files follow progressive disclosure: SKILL.md stays lean, detailed content lives in `references/` and is loaded only when needed.

### Shared References (in `itil/references/`)

| File | Shared By |
|---|---|
| `itil-v5-overview.md` | All skills — ITIL v5 changes, terminology |
| `ai-governance-6c.md` | `/change-request`, `/ai-change`, `/incident` |
| `sre-integration.md` | `/incident`, `/postmortem`, `/change-request` |
| `sustainability.md` | `/change-request`, `/ai-change` |
| `incident-management.md` | `/incident` — full process, AIOps, SLO integration |
| `change-enablement.md` | `/change-request` — full process, AI/ML, GitOps patterns |
| `priority-matrix.md` | `/incident` — P1-P4 and SEV1-SEV4 with examples |

## ITIL v5 Alignment

This plugin aligns with **ITIL (Version 5)** released February 2026:

- All 34 ITIL 4 practices retained — existing workflows are 100% compatible
- AI Governance (6C model) integrated into change and incident management
- SRE practices (error budget, blameless postmortem) bridged with ITIL processes
- Sustainability dimension added to change risk assessment

ITIL 4 users: no workflow changes required. New capabilities are additive.

## License

MIT
