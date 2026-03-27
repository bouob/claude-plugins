# Incident Management — ITIL 4 Reference

## Process Flow

### 1. Detection and Logging

Sources of incident detection:
- Monitoring alerts (automated)
- User-reported (service desk, email, chat)
- Proactive detection (capacity thresholds, health checks)

Every incident must be logged with:
- Unique incident ID
- Date/time of detection
- Reporter (user or system)
- Affected service(s)
- Initial description of symptoms

### 2. Classification and Prioritization

Apply the Priority Matrix (Impact x Urgency = Priority):

**Impact** — scope of disruption:
- High: entire department/organization, customer-facing service
- Medium: multiple users, degraded but functional
- Low: single user, non-critical function

**Urgency** — time sensitivity:
- High: immediate business impact, SLA at risk
- Medium: workaround available, moderate business effect
- Low: can wait for next business day/window

### 3. Investigation and Diagnosis

Structured investigation approach:
1. Confirm the symptoms — reproduce or verify the reported behavior
2. Identify the affected configuration items (CIs)
3. Check for known errors or recent changes (cross-reference with Change records)
4. Isolate the failure domain (network, application, infrastructure, third-party)
5. Form and test hypotheses

### 4. Resolution and Recovery

- Apply the fix or workaround
- Verify service is restored to normal operation
- Confirm with the reporter/affected users
- Document the resolution steps taken

### 5. Closure

Before closing an incident:
- Verify resolution with the affected party
- Ensure all documentation is complete (timeline, actions, resolution)
- Determine if a Problem record is needed (recurring incident, unknown root cause)
- Update the Knowledge Base if applicable
- Record total resolution time against SLA

---

## Roles

| Role | Responsibility |
|---|---|
| **Incident Manager** | Owns the process, coordinates resources, manages communication |
| **Service Desk** | First point of contact, logging, initial classification |
| **Technical Support (L2/L3)** | Investigation, diagnosis, resolution |
| **Major Incident Manager** | Dedicated coordination for P1/P2 incidents |
| **Communication Lead** | Stakeholder notifications, status page updates |

---

## Major Incident Procedures

A Major Incident (P1 or P2) requires elevated procedures:

### Activation Criteria
- P1: automatic activation
- P2: activation at Incident Manager's discretion

### Major Incident Process
1. **Declare** — Incident Manager declares Major Incident status
2. **Assemble** — Form a bridge/war room (virtual or physical)
3. **Communicate** — Initial notification to stakeholders within 15 minutes
4. **Investigate** — Dedicated team focuses solely on resolution
5. **Update** — Regular status updates every 15-30 minutes
6. **Resolve** — Apply fix, verify service restoration
7. **Stand down** — Formal declaration that the incident is resolved
8. **Review** — Schedule Post-Incident Review within 48 hours

### Communication Cadence (Major Incidents)

| Priority | Initial Notification | Update Frequency | Audience |
|---|---|---|---|
| P1 | Within 15 min | Every 15-30 min | Leadership, affected teams, all users |
| P2 | Within 30 min | Every 30-60 min | Affected teams, impacted users |

Always include "Next update by [time]" in every communication.

---

## Escalation Matrix

| Escalation Level | Trigger | Action |
|---|---|---|
| **Functional (horizontal)** | Current team lacks expertise | Transfer to specialized team (network, DBA, vendor) |
| **Hierarchical (vertical)** | Resolution stalled, SLA at risk | Escalate to management for resource allocation |
| **Vendor escalation** | Third-party system involved | Engage vendor support with pre-collected diagnostics |

### Escalation Timing Guidelines

| Priority | Escalate if no progress within |
|---|---|
| P1 | 30 minutes |
| P2 | 2 hours |
| P3 | 1 business day |
| P4 | 3 business days |

---

## Incident-to-Problem Handoff

Create a Problem record when:
- Root cause is unknown after resolution
- The same incident has occurred 3+ times
- A workaround was applied but no permanent fix exists
- The incident revealed a systemic weakness

The Problem record should reference:
- All related incident IDs
- Known workaround (if any)
- Suspected root cause hypothesis
- Business impact summary
