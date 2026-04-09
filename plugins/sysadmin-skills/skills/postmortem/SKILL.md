---
name: postmortem
description: 'Use this skill when the user wants help writing up a resolved production incident, outage, or failure. This is the go-to skill for any request that involves turning "something broke and we fixed it" into a written document — whether the user calls it a postmortem, post-incident review, post-incident analysis, PIR, incident retrospective, blameless review, no-blame writeup, lessons learned, or just describes what broke (deploy, database, auth, payment, storage, backup, replication, service outage) along with details like severity, duration, users affected, or rollback, and asks for help documenting it. Also use when the user''s goal is team learning or capturing details before they''re forgotten from a past incident. Output is a blameless document with timeline, contributing factors, what went well, and action items. Do not use for active/ongoing incidents, sprint or agile retrospectives, code reviews, general project retros, problem records for recurring issues, change requests, or meeting agendas.'
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
argument-hint: '<incident description or path to incident report file>'
user-invocable: true
---

# Blameless Postmortem Workflow

Structured post-incident learning following Google SRE blameless postmortem culture. Produces a postmortem document that focuses on systemic contributing factors and actionable improvements — not individual blame.

## Related Skills (auto-loaded)

- **itil** — reads `references/sre-integration.md` for blameless culture principles and error budget context
- **done-ops** — confirmation that the incident is fully resolved before starting the postmortem

---

## Blameless Culture — Why It Matters

Traditional post-incident reviews can become blame-focused, which creates incentives to hide mistakes. Blameless postmortems assume:

> **Everyone involved was acting in good faith with the information and tools available to them at the time.**

The goal is to find what made the failure *possible* at the system level — and fix those things. People don't fail; systems create conditions where failures become likely.

For full blameless culture guidance, read `references/blameless-templates.md`.

---

## Output

File: `{OUTPUT_DIR}/postmortem-{YYYY-MM-DD}-{slug}.md`

- **slug**: kebab-case summary of the incident, e.g. `payment-api-timeout`, `auth-service-outage`
- Link to the incident report if one exists from the `/incident` skill

Default output directory: `./postmortems/`. If a `docs/postmortems/` directory exists, use that instead.

All postmortem documents are written in English. Preview for the user in their preferred language before writing.

---

## When to Use Each Review Type

| Situation | Use |
|---|---|
| SEV-1 or SEV-2 incident, regardless of root cause | **`/postmortem`** (mandatory) |
| SEV-3 with complex contributing factors | **`/postmortem`** (recommended) |
| Root cause unknown, likely to recur | **`/problem`** (for technical tracking) + `/postmortem` (for learning) |
| Formal compliance/regulatory PIR required | Traditional ITIL PIR (can run alongside `/postmortem`) |
| Sprint retrospective | Use team's agile retro format — not this skill |

---

## Workflow

### Step 1: Confirm Incident is Resolved

Before starting the postmortem, confirm the incident is fully resolved. If not, stop — do not start the postmortem while the incident is still active. Ask the user to confirm.

If an incident report exists (from `/incident` skill), read it for the timeline, classification, and resolution details.

### Step 2: Gather Facts

Collect the following (use AskUserQuestion for missing items):

| Field | Required | Example |
|---|---|---|
| Incident summary | Yes | "Payment API returned 500s for 23 minutes affecting checkout" |
| When it started and ended | Yes | "09:47 – 10:10 UTC" |
| Detection method | Yes | "Customer complaint, then monitoring alert at 09:52" |
| Impact | Yes | "~2,400 failed transactions, 12% of users during the window" |
| What was done to fix it | Yes | "Rolled back deploy v2.1.4 to v2.1.3" |
| Who was involved | No | Roles only, not names in the document |

**Important**: Record facts, not interpretations. "The deploy pipeline did not run smoke tests" — not "the team skipped testing."

### Step 3: Build the Timeline

Construct a neutral, fact-based timeline. Each entry states what happened, not who did what wrong.

