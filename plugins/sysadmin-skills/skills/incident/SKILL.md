---
name: incident
description: 'IT incident response workflow. This skill should be used when the user asks to "log an incident", "handle an incident", "create incident report", "document an outage", "incident response", "service is down", "major incident", or describes a service disruption requiring structured response. Guides through the full ITIL incident lifecycle: detect, classify, investigate, resolve, communicate, and close.'
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - WebSearch
  - WebFetch
  - AskUserQuestion
argument-hint: '<description of incident or symptoms>'
user-invocable: true
---

# Incident Response Workflow

Structured incident response following ITIL 4 Incident Management. Produces a complete incident report as a local markdown file.

## Related Skills (auto-loaded)

- **itil** — priority classification (P1-P4), incident management process, escalation matrix
- **comms** — stakeholder notification templates, severity-based tone guidance
- **done-ops** — verification gate before closing the incident

---

## Output

File: `{OUTPUT_DIR}/incident-{YYYY-MM-DD}-{slug}.md`

- **slug**: lowercase kebab-case summary, e.g. `email-outbound-failure`, `vpn-india-outage`
- **Incident ID** (`INC-{YYYYMMDD}-{NNN}`): `{NNN}` is a daily sequence number starting at 001. If the organization uses a ticketing system (ServiceNow, Jira SM), use that system's ID instead.

Default output directory: `./incidents/`. If a `docs/incidents/` directory exists in the project, use that instead. Ask the user if neither exists. A user-specified path takes precedence over all defaults.

All incident documents are written in English. Before writing to file, preview the content for the user in their preferred language.

---

## Workflow

### Step 1: Gather Information

Collect the following from the user (use AskUserQuestion for missing items):

| Field | Required | Example |
|---|---|---|
| What is happening? | Yes | "Email service is not sending outbound messages" |
| When did it start? | Yes | "Noticed at 09:15 today" / "Alerts fired at 14:30" |
| Who/what is affected? | Yes | "All users in HQ" / "Customer-facing API" |
| Severity indicators | Yes | Is there a workaround? How many users? Revenue impact? |
| What has been tried? | No | "Restarted the mail service, no change" |

### Step 2: Classify (SEV then P)

**First — assign Severity** (objective impact scope):

| Level | Scope | Definition |
|---|---|---|
| **SEV-1** | All users / all regions | Core service completely down, no workaround |
| **SEV-2** | Many users or major function | Significant degradation, partial workaround |
| **SEV-3** | Subset of users, non-critical | Limited impact, workaround available |
| **SEV-4** | Single user or negligible | Cosmetic, proactive, informational |

**Then — assign Priority** (handling order, Impact × Urgency):

|  | High Urgency | Medium Urgency | Low Urgency |
|---|---|---|---|
| **High Impact** | **P1** Critical | **P2** High | P3 Medium |
| **Medium Impact** | **P2** High | P3 Medium | P4 Low |
| **Low Impact** | P3 Medium | P4 Low | P4 Low |

Present both SEV and P to the user for confirmation. MUST use the exact format: `SEV-1`, `SEV-2`, `P1`, `P2` (not "Critical" or "High" alone).

If SEV-1 or P1/P2: Major Incident procedures apply (see `itil` skill reference `references/incident-management.md`).

### Step 3: Document Timeline

Create the incident report file with the initial entry. MUST follow this exact structure — do not rearrange or rename sections:

```markdown
# Incident Report: {TITLE}

| Field | Value |
|---|---|
| Incident ID | INC-{YYYYMMDD}-{NNN} |
| Severity | SEV-{1/2/3/4} |
| Priority | P{1/2/3/4} |
| Status | Investigating |
| Reported by | {NAME/SYSTEM} |
| Start time | {YYYY-MM-DD HH:MM TZ} |
| Affected services | {LIST} |
| Affected users | {SCOPE} |

## Impact Summary

{One paragraph describing what users are experiencing.}

## Timeline

| Time | Event |
|---|---|
| {HH:MM} | {Event description} |

## Investigation

{Findings so far, diagnostics performed, hypotheses.}

## Resolution

{To be completed upon resolution.}

## Follow-up Actions

- [ ] {Action items identified during the incident}
```

### Step 4: Draft Communications

Using the **comms** skill, draft the appropriate notifications:

- **Initial notification** — based on priority level and audience
- Present the draft to the user for review before including in the report

For P1/P2: remind the user about the update cadence (P1: every 15-30 min, P2: every 30-60 min).

If a status page update is also needed, coordinate with the `/statuspage` skill. The incident report contains full technical detail; the status page update contains only impact-focused, user-safe information.

### Step 5: Track Progress

As the user provides updates:
- Append to the Timeline section
- Update the Status field (Investigating → Identified → Monitoring → Resolved)
- Draft follow-up communications as needed
- Add to Investigation section with findings

### Step 6: Resolution

When the user indicates the issue is resolved:

1. Load **done-ops** verification gate
2. Walk through the incident closure checklist:
   - Service restored and verified?
   - User/reporter confirmation obtained?
   - Monitoring stable (no recurring alerts)?
   - Documentation complete?
   - Problem record needed? (recurring incident or unknown root cause)
3. Update the incident report:
   - Set Status to Resolved
   - Record resolution time
   - Fill in the Resolution section
   - Calculate total duration
4. Draft the resolution notification using **comms** templates

### Step 7: Close and Follow-up

Complete the incident report:
- Record all follow-up actions with owners and due dates
- Note if a Post-Incident Review is needed (mandatory for P1/P2, recommended for P3)
- Recommend creating a Problem record if root cause is unknown
- Present the final report to the user for review

---

## Gotchas

- Always use the user-facing service name in communications, not internal system names
- Never include IP addresses, hostnames, or credentials in the incident report
- For P1 incidents, do not wait for complete information before drafting the initial notification — speed matters
- Resolution time = time from detection to confirmed restoration, not when the ticket is closed
- If the incident was caused by a recent change, link the change request ID in the report
- Ask the user whether this incident needs to follow their organization's ticketing system (ServiceNow, Jira Service Management, etc.) in addition to the local markdown report
