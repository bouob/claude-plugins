---
name: change-request
description: 'ITIL change request and CAB review workflow. This skill should be used when the user asks to "create a change request", "write an RFC", "plan a change", "CAB review", "change management", "schedule maintenance", "server migration plan", "upgrade plan", or describes any planned modification to IT infrastructure or services. Produces a complete RFC document following ITIL 4 Change Enablement.'
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
argument-hint: '<description of the planned change>'
user-invocable: true
---

# Change Request Workflow

Structured change management following ITIL 4 Change Enablement. Produces a complete RFC (Request for Change) document that serves as both the change plan and the CAB review submission.

## Related Skills (auto-loaded)

- **itil** — change types (Standard/Normal/Emergency), CAB process, risk assessment matrix
- **done-ops** — verification gate before finalizing the change

---

## Output

File: `{OUTPUT_DIR}/change-request-{YYYY-MM-DD}-{slug}.md`

- **slug**: lowercase kebab-case summary, e.g. `exchange-upgrade`, `ad-entra-migration`
- **Change ID** (`CHG-{YYYYMMDD}-{NNN}`): `{NNN}` is a daily sequence number starting at 001. If the organization uses a ticketing system, use that system's ID instead.

Default output directory: `./changes/`. If a `docs/changes/` directory exists in the project, use that instead. Ask the user if neither exists. A user-specified path takes precedence over all defaults.

All change request documents are written in English. Before writing to file, preview the content for the user in their preferred language.

---

## Workflow

### Step 1: Gather Change Details

Collect the following from the user (use AskUserQuestion for missing items):

| Field | Required | Example |
|---|---|---|
| What is being changed? | Yes | "Upgrade Exchange Server 2019 to 2022" |
| Why is this change needed? | Yes | "End of support, security compliance" |
| Which systems/services affected? | Yes | "Email service, Active Directory" |
| Expected downtime? | Yes | "4-hour maintenance window" |
| Proposed schedule? | Yes | "Saturday 02:00-06:00" |
| Who will implement? | Yes | "IT Infrastructure team" |

### Step 2: Classify the Change

Determine the change type using the **itil** skill:

| Question | Standard | Normal | Emergency |
|---|---|---|---|
| Is this a routine, pre-approved procedure? | Yes → Standard | No | No |
| Is there a documented SOP for this? | Yes → Standard | Maybe | No |
| Is this time-critical (active incident)? | No | No | Yes → Emergency |
| Otherwise | — | → Normal | — |

> **Clarification:** Compliance deadlines or business mandates with hard dates are **Normal** changes (with appropriate urgency), not Emergency. Emergency is reserved for active incidents or immediate security threats requiring same-day implementation.

For Normal changes, further classify risk level:
- **Minor**: Low risk, Change Manager approval sufficient
- **Significant/Major**: Requires full CAB review

### Step 3: Risk Assessment

Rate each dimension 1-3, multiply for Risk Score:

**Impact** (if change fails):
- 3 = High: critical service outage, data loss risk
- 2 = Medium: degraded service, limited users affected
- 1 = Low: minimal/no user impact

**Likelihood** (of failure):
- 3 = High: untested procedure, complex dependencies
- 2 = Medium: tested in non-prod, moderate complexity
- 1 = Low: routine procedure, well-documented, previously successful

| Risk Score | Level | Authorization |
|---|---|---|
| 7-9 | **High** | Full CAB + management approval |
| 4-6 | **Medium** | CAB review recommended |
| 1-3 | **Low** | Change Manager approval |

MUST include the risk assessment table in the RFC with this exact format:

```
| Dimension | Rating | Justification |
|---|---|---|
| Impact (if failure) | {1-3} | {Reason} |
| Likelihood (of failure) | {1-3} | {Reason} |
| **Risk Score** | **{N}** | **{Low/Medium/High}** |
```

Present the assessment to the user for validation.

### Step 4: Build the RFC Document

Create the change request file. MUST follow this exact structure — do not rearrange or rename sections:

