# Status Page Templates

Templates compatible with Atlassian Statuspage and Instatus. Follow the standard four-phase incident lifecycle.

---

## Component Statuses

| Status | Meaning | When to Use |
|---|---|---|
| **Operational** | Functioning as expected | Default / after resolution |
| **Degraded Performance** | Working but slow or partially impacted | Latency issues, intermittent errors |
| **Partial Outage** | Completely broken for a subset of users | Regional outage, specific feature down |
| **Major Outage** | Completely unavailable | Full service failure |
| **Under Maintenance** | Scheduled work in progress | During maintenance windows |

---

## Incident Updates

### Phase 1: Investigating

**When:** Issue detected, investigation starting.

**Impact level:** Set to Minor / Major / Critical based on priority.

```
Investigating — We are currently investigating reports of {SYMPTOMS}
with {SERVICE_NAME}. Our team is looking into this and we will provide
an update as soon as we have more information.

Next update by {TIME}.
```

**Short version (for minor issues):**
```
Investigating — We are looking into reports of {SYMPTOMS} with
{SERVICE_NAME}. More details to follow.
```

### Phase 2: Identified

**When:** Root cause or contributing factor has been found.

```
Identified — We have identified the cause of {SYMPTOMS} affecting
{SERVICE_NAME}. {ONE_SENTENCE_EXPLANATION — impact-focused, not technical}.

Our team is implementing a fix. {WORKAROUND if available: "In the
meantime, [WORKAROUND_STEPS]."}

Next update by {TIME}.
```

### Phase 3: Monitoring

**When:** Fix applied, watching for stability.

```
Monitoring — A fix has been implemented for the {SERVICE_NAME} issues.
We are monitoring the service to ensure stability.

{If partial: "Some users may still experience {RESIDUAL_SYMPTOMS} as
the fix propagates."}

We will provide a final update once we have confirmed the issue is
fully resolved. Expected confirmation by {TIME}.
```

### Phase 4: Resolved

**When:** Incident is over, service confirmed stable.

```
Resolved — The issue affecting {SERVICE_NAME} has been resolved.
All services are operating normally.

Summary: {ONE_TO_TWO_SENTENCE_SUMMARY — what happened and what was done}.

Duration: {START_TIME} to {END_TIME} ({TOTAL_DURATION}).

We apologize for any inconvenience. If you continue to experience
issues, please contact {SUPPORT_CHANNEL}.
```

---

## Scheduled Maintenance

### Advance Notice (post 3-5 business days before)

```
Scheduled Maintenance — {SERVICE_NAME}

We will be performing scheduled maintenance on {SERVICE_NAME} on
{DATE} from {START_TIME} to {END_TIME} ({TIMEZONE}).

Expected impact: {DESCRIPTION — e.g., "The service will be
unavailable during this window." / "Users may experience brief
interruptions."}

{If action required: "Please save your work and log out before
{START_TIME}."}

We will update this page when maintenance begins and when it is complete.
```

### Maintenance In Progress

```
In Progress — Scheduled maintenance on {SERVICE_NAME} is currently
underway. The service is expected to be restored by {END_TIME}
({TIMEZONE}).

{If running on schedule: "Work is proceeding as planned."}
{If delayed: "Maintenance is taking longer than expected. Revised
estimate: {NEW_END_TIME}."}
```

### Maintenance Complete

```
Completed — Scheduled maintenance on {SERVICE_NAME} has been
completed. All services are operating normally.

{If changes visible to users: "You may notice {VISIBLE_CHANGES}.
No action is required on your part."}
```

---

## Writing Guidelines for Status Pages

### Language Rules

- Use plain, non-technical language
- Refer to services by their user-facing names (not internal system names)
- Describe impact from the user's perspective
- Avoid jargon: say "email service" not "Exchange DAG"
- Never mention IP addresses, hostnames, or internal identifiers
- Never speculate on root cause during active incidents
- Never assign blame or name individuals

### Tone Rules

- Professional and empathetic
- Direct — lead with the most important information
- Calm — avoid words like "catastrophic", "disaster", "crisis"
- Honest — acknowledge the problem clearly, do not minimize

### Update Cadence

| Situation | Update Frequency |
|---|---|
| Major outage (P1) | Every 15-30 minutes |
| Degraded performance (P2) | Every 30-60 minutes |
| Minor issue (P3) | When meaningful new information exists |
| Scheduled maintenance | Start, midpoint (if extended), completion |

**Critical rule:** If the promised update time passes with no new information, post an update anyway: "We are continuing to investigate. No new information at this time. Next update by {TIME}."

### Multi-Component Incidents

When multiple components are affected:
1. Set the overall incident impact to the highest affected component
2. List all affected components in the incident body
3. Update individual component statuses as they are restored
4. Do not resolve the incident until all components are operational
