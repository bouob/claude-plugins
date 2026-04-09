# Action Item Patterns for Postmortems

Reference for Step 6 of the `/postmortem` skill. Good action items are the measure of a good postmortem — they determine whether learning translates into systemic improvement.

---

## The SMART Standard

Every action item must be:

| Criterion | What It Means | Example |
|---|---|---|
| **Specific** | One clear, unambiguous action | "Add smoke test for payment checkout flow to CI pipeline" — not "improve testing" |
| **Measurable** | The outcome is verifiable | "Smoke test runs on every deploy and blocks merge if failing" |
| **Achievable** | Realistic given team capacity | Don't create 20 action items after one incident |
| **Relevant** | Addresses a confirmed contributing factor | Tied to something in the Contributing Factors section |
| **Time-bounded** | Has a due date | `{YYYY-MM-DD}` — not "soon" or "next quarter" |

---

## Action Item Categories

### Prevention (highest value)
Prevents the same failure mode from occurring again.

```
Action: Add pre-migration validation step to the deploy pipeline that checks schema compatibility
Contributing factor addressed: Deploy pipeline did not check for breaking schema changes
Owner: Platform team
Due: 2026-05-01
```

### Detection (high value)
Reduces time-to-detect for this class of failure.

```
Action: Lower payment error rate alert threshold from 5% to 1%, with a 2-minute sustained window
Contributing factor addressed: Alert threshold too high — delayed detection by 5 minutes
Owner: Observability team
Due: 2026-04-20
```

### Response (medium value)
Reduces time-to-resolve by improving runbooks, tooling, or on-call readiness.

```
Action: Add automated rollback step to payment service deploy pipeline triggered by > 2% error rate
Contributing factor addressed: Rollback procedure was manual and took 8 minutes
Owner: Platform team + Payment team
Due: 2026-05-15
```

### Resilience (long-term value)
Makes the system tolerant of the failure, even if it occurs again.

```
Action: Implement circuit breaker in payment gateway client with fallback to queued retry
Contributing factor addressed: Single point of failure in payment service dependency
Owner: Payment team
Due: 2026-06-01
```

### Documentation (quick win)
Updates runbooks, playbooks, or on-call guides.

```
Action: Update payment service runbook to include "check DB schema migration status" as step 2 of the investigation checklist
Contributing factor addressed: Runbook did not cover schema migration failures
Owner: On-call rotation lead
Due: 2026-04-15
```

---

## Prioritization

Not all action items are equally valuable. Prioritize:

1. **High**: Items that prevent recurrence or significantly reduce blast radius
2. **Medium**: Items that improve detection or response speed
3. **Low**: Documentation updates, nice-to-haves, architectural improvements (important but not urgent)

If you have more than 5 action items, the postmortem has identified too many — consolidate or create a separate improvement project for lower-priority items.

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Better Approach |
|---|---|---|
| "Improve monitoring" | Not specific or measurable | "Add latency histogram to payment API dashboard with P99 threshold alert at 1s" |
| "Train the team" | Learning without structure rarely sticks | "Add this scenario to the on-call runbook and schedule a 30-min tabletop exercise" |
| "Be more careful" | Relies on individual behavior change | "Add automated validation to remove the need for this manual check" |
| No owner | Action items without owners don't get done | Always assign to a role or team |
| No due date | "Eventually" never arrives | Set a specific date; accept it may slip, but start with a target |
| Too many items | Team gets overwhelmed, few get done | Pick the top 3–5; log the rest in a backlog |

---

## Tracking Action Items

After the postmortem is published:

1. **Create tickets** in your issue tracker for each action item (Jira, Linear, GitHub Issues, etc.)
2. **Link tickets** to the postmortem document
3. **Review at 30 days**: are high-priority items completed or on track?
4. **Close the postmortem** only after verifying that high-priority items are either completed or have an active ticket with a realistic date

### Check-in Template (30-day review)

```markdown
## Action Item Check-in ({YYYY-MM-DD})

| Action | Status | Notes |
|---|---|---|
| {Action from postmortem} | Completed / In Progress / Blocked / Deferred | {Link to ticket or note} |
```

---

## Connection to Problem Records

If a contributing factor involves a recurring technical issue that requires deeper investigation, create a Problem record using `/problem` and link it to the action items:

```
Action: Investigate root cause of intermittent DB connection pool exhaustion (see /problem skill)
Owner: Database team
Linked Problem: PRB-20260410-001
Due: Investigation complete by 2026-05-01
```

The postmortem owns the learning; the problem record owns the technical investigation. Both are needed for systemic improvement.
