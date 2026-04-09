---
name: done-ops
description: 'Operations task verification gate before claiming work is complete. This skill should be used before closing incidents, finalizing change requests, sending resolution notifications, or when asking "is this resolved?", "can we close this?", "is the change complete?", or verifying SLO compliance after an incident. Evidence before claims — verify operational status first.'
user-invocable: false
---

# Operations Verification Gate

**Core principle:** Evidence before claims, always.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If the service has not been verified as operational in this session, the task cannot be claimed as complete.

## Related Skills

- **/incident** — loads this skill before closing an incident
- **/change-request** — loads this skill before finalizing a change
- **itil** — provides the process framework for closure criteria

This skill is loaded as a gate by **/incident** and **/change-request**. It does not need to be invoked directly when using those workflows.

---

## The Gate

Before claiming any operational task is complete:

1. **IDENTIFY** — what evidence proves resolution/completion?
2. **VERIFY** — confirm the evidence is current (not from memory or earlier checks)
3. **DOCUMENT** — record the verification in the output document
4. **CONFIRM** — does the evidence satisfy the closure criteria?
   - NO → state actual status with evidence, identify remaining actions
   - YES → state claim WITH evidence

## Verification Requirements by Task Type

### Incident Closure

| Check | Required Evidence |
|---|---|
| Service restored | Service is accessible and functioning (confirmed by monitoring or manual test) |
| User confirmation | Affected user/team confirms the issue is resolved |
| Monitoring stable | No recurring alerts for the affected component within the observation period |
| Documentation complete | Timeline, actions taken, resolution, and follow-up items recorded |
| Problem record | Created if root cause is unknown or incident is recurring |
| Communication sent | Resolution notification sent to all parties who received the initial alert |
| SLO compliance checked | (Optional) Error budget impact estimated; note if budget is now < 10% |

### Change Request Closure

| Check | Required Evidence |
|---|---|
| Implementation complete | All steps in the implementation plan executed |
| Validation passed | Post-implementation checks confirm expected behavior |
| No regression | Related services unaffected (checked, not assumed) |
| Rollback not triggered | No rollback criteria were met during implementation |
| PIR scheduled | Post-Implementation Review scheduled within required timeframe |
| Users notified | Affected users informed of completion (if applicable) |

### Status Page Update

| Check | Required Evidence |
|---|---|
| All components operational | Each affected component verified and set to Operational |
| Resolved update posted | Final status update published with summary |
| Duration recorded | Accurate start and end times documented |
| Subscribers notified | Status page notification delivered |

## Red Flags — Stop and Verify

- Using "should be fine", "probably resolved", "seems stable"
- Closing an incident without contacting the reporter
- Marking a change as complete without running the validation plan
- Resolving a status page incident while components are still degraded
- Relying on "it was working earlier" instead of checking now
- Closing without documenting — if it is not written down, it did not happen

## Observation Periods

After resolution, observe before final closure:

| Priority | Observation Period |
|---|---|
| P1 | 1-2 hours of stability |
| P2 | 2-4 hours of stability |
| P3 | Confirm at next check-in |
| P4 | Immediate closure acceptable |
