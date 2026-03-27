# Change Enablement — ITIL 4 Reference

## Process Flow

```
Request (RFC) → Assess → Authorize → Schedule → Implement → Review (PIR)
```

### 1. Request for Change (RFC)

The RFC is a single document that contains the complete change plan. The same document is submitted for CAB review, used during implementation, and updated with post-implementation results.

#### RFC Required Fields

| Section | Contents |
|---|---|
| **Change ID** | Unique identifier (auto-generated or manual) |
| **Change Type** | Standard / Normal / Emergency |
| **Requester** | Name, team, contact |
| **Date Submitted** | Submission timestamp |
| **Description and Scope** | What is being changed, which systems/services/CIs are affected |
| **Business Justification** | Why this change is needed, what problem it solves |
| **Risk Assessment** | Risk level, potential impacts, likelihood of failure, mitigation strategies |
| **Impact Analysis** | Affected services, users, downstream dependencies, expected downtime |
| **Implementation Plan** | Step-by-step procedure with responsible parties and estimated duration per step |
| **Test/Validation Plan** | How to verify success, acceptance criteria, post-implementation checks |
| **Rollback Plan** | Step-by-step reversal procedure, estimated rollback time, rollback trigger criteria |
| **Schedule** | Proposed maintenance window, blackout windows to avoid |
| **Approvals** | Sign-off fields for Change Manager, CAB members, technical leads |
| **Related Records** | Linked incidents, problems, or known errors that drive this change |

### 2. Assessment

Change Manager reviews the RFC for:
- Completeness — all required fields populated
- Risk level — determines the authorization path
- Scheduling conflicts — no overlap with other changes or blackout windows
- Resource availability — required personnel available during the window

### 3. Authorization (CAB)

| Change Type | Authorization Path |
|---|---|
| **Standard** | Pre-authorized — no CAB needed per instance |
| **Normal (Minor)** | Change Manager approval |
| **Normal (Significant/Major)** | Full CAB review |
| **Emergency** | ECAB — expedited review by core group |

#### CAB Review Checklist

The CAB evaluates the RFC against these criteria:

- [ ] Business justification is clear and compelling
- [ ] Scope is well-defined — affected CIs/services identified
- [ ] Risk assessment is realistic (not understated)
- [ ] Implementation plan is detailed with step-by-step instructions
- [ ] Rollback plan is complete with specific trigger criteria
- [ ] Rollback has been tested or is a known-good procedure
- [ ] Test/validation plan has clear success criteria
- [ ] Maintenance window is appropriate (low-traffic, adequate duration)
- [ ] No scheduling conflicts with other planned changes
- [ ] Required resources and personnel are confirmed available
- [ ] Communication plan identifies who gets notified and when
- [ ] Related incidents/problems are linked

CAB decisions: **Approved** / **Rejected** / **Deferred** (needs more information)

### 4. Scheduling

- Align with approved maintenance windows
- Avoid change freezes (release cycles, holidays, peak periods)
- Coordinate with other planned changes to avoid collision
- Notify affected users of the maintenance window

### 5. Implementation

Follow the implementation plan in the RFC:
1. Execute pre-implementation checks
2. Create a checkpoint/snapshot for rollback
3. Implement changes step by step
4. Execute validation/test plan after each significant step
5. If any step fails: evaluate against rollback trigger criteria
6. Document actual steps taken (deviations from plan)

### 6. Post-Implementation Review (PIR)

Conducted after every change (within 5 business days for Normal, 48 hours for Emergency):

| PIR Question | Purpose |
|---|---|
| Was the change implemented as planned? | Identify deviations |
| Were there unexpected issues? | Capture lessons learned |
| Is the service performing as expected? | Verify success |
| Was the rollback plan adequate? | Improve future plans |
| Were users/stakeholders properly notified? | Communication effectiveness |
| Should the process be updated? | Continual improvement |

PIR results are recorded on the original RFC, closing the change lifecycle.

---

## Risk Assessment Matrix

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
| 7-9 | High | Full CAB + management approval |
| 4-6 | Medium | CAB review recommended |
| 1-3 | Low | Change Manager approval |

---

## Emergency Change Procedures

Emergency changes bypass the normal CAB schedule but still require:

1. **ECAB authorization** — minimum 2 senior technical staff + Change Manager
2. **Abbreviated RFC** — at minimum: description, impact, implementation steps, rollback plan
3. **Implementation** — proceed immediately after ECAB approval
4. **Retrospective RFC** — complete the full RFC within 48 hours
5. **PIR** — mandatory within 48 hours, presented at next regular CAB meeting

Emergency changes that skip ECAB entirely must be flagged as policy violations and reviewed by management.

---

## Standard Change Catalog

Standard changes are pre-authorized by CAB as categories. Maintain a catalog:

| Standard Change | Pre-conditions | Procedure Reference |
|---|---|---|
| User account creation | Approved HR request | SOP-001 |
| Password reset | Identity verified | SOP-002 |
| Routine patching (approved schedule) | Patch tested in non-prod | SOP-010 |
| VM resource scaling (within limits) | Within approved thresholds | SOP-015 |
| Certificate renewal | 30-day advance notice | SOP-020 |

New standard change types must be approved by CAB before inclusion in the catalog.
