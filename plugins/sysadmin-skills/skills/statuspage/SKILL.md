---
name: statuspage
description: 'Status page update workflow for IT service incidents and scheduled maintenance. This skill should be used when the user asks to "write a status update", "update the status page", "post maintenance notice", "draft statuspage update", "service status", "notify users about outage", or needs to communicate service status to users. Produces updates following the Investigating/Identified/Monitoring/Resolved lifecycle, compatible with Atlassian Statuspage and Instatus.'
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
argument-hint: '<incident description or maintenance details>'
user-invocable: true
---

# Status Page Update Workflow

Draft status page updates for incidents and scheduled maintenance. Produces updates compatible with Atlassian Statuspage and Instatus, following the standard four-phase incident lifecycle.

## Related Skills (auto-loaded)

- **comms** — tone guidance, audience adaptation, statuspage templates
- **done-ops** — verification gate before posting "Resolved" updates

---

## Output

File: `{OUTPUT_DIR}/statuspage-{YYYY-MM-DD}-{slug}.md`

- **slug**: lowercase kebab-case summary, e.g. `vpn-india-outage`, `firewall-maintenance`

Default output directory: `./statuspage/`. If a `docs/statuspage/` directory exists in the project, use that instead. Ask the user if neither exists. A user-specified path takes precedence over all defaults.

All status page updates are written in English. Before writing to file, preview the content for the user in their preferred language.

---

## Two Modes

### Mode 1: Incident Update

For active or recent service incidents.

### Mode 2: Maintenance Notice

For planned maintenance windows.

Determine the mode from the user's request. If unclear, ask.

---

## Incident Update Workflow

### Step 1: Gather Context

Collect from the user (use AskUserQuestion for missing items):

| Field | Required | Example |
|---|---|---|
| Which service? | Yes | "Email", "VPN", "Customer Portal" |
| What are users experiencing? | Yes | "Cannot send emails", "Slow page loads" |
| Current investigation status? | Yes | Investigating / Identified / Monitoring / Resolved |
| Priority level? | Yes (or derive) | P1 / P2 / P3 / P4 |
| Workaround available? | No | "Use webmail as alternative" |
| ETA for resolution? | No | "Estimated 2 hours" |

If an incident report exists (from the `/incident` skill), read it for context.

### Step 2: Set Component Status

Map the situation to component statuses:

| Situation | Component Status | Incident Impact |
|---|---|---|
| Service completely unavailable | Major Outage | Critical |
| Service partially broken (subset of users) | Partial Outage | Major |
| Service slow or intermittent | Degraded Performance | Minor |
| Planned work in progress | Under Maintenance | Maintenance |

### Step 3: Draft the Update

Using templates from the **comms** skill (`references/statuspage-templates.md`), draft the update for the current phase:

**Investigating** → Acknowledge the issue, state what is known
**Identified** → State the cause (impact-focused, not technical), share workaround
**Monitoring** → State the fix applied, monitoring for stability
**Resolved** → Summarize what happened, confirm resolution, apologize

Apply the writing rules from the **comms** skill:
- Impact-focused, not technical
- User-facing service names only
- No IP addresses, hostnames, or internal identifiers
- No blame or individual names
- Professional and empathetic tone
- Include "Next update by {TIME}" for all non-resolved phases

### Step 4: Record in File

Write the update to the output file. If the file already exists (ongoing incident), append the new update:

```markdown
# Status Page Updates: {SERVICE_NAME} — {INCIDENT_TITLE}

| Field | Value |
|---|---|
| Date | {YYYY-MM-DD} |
| Service | {SERVICE_NAME} |
| Component Status | {STATUS} |
| Incident Impact | {Minor / Major / Critical} |

## Updates

### {PHASE} — {YYYY-MM-DD HH:MM TZ}

{Update text}

---
```

### Step 5: Verify Before Resolving

When posting a "Resolved" update, load the **done-ops** verification gate first:
- All affected components verified operational?
- Monitoring confirms stability?
- Duration recorded accurately?

Only proceed to the Resolved phase after verification passes.

### Step 6: Review

Present the draft to the user. Confirm before finalizing:
- Is the tone appropriate for the audience?
- Any sensitive information that should be removed?
- Is the next update time realistic?

---

## Maintenance Notice Workflow

### Step 1: Gather Details

| Field | Required | Example |
|---|---|---|
| Which service? | Yes | "Email service" |
| Maintenance window | Yes | "2026-03-29 02:00-06:00 UTC" |
| Expected impact | Yes | "Service will be unavailable" / "Brief interruptions" |
| User action required? | No | "Save work and log out before 02:00" |
| Reason (user-facing) | Yes | "Scheduled system upgrade" |

### Step 2: Draft Three Notices

Draft all three maintenance communications:

1. **Advance Notice** — post 3-5 business days before
2. **In Progress** — post when maintenance begins
3. **Complete** — post when maintenance finishes

Use templates from `comms` skill (`references/statuspage-templates.md`).

### Step 3: Record and Review

Write all three drafts to the output file for user review. The user will post them at the appropriate times.

---

## Gotchas

- Status page updates are public-facing — treat every word as if the CEO and every customer will read it
- Never include root cause details during an active security incident
- "Next update by {TIME}" is a promise — if the time passes with no news, post an update anyway saying "still investigating"
- For multi-component incidents, set the overall impact to the highest affected component
- Do not resolve the incident on the status page until ALL affected components are verified operational
- Maintenance notices should be posted during business hours even if the maintenance itself is after hours
- If the user is also using `/incident`, the statuspage updates should align with the incident timeline but contain less detail
