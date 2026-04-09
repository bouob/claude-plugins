---
name: problem
description: 'Use this skill when the user wants to open a problem record, register a known error (KEDB), or run root cause analysis (RCA, 5 Whys, Fishbone) on an IT issue. Trigger on explicit phrases: "problem record", "problem ticket", "known error", "KEDB", "RCA", "root cause analysis", "systemic weakness", "latent risk". Also trigger when the user describes a recurring failure ("every Monday", "every Saturday night", "keeps happening weekly", "5 incidents this month all pointing at..."), wants to proactively track a trending risk before it becomes an outage ("disk trending to 100%", "capacity heading bad", "no smoke tests yet"), or needs to link a workaround to a permanent fix. The user''s intent is to track and eliminate an underlying cause across multiple occurrences — not to fight a live outage, not to write a postmortem for a single past incident, and not to draft a change request. If they say "problem", "known error", "recurring", or "systemic" in an ITSM context, use this skill.'
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - WebSearch
  - AskUserQuestion
argument-hint: '<description of recurring issue or known error>'
user-invocable: true
---

# Problem Management Workflow

Structured root cause investigation following ITIL v5 Problem Management. Produces a Problem record that tracks investigation progress from detection through permanent fix.

## Related Skills (auto-loaded)

- **itil** — Problem Management process context, incident-to-problem handoff criteria
- **done-ops** — verification gate before closing the problem

---

## Output

File: `{OUTPUT_DIR}/problem-{YYYY-MM-DD}-{slug}.md`

- **slug**: lowercase kebab-case summary, e.g. `vpn-weekly-disconnect`, `payment-gateway-timeout`
- **Problem ID** (`PRB-{YYYYMMDD}-{NNN}`): `{NNN}` is a daily sequence number starting at 001. If the organization uses a ticketing system, use that system's ID instead.

Default output directory: `./problems/`. If a `docs/problems/` directory exists in the project, use that instead. Ask the user if neither exists.

All problem records are written in English. Preview content for the user in their preferred language before writing.

---

## When to Create a Problem Record

Create a problem record when ANY of the following are true:
- The same incident has occurred **3 or more times**
- An incident was closed with a **workaround but no permanent fix**
- Root cause is **still unknown** after the incident was resolved
- The incident revealed a **systemic weakness** that could affect other services
- A major incident (P1/P2) is resolved — proactive problem management recommended

---

## Problem Types

| Type | Trigger | Example |
|---|---|---|
| **Reactive** | Created after one or more incidents have occurred | VPN drops after repeated user reports |
| **Proactive** | Created before an incident occurs (trending data, risk analysis) | Disk capacity trending toward full in 30 days |

---

## Workflow

### Step 1: Gather Information

Collect the following (use AskUserQuestion for missing items):

| Field | Required | Example |
|---|---|---|
| What is the recurring issue? | Yes | "Email service intermittently fails to send" |
| Linked incident IDs | Yes | "INC-20260401-001, INC-20260408-003" |
| How often does it occur? | Yes | "Every Monday morning, ~4 times this month" |
| Current workaround? | No | "Restarting the mail queue service fixes it temporarily" |
| Suspected cause? | No | "Memory leak after weekend batch job" |

### Step 2: Classify the Problem

| Question | Reactive | Proactive |
|---|---|---|
| Did one or more incidents already happen? | Yes → Reactive | No → Proactive |
| Is there a known pattern or trend? | Either | Yes → Proactive |

Also determine scope:
- **Single-service**: affects one system only
- **Cross-service**: affects multiple systems or teams (requires broader investigation)

### Step 3: Create the Problem Record

Create the problem file. MUST follow this exact structure:

```markdown
# Problem Record: {TITLE}

| Field | Value |
|---|---|
| Problem ID | PRB-{YYYYMMDD}-{NNN} |
| Type | Reactive / Proactive |
| Status | Under Investigation |
| Opened | {YYYY-MM-DD} |
| Linked Incidents | {INC-IDs, or "None"} |
| Affected Service | {Service name} |
| Known Workaround | {Description or "None"} |

## Problem Description

{What is happening and when. Observable symptoms from user/system perspective.}

## Investigation

### Hypotheses

{List working hypotheses ranked by likelihood.}

### Root Cause Analysis

{RCA method used and findings — see Step 4.}

## Root Cause

{Final identified root cause. Leave blank until confirmed.}

## Known Error Registration

**Registered as Known Error:** {Yes / No / Pending}

{If Yes: description of the known error, workaround, and permanent fix status.}

## Resolution

### Permanent Fix

{Describe the fix. If implemented via a change, link the change ID.}

**Linked Change ID:** {CHG-ID or "Pending"}

## Follow-up Actions

- [ ] {Action items with owners and due dates}

## Closure

**Closed:** {YYYY-MM-DD}
**Reason:** {Root cause resolved / Risk accepted / Duplicate — link to PRB-ID}
```

### Step 4: Root Cause Analysis

Present the RCA method options to the user. Common methods:

| Method | Best For | Complexity |
|---|---|---|
| **5 Whys** | Linear, straightforward causes | Low |
| **Fishbone (Ishikawa)** | Multi-factor, cross-domain causes | Medium |
| **Pareto Analysis** | Prioritizing among many contributing factors | Medium |
| **Kepner-Tregoe** | High-stakes, safety-critical incidents | High |

For detailed method guidance, read `references/rca-techniques.md`.

**Default recommendation**: Start with 5 Whys. If the chain leads to multiple parallel causes, switch to Fishbone.

After completing the RCA:
- Update the Investigation section with method and findings
- Fill in the Root Cause field once confirmed
- If root cause is confirmed but fix is not yet deployed: register as Known Error (Step 5)

### Step 5: Known Error Registration

Register a Known Error when:
- Root cause is **identified** but permanent fix is not yet deployed
- A workaround exists that reliably addresses the symptoms

Known Error entry includes:
- What causes the failure (root cause)
- The reliable workaround (step-by-step)
- Permanent fix plan and target date (link to change request if created)

For Known Error Database (KEDB) guidance, read `references/known-error-db.md`.

### Step 6: Permanent Fix

When the root cause is identified and a fix is ready:
1. Create a change request using `/change-request`
2. Link the Problem ID in the RFC's "Related Records" section
3. After the change is implemented, return to this problem record
4. Update the Resolution section with the fix and change ID

### Step 7: Close the Problem

Load **done-ops** verification gate. Walk through:
- Root cause identified and documented?
- Permanent fix implemented (or risk formally accepted)?
- Linked incidents will no longer recur?
- Known Error record updated or closed?
- Follow-up actions recorded with owners?

Present the final problem record to the user for review.

---

## Gotchas

- A problem record stays open until the permanent fix is deployed — not until the workaround is applied
- If the permanent fix requires a change, the change may close before the problem if the problem owner doesn't update the record — check both
- Proactive problem records don't need a linked incident — open them from trend data directly
- If a problem's root cause is never confirmed, it can be closed as "Root cause unconfirmed, risk accepted" with management sign-off — document why investigation was stopped
- For recurring SEV-1 incidents, the problem record is as urgent as the incident itself
- Use `/postmortem` for the cultural/learning dimension; use this skill for the technical tracking dimension — they complement each other
