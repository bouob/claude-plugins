---
name: itil
description: 'ITIL (Version 5) framework reference for IT service management and digital product management. This skill should be used when handling incidents, creating change requests, conducting CAB reviews, classifying priority levels, asking about ITIL v5 practices, AI governance, SRE integration, error budgets, or sustainability in IT operations. Provides Incident Management, Change Enablement, Priority Matrix, AI Governance (6C model), and SRE guidance.'
user-invocable: false
---

# ITIL (Version 5) Framework Reference

ITIL 4 guidance for IT operations workflows. Provides process definitions, classification standards, and best practices for Incident Management and Change Enablement.

## Related Skills

- **/incident** — loads this skill for severity classification and incident process
- **/change-request** — loads this skill for change types and CAB review process
- **done-ops** — verification gate for operations tasks

---

## Dual Classification: SEV (Scope) + P (Order)

Incidents are classified on two independent axes:

| Axis | Measures | Determined by | Question |
|---|---|---|---|
| **SEV** (Severity) | Objective technical **impact scope** | Impact breadth × depth | "How widespread and severe is the damage?" |
| **P** (Priority) | Subjective business **handling order** | Impact × Urgency | "What gets fixed first?" |

**Workflow:** Assign SEV first (objective), then determine P (adds business urgency context).

### Step 1 — Severity Classification (SEV1-SEV4)

SEV measures the objective scope and depth of impact:

| Level | Scope | Definition | Example |
|---|---|---|---|
| **SEV-1** Critical | All users / all regions | Core service completely down, no workaround | Production DB offline, auth service failure |
| **SEV-2** Major | Many users or major function | Significant degradation, partial workaround | Payment fails for 30% of users, single-region outage |
| **SEV-3** Minor | Subset of users, non-critical | Limited impact, workaround available | Search suggestions broken, one printer queue stuck |
| **SEV-4** Low | Single user or negligible | Cosmetic, proactive, informational | UI alignment bug, capacity threshold approaching |

### Step 2 — Priority Classification (P1-P4)

P determines the handling order by combining Impact with business Urgency:

|  | High Urgency | Medium Urgency | Low Urgency |
|---|---|---|---|
| **High Impact** | P1 — Critical | P2 — High | P3 — Medium |
| **Medium Impact** | P2 — High | P3 — Medium | P4 — Low |
| **Low Impact** | P3 — Medium | P4 — Low | P4 — Low |

| Level | Response SLA | Resolution SLA | Characteristics |
|---|---|---|---|
| **P1** Critical | 15 min | 4 hours | Immediate 24/7, Major Incident activated |
| **P2** High | 1 hour | 8-24 hours | Dedicated team, regular status updates |
| **P3** Medium | 4 hours | 3-5 business days | Queued, resolved in normal workflow |
| **P4** Low | 1 business day | Next scheduled window | Routine, batched with other work |

### SEV vs P — They Can Diverge

| Scenario | SEV | P | Why different? |
|---|---|---|---|
| Production DB down | SEV-1 | P1 | High impact + high urgency — aligned |
| Non-prod DB down | SEV-2 | P3 | High technical impact, low business urgency |
| CEO's laptop slow before board meeting | SEV-4 | P2 | Low technical impact, high business urgency |
| Capacity alert (not yet critical) | SEV-3 | P4 | Medium technical, low urgency |

For full definitions with examples and SLA guidance, see `references/priority-matrix.md`.

## Change Types (ITIL 4 Change Enablement)

| Type | Risk | CAB Required? | Example |
|---|---|---|---|
| **Standard** | Low, pre-authorized | No — pre-approved as a category | Password reset, user account creation, routine patching |
| **Normal** | Varies (Minor/Significant/Major) | Major: full CAB. Minor: Change Manager only | Server migration, application upgrade, network change |
| **Emergency** | High, time-critical | ECAB (Emergency CAB) | Hotfix for production outage, critical security patch |

## Incident Management Process

```
Detect → Log → Classify → Investigate → Resolve → Close
```

Key principles:
- Restore service as quickly as possible — resolution over root cause during active incident
- Escalate early, escalate often — better to over-communicate than under-communicate
- Document timeline in real-time, not from memory after resolution

For the full Incident Management process, roles, and escalation procedures, consult `references/incident-management.md`.

## Change Enablement Process

```
Request (RFC) → Assess → Authorize (CAB) → Implement → Review (PIR)
```

Key principles:
- The RFC is a single document that travels through the entire lifecycle
- CAB reviews the RFC itself — not a separate document
- Every Normal/Major change requires a rollback plan with estimated rollback time
- Post-Implementation Review (PIR) results are recorded back on the RFC

For the full Change Enablement process, RFC template fields, and CAB review checklist, consult `references/change-enablement.md`.

## ITIL Version History

ITIL (Version 5) released 2026-02, building on ITIL 4 (2019):
- 34 **Practices** retained — all ITIL 4 workflows remain 100% compatible
- Scope expanded from IT service management to **digital product and service management**
- Three new pillars: **AI Governance**, **Sustainability**, **UX-driven** service design
- ITIL 4 → v5 bridge certification available (no full re-certification required)

For the full v5 change summary, see `references/itil-v5-overview.md`.

## Additional Resources

### Core Process References

- **`references/incident-management.md`** — Full incident process, roles, escalation matrix, major incident procedures, AIOps integration
- **`references/change-enablement.md`** — Full change process, RFC template, CAB review checklist, risk matrix, AI/ML and GitOps change patterns
- **`references/priority-matrix.md`** — Detailed P1-P4 and SEV1-SEV4 definitions with examples and SLA guidance

### ITIL v5 Extension References

- **`references/itil-v5-overview.md`** — Complete v5 change summary, release timeline, terminology changes. Read when: user asks about ITIL v5 specifics or upgrade from v4
- **`references/ai-governance-6c.md`** — 6C AI capability model, governance requirements, ITIL v5 AI principles. Read when: handling AI system changes or AI governance questions
- **`references/sustainability.md`** — Sustainability dimensions in change decisions, ESG integration. Read when: change involves significant infrastructure or AI compute
- **`references/sre-integration.md`** — SLI/SLO/SLA definitions, error budget, blameless postmortem principles, AIOps. Read when: incident involves error budget, or user asks about SRE practices
