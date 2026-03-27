# sysadmin-skills

[繁體中文](README.zh-TW.md)

ITIL 4-based IT operations skills for system administrators — incident response, change management with CAB review, and status communication.

## Features

| Skill | Type | Description |
|---|---|---|
| `/incident` | Workflow | Full incident response lifecycle: detect, classify, investigate, resolve, communicate |
| `/change-request` | Workflow | ITIL change request (RFC) with risk assessment, rollback plan, and CAB review checklist |
| `/statuspage` | Workflow | Status page updates for incidents and maintenance (Atlassian Statuspage / Instatus compatible) |
| `itil` | Methodology | ITIL 4 framework reference: Priority Matrix, Incident Management, Change Enablement |
| `comms` | Methodology | Stakeholder communication templates with severity-based tone guidance |
| `done-ops` | Methodology | Operations verification gate — evidence before claims |

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
```

Methodology skills (`itil`, `comms`, `done-ops`) are auto-loaded by workflow skills — no need to invoke them directly.

## Output

All skills produce local markdown files:

| Skill | Output Directory | Filename Pattern |
|---|---|---|
| `/incident` | `./incidents/` | `incident-YYYY-MM-DD-slug.md` |
| `/change-request` | `./changes/` | `change-request-YYYY-MM-DD-slug.md` |
| `/statuspage` | `./statuspage/` | `statuspage-YYYY-MM-DD-slug.md` |

If a `docs/{type}/` directory exists in the project, skills use that instead.

## Architecture

Two-layer skill architecture:

- **Workflow Skills** — user-invocable step-by-step processes
- **Methodology Skills** — auto-loaded domain knowledge (ITIL 4, communication patterns)

Methodology skills use progressive disclosure: SKILL.md stays lean (~500 words), detailed content lives in `references/` and is loaded only when needed.

## License

MIT