Use role labels (e.g., "On-call engineer", "Deployment automation") rather than individual names where possible. Names are acceptable but should be used only to attribute observations, not to assign fault.

```
| Time (UTC) | Event |
|---|---|
| 09:47      | Deploy v2.1.4 completed via CI/CD pipeline |
| 09:52      | Monitoring alert: payment API error rate > 5% |
| 09:55      | On-call acknowledged alert, began investigation |
| 10:03      | Root cause identified: breaking DB schema change in v2.1.4 |
| 10:07      | Rollback initiated |
| 10:10      | Error rate returned to baseline, incident resolved |
```

### Step 4: Contributing Factors

Identify what made this failure *possible*. This is not "root cause" — it is a multi-factor analysis. Multiple factors contributed; removing any single one might have prevented the incident.

**Format each factor as a system condition, not a personal action:**

```
Contributing factors:
- The CI/CD pipeline did not include an integration test for schema migrations
- The staging environment schema was out of sync with production at the time of the deploy
- The deploy monitoring threshold for error rate was set to 5% — lower than the actual impact threshold for user-facing failures
- No automatic rollback was configured for deploy error spikes
```

**Avoid**: "Alice didn't test", "Bob forgot", "the team was careless"

For factor analysis techniques, read `references/blameless-templates.md`.

### Step 5: Create the Postmortem Document

MUST follow this exact structure:

```markdown
# Postmortem: {INCIDENT TITLE}

| Field | Value |
|---|---|
| Date | {YYYY-MM-DD} |
| Duration | {HH:MM} – {HH:MM} ({TZ}) — {total minutes} |
| Severity | SEV-{1/2/3} |
| Incident ID | {INC-ID or "N/A"} |
| Services Affected | {List} |
| User Impact | {Estimated users / transactions affected} |
| Status | Draft / Published |

## Summary

{2–3 sentence summary: what happened, for how long, what was the impact. Written for an audience unfamiliar with the incident.}

## Timeline

| Time (UTC) | Event |
|---|---|
| {HH:MM} | {Neutral event description} |

## Contributing Factors

{Bulleted list of system/process conditions that made this failure possible. No blame language.}

## What Went Well

{Things that worked as intended and helped limit impact or speed recovery. Be genuine — this is not a formality.}

## What Could Be Improved

{Areas where systems, processes, or tools could have detected, prevented, or limited the incident.}

## Action Items

| Action | Owner (Role) | Due Date | Status |
|---|---|---|---|
| {Specific, measurable action} | {Role title} | {YYYY-MM-DD} | Open |

## Appendix

{Optional: relevant logs, screenshots, graphs, or additional technical detail for reference.}
```

### Step 6: Action Items

Action items are the most important output of a postmortem. Each one must be:

- **Specific**: "Add integration test for DB schema migrations to CI pipeline" — not "improve testing"
- **Measurable**: the outcome must be verifiable (test exists, threshold changed, runbook updated)
- **Owned**: assign to a role or team, not an individual by name
- **Time-bounded**: a realistic due date
- **Tracked**: link to an issue tracker ticket where possible

For action item patterns and prioritization guidance, read `references/action-item-patterns.md`.

### Step 7: Review and Publish

1. Review the draft with the user — does the language remain blameless throughout?
2. Check that each action item is actionable and owned
3. Present for user confirmation before writing to file
4. After publishing, share with the team — transparency is a core principle of blameless culture

---

## Gotchas

- Do not start the postmortem while the incident is still active — active incidents need resolution focus, not learning focus
- "What went well" is not filler — genuine acknowledgment of what worked builds trust and reinforces good practices
- Action items without owners and due dates will not get done — every item needs both
- The postmortem is not a punishment document — if it reads like a trial transcript, rewrite it
- For recurring incidents, the postmortem action items should link to a Problem record (`/problem`) for long-term tracking
- Postmortems should be published internally — the learning only compounds if others can read and contribute
- Senior leaders should not be identified as the "cause" — if a leader's decision contributed, frame it as a process gap (e.g., "the approval process did not surface the risk before the decision")