```markdown
# Request for Change: {TITLE}

| Field | Value |
|---|---|
| Change ID | CHG-{YYYYMMDD}-{NNN} |
| Change Type | Standard / Normal / Emergency |
| Risk Level | {Low / Medium / High} (Score: {N}) |
| Status | Draft |
| Requester | {NAME} |
| Date Submitted | {YYYY-MM-DD} |
| Proposed Window | {DATE TIME} to {DATE TIME} ({TIMEZONE}) |

## Business Justification

{Why this change is needed. What problem it solves. What happens if not implemented.}

## Scope and Impact

### Systems Affected
{List of systems, services, and configuration items.}

### Users Affected
{Who will experience downtime or changes. Estimated number.}

### Dependencies
{Other systems, teams, or changes this depends on.}

## Risk Assessment

| Dimension | Rating | Justification |
|---|---|---|
| Impact (if failure) | {1-3} | {Reason} |
| Likelihood (of failure) | {1-3} | {Reason} |
| **Risk Score** | **{N}** | **{Low/Medium/High}** |

### Risk Mitigation
{Steps to reduce risk — e.g., tested in staging, phased rollout.}

## Implementation Plan

### Pre-Implementation
| Step | Action | Owner | Est. Duration |
|---|---|---|---|
| 1 | {Pre-check or preparation} | {Name} | {Time} |

### Implementation
| Step | Action | Owner | Est. Duration |
|---|---|---|---|
| 1 | {Step description} | {Name} | {Time} |

### Post-Implementation
| Step | Action | Owner | Est. Duration |
|---|---|---|---|
| 1 | {Verification step} | {Name} | {Time} |

## Test / Validation Plan

| Check | Expected Result | Method |
|---|---|---|
| {What to verify} | {Expected outcome} | {How to check} |

## Rollback Plan

**Trigger criteria:** {When to initiate rollback — specific, measurable conditions.}

**Estimated rollback time:** {Duration}

| Step | Action | Owner | Est. Duration |
|---|---|---|---|
| 1 | {Rollback step} | {Name} | {Time} |

## Communication Plan

| When | Audience | Channel | Message |
|---|---|---|---|
| Before change | {Who} | {Email/Teams/Statuspage} | Maintenance notification |
| During (if issues) | {Who} | {Channel} | Status update |
| After completion | {Who} | {Channel} | Completion confirmation |

## Approvals

| Role | Name | Decision | Date |
|---|---|---|---|
| Change Manager | | | |
| CAB | | | |
| Technical Lead | | | |

## Related Records

{Linked incidents, problems, or previous changes.}
```

### Step 5: CAB Review Preparation

For Normal (Major) and Emergency changes, prepare the CAB review summary:

1. Load the CAB Review Checklist from `itil` skill (`references/change-enablement.md`)
2. Self-evaluate the RFC against each checklist item
3. Flag any items that are incomplete or need discussion
4. Present the checklist evaluation to the user

### Step 6: Finalize

1. Load **done-ops** verification gate
2. Verify all required sections are complete:
   - Business justification is clear
   - Implementation plan has specific steps with owners
   - Rollback plan has trigger criteria and tested procedure
   - Communication plan identifies all audiences
   - Risk assessment is realistic
3. Present the final RFC for user review
4. Note the authorization path: who needs to approve this change

---

## Gotchas

- The RFC is the single document for the entire change lifecycle — plan, approval, implementation, and review all reference this document
- **Phased changes** (e.g., multi-weekend migrations): use separate Implementation Plan tables per phase, add phase gate criteria (go/no-go between phases), and note all proposed windows in the Schedule section
- Standard changes do not need individual CAB review, but the standard change catalog should be referenced
- Emergency changes still need an abbreviated RFC before implementation, with a full RFC completed within 48 hours
- Always ask about blackout windows — some organizations have change freezes around releases, holidays, or fiscal close
- Rollback plan must have specific trigger criteria, not just "if something goes wrong"
- If the change was triggered by an incident, link the incident ID
- Post-Implementation Review (PIR) is mandatory for Emergency changes (48h) and recommended for all Normal changes (5 business days)
