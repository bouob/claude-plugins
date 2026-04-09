# Known Error Database (KEDB)

Reference for Step 5 of the `/problem` skill.

---

## What is a Known Error?

A Known Error is a problem that has been analyzed and has a documented root cause (or suspected root cause), but does not yet have a permanent fix deployed. The defining characteristic is that a **reliable workaround exists**.

```
Problem (root cause unknown) → Known Error (root cause known, workaround available, fix pending) → Closed (permanent fix deployed)
```

Not every problem becomes a Known Error. If the permanent fix is deployed immediately after root cause identification, close the problem directly.

---

## When to Register a Known Error

Register a Known Error when ALL THREE are true:

1. Root cause is **identified** (or the suspected cause is confident enough to support a reliable workaround)
2. A **workaround exists** that reliably restores service when the issue occurs
3. Permanent fix is **not yet deployed** (pending change approval, development, or scheduling)

If the workaround is unreliable or partial, note that in the Known Error record and escalate urgency of the permanent fix.

---

## Known Error Record Structure

Add this section to the Problem Record when registering:

```markdown
## Known Error Registration

**Registered as Known Error:** Yes
**Registration Date:** {YYYY-MM-DD}
**Confidence in Root Cause:** High / Medium / Low

### Root Cause Summary

{One clear sentence describing the root cause.}

### Reliable Workaround

**Workaround steps:**
1. {Step 1}
2. {Step 2}
3. {Step 3}

**Expected outcome:** {What the workaround achieves — e.g., "Service restored within 5 minutes"}
**Workaround limitations:** {Any cases where the workaround does not work}
**Time to apply workaround:** {Estimated time for on-call to execute}

### Permanent Fix Status

**Fix approach:** {Describe the planned permanent fix}
**Linked RFC:** {CHG-ID or "Not yet created"}
**Target date:** {YYYY-MM-DD or "TBD"}
```

---

## KEDB as a Team Resource

The Known Error Database exists to reduce mean time to recovery (MTTR) for recurring issues. When a known error is registered:

1. **Share with the on-call rotation** — anyone responding to the incident should find the workaround immediately
2. **Link from the monitoring alert** — if your alerting tool supports runbook links, link to the Known Error workaround
3. **Update the incident skill** — Known Error workarounds should be the first thing checked during incident investigation
4. **Review regularly** — Known Errors with no permanent fix plan after 90 days should be escalated

---

## Known Error Lifecycle

```
Problem opened → Root cause identified → Known Error registered → Workaround documented
                                                  ↓
                                     Permanent fix developed (RFC created)
                                                  ↓
                                     Fix deployed and verified
                                                  ↓
                                Known Error closed → Problem closed
```

---

## Closing a Known Error

Close the Known Error when:

- **Permanent fix deployed**: RFC implemented, verified the issue no longer occurs
- **Risk accepted**: Management decision to live with the workaround (document reason and sign-off)
- **Duplicate**: Another problem record covers the same root cause (link to it)

Closing checklist:
- [ ] Permanent fix confirmed working in production
- [ ] Workaround document updated to note the fix is deployed
- [ ] Linked incidents confirmed as no longer recurring
- [ ] On-call rotation notified that the Known Error is resolved
- [ ] Monitoring alert runbook link updated or removed

---

## Integration with the `/incident` Skill

When an incident is opened that matches a Known Error:

1. Check the KEDB before starting investigation
2. Apply the documented workaround first
3. Note in the incident timeline: "Known Error PRB-{ID} — workaround applied"
4. Incident resolution time should be significantly shorter than the original incident

This is why maintaining accurate Known Error records directly reduces MTTR for the team.
