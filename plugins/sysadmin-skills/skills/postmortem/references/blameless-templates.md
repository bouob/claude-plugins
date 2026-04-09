# Blameless Postmortem Templates

Three templates scaled by incident severity and team capacity. Choose based on the incident's severity and the depth of learning needed.

---

## Template Selection Guide

| Template | When to Use | Time to Complete |
|---|---|---|
| **Short** | SEV-3, low impact, simple timeline | 30–45 min |
| **Standard** | SEV-2, moderate impact, multiple contributing factors | 1–2 hours |
| **Deep-Dive** | SEV-1, high impact, complex systemic factors, company-wide audience | 3–4 hours |

---

## Blameless Language Rules

Before writing any template, internalize these substitutions:

| Instead of... | Write... |
|---|---|
| "He forgot to check..." | "The runbook did not include a step to check..." |
| "She didn't notice the alert" | "The alert was set below the level where it would page the on-call" |
| "They should have known..." | "The documentation didn't cover this scenario" |
| "Human error" | "The system allowed the invalid state to propagate" |
| "Developer mistake" | "The CI pipeline did not catch this class of error" |
| "Operator error" | "The deployment procedure did not have a validation step" |
| "[Name] caused the outage" | "The deploy introduced a breaking change that..." |

When in doubt: **describe what the system did, not what a person did wrong.**

---

## Short Template (SEV-3)

```markdown
# Postmortem: {TITLE}

**Date:** {YYYY-MM-DD} | **Duration:** {N} minutes | **Severity:** SEV-3
**Incident ID:** {INC-ID} | **Services:** {service name(s)}

## What Happened

{2–3 sentences: what failed, for how long, user impact.}

## Timeline

| Time | Event |
|---|---|
| {HH:MM} | {Event} |
| {HH:MM} | {Event} |

## Contributing Factors

- {System/process condition that made this possible}
- {Another contributing factor}

## What Went Well

- {Something that worked — detection, response, communication, tooling}

## Action Items

| Action | Owner (Role) | Due |
|---|---|---|
| {Specific, measurable fix} | {Team/role} | {YYYY-MM-DD} |
```

---

## Standard Template (SEV-2)

```markdown
# Postmortem: {TITLE}

| Field | Value |
|---|---|
| Date | {YYYY-MM-DD} |
| Duration | {HH:MM} – {HH:MM} ({TZ}) — {N} minutes |
| Severity | SEV-2 |
| Incident ID | {INC-ID or "N/A"} |
| Services Affected | {List} |
| User Impact | {Estimated users / transactions / revenue} |
| Status | Draft / Published |

## Summary

{3–4 sentences. What failed, how it was detected, how it was resolved, total impact. Written for an audience who was not involved in the incident.}

## Timeline

| Time (UTC) | Event |
|---|---|
| {HH:MM} | {Neutral event description} |
| {HH:MM} | {Next event} |

## Contributing Factors

Factors that made this failure possible. Each factor is a system or process condition, not a personal action.

- **{Category}**: {Factor description}
- **{Category}**: {Factor description}

Common categories: Deployment process, Monitoring coverage, Runbook completeness, Testing gaps, Configuration management, Communication process.

## What Went Well

Things that worked as intended and helped limit impact or speed recovery:

- {Specific thing that went well and why it helped}
- {Another win}

## What Could Be Improved

Opportunities to detect sooner, prevent, or limit impact:

- {Observation about a gap, framed as a system/process issue}

## Action Items

Each item must be specific, measurable, owned, and time-bounded.

| Action | Owner (Role) | Due Date | Linked Ticket |
|---|---|---|---|
| {Specific, verifiable action} | {Role} | {YYYY-MM-DD} | {Issue URL or N/A} |

## Appendix

{Optional: relevant graphs, error logs, screenshots.}
```

---

## Deep-Dive Template (SEV-1)

```markdown
# Postmortem: {TITLE}

| Field | Value |
|---|---|
| Date | {YYYY-MM-DD} |
| Duration | {HH:MM} – {HH:MM} ({TZ}) — {N} minutes |
| Severity | SEV-1 |
| Incident ID | {INC-ID} |
| Services Affected | {Full list with downstream impacts} |
| User Impact | {Quantified: users, transactions, revenue, SLA status} |
| Error Budget Impact | {Minutes burned / % of monthly budget} |
| Status | Draft → Under Review → Published |
| Next Review Date | {Date for action item check-in} |

## Executive Summary

{4–6 sentences for a leadership audience. What broke, for how long, customer impact, how it was fixed, and key takeaways. No technical jargon. No blame.}

## Technical Summary

{4–6 sentences for an engineering audience. Root cause, affected systems, detection method, resolution steps.}

## Detailed Timeline

| Time (UTC) | Event | Source |
|---|---|---|
| {HH:MM} | {Neutral event description} | {Monitoring / On-call / Customer / Runbook} |

Include: first symptom visible, detection time, escalation events, key investigation steps, resolution steps, stand-down time.

## System State at Time of Incident

{Describe relevant recent changes (deploys, config changes, infrastructure changes) in the 48–72 hours before the incident. These are context, not causes.}

## Contributing Factors

Organized by category. Each factor is written as a system/process condition.

### Detection and Alerting
- {Factor related to how long it took to detect}

### Response and Escalation
- {Factor related to response speed or coordination}

### Technical Systems
- {Factor in code, infrastructure, or configuration}

### Process and Documentation
- {Factor in runbooks, procedures, or communication}

### Dependencies and External Factors
- {Third-party services, vendor issues, etc.}

## What Went Well

Be genuine. This section builds trust and reinforces good practices.

- {Specific behavior or tool that worked and why it mattered}
- {Another win}

## What Could Be Improved

Honest assessment of gaps, written as improvement opportunities rather than criticisms.

- {Gap in detection, response, tooling, or process}

## Action Items

Prioritized by impact. Each item is specific, assigned to a role, and time-bound.

### Priority: High (prevents recurrence or reduces severity)
| Action | Owner (Role) | Due Date | Linked Ticket |
|---|---|---|---|
| {High-priority action} | {Role} | {Date} | {Link} |

### Priority: Medium (improves response speed)
| Action | Owner (Role) | Due Date | Linked Ticket |
|---|---|---|---|
| {Medium-priority action} | {Role} | {Date} | {Link} |

### Priority: Low (long-term improvement)
| Action | Owner (Role) | Due Date | Linked Ticket |
|---|---|---|---|
| {Low-priority action} | {Role} | {Date} | {Link} |

## Related Records

- Incident Report: {INC-ID}
- Problem Record: {PRB-ID or "None created"}
- Change Records: {CHG-IDs for fixes deployed}

## Appendix

### Monitoring Graphs
{Include key graphs showing the failure window and recovery.}

### Relevant Logs
{Include sanitized log snippets that illustrate the failure. Remove credentials, IP addresses, and PII.}

### Communication Log
{Summary of stakeholder communications sent during the incident.}
```

---

## Reviewing for Blame Language

Before publishing, do a final pass:

1. Search for names — if names appear, ensure they are used to attribute observations, not assign fault
2. Search for "forgot", "failed to", "should have", "mistake", "error by" — rewrite any of these
3. Read the Contributing Factors section aloud — does it sound like a system analysis or a trial?
4. Ask: would the people named in the document feel comfortable sharing this with their team?
