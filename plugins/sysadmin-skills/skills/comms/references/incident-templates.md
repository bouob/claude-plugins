# Incident Communication Templates

All templates are in English. Placeholders use `{PLACEHOLDER}` format.

---

## Initial Notification

### P1 — Critical (to all stakeholders)

**Subject:** [P1 INCIDENT] {SERVICE_NAME} — Service Disruption

```
Status: We are experiencing a major disruption to {SERVICE_NAME}.

Impact: {DESCRIPTION_OF_USER_IMPACT}. Approximately {NUMBER} users/teams are affected.

Action: Our team has been mobilized and is actively investigating. A bridge has been established.

Next update: By {TIME} or sooner if we have new information.

If you need immediate assistance, contact {CONTACT_INFO}.
```

### P2 — High (to affected teams + management)

**Subject:** [P2 INCIDENT] {SERVICE_NAME} — Degraded Performance

```
Status: We are aware of issues affecting {SERVICE_NAME}.

Impact: {DESCRIPTION_OF_USER_IMPACT}. A workaround is {available/not yet available}.

Action: The team is investigating and working toward resolution.

Next update: By {TIME}.
```

### P3 — Medium (to affected users)

**Subject:** [P3] {SERVICE_NAME} — Known Issue

```
Status: Some users may notice {DESCRIPTION_OF_SYMPTOMS} with {SERVICE_NAME}.

Impact: {SCOPE_DESCRIPTION}. Core functionality remains available.

Workaround: {WORKAROUND_STEPS or "None required at this time."}

Next update: When we have a resolution or meaningful update.
```

---

## Progress Update

### Template (all priorities)

**Subject:** [UPDATE {N}] {SERVICE_NAME} — {INCIDENT_TITLE}

```
Status: {Current status — one sentence.}

What we know: {Brief description of findings so far.}

What we are doing: {Current actions being taken.}

{If workaround available:}
Workaround: {STEPS}

Next update: By {TIME}.
```

### P1 Update — Additional Fields

For P1 incidents, include these additional fields:

```
Duration: This incident has been ongoing for {DURATION}.
Teams engaged: {LIST_OF_TEAMS}
Escalation status: {e.g., "Vendor support engaged", "Management briefed"}
```

---

## Resolution Notification

### Template (all priorities)

**Subject:** [RESOLVED] {SERVICE_NAME} — {INCIDENT_TITLE}

```
Status: The incident affecting {SERVICE_NAME} has been resolved.

What happened: {Brief, non-technical summary of the issue.}

Resolution: {What was done to fix it — impact-focused, not deeply technical.}

Duration: {START_TIME} to {END_TIME} ({TOTAL_DURATION}).

Next steps: {e.g., "We will conduct a post-incident review and share findings." / "A permanent fix is scheduled for {DATE}."}

We apologize for any inconvenience. If you continue to experience issues, please contact {CONTACT_INFO}.
```

---

## Management Briefing

For P1/P2 incidents, management may need a separate briefing:

**Subject:** [MGMT BRIEF] {INCIDENT_TITLE} — Summary

```
Incident: {ID} — {TITLE}
Priority: {P1/P2}
Duration: {START} to {END} ({TOTAL})
Services affected: {LIST}

Business impact:
- {Impact line 1 — e.g., "Approximately 500 users unable to access email for 2 hours"}
- {Impact line 2 — e.g., "No data loss confirmed"}
- {Impact line 3 — e.g., "SLA target was 4 hours; resolved in 2.5 hours"}

Root cause: {Brief summary — share only when confirmed and appropriate}

Immediate actions taken:
1. {Action 1}
2. {Action 2}

Follow-up actions:
1. {Action with owner and due date}
2. {Action with owner and due date}

Post-incident review: Scheduled for {DATE}.
```

---

## Escalation Notification

When escalating to another team or vendor:

**Subject:** [ESCALATION] {INCIDENT_ID} — {SERVICE_NAME}

```
Incident: {ID} — {TITLE}
Priority: {LEVEL}
Duration so far: {DURATION}

Summary: {Brief description of the issue and investigation so far.}

What has been tried:
1. {Diagnostic/action 1 — result}
2. {Diagnostic/action 2 — result}
3. {Diagnostic/action 3 — result}

Why escalating: {Reason — e.g., "Issue appears to be in {COMPONENT} which is outside our team's scope."}

Requested action: {What the receiving team needs to do.}

Contact: {Your name, channel, availability}
```
