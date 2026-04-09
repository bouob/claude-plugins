# SRE Integration with ITIL v5

> **Shared reference for `/incident`, `/postmortem`, `/change-request`**

Site Reliability Engineering (SRE) and ITIL v5 are complementary, not competing. ITIL provides the organizational framework; SRE provides the engineering discipline. This reference explains where they intersect in daily operations.

---

## SRE + ITIL v5 Alignment

| SRE Concept | ITIL v5 Equivalent | How They Connect |
|---|---|---|
| Service Level Indicator (SLI) | Service metric / KPI | The raw measurement (e.g., request success rate %) |
| Service Level Objective (SLO) | Internal service target | The reliability target the team commits to (e.g., 99.9%) |
| Service Level Agreement (SLA) | SLA (external) | Contractual commitment to customers (≤ SLO) |
| Error Budget | Availability headroom | The gap between 100% and SLO — used to balance velocity vs. reliability |
| Blameless Postmortem | Post-Incident Review (PIR) | SRE-style PIR with explicit blameless culture |
| Toil reduction | Automation (ITIL Optimize and Automate principle) | Eliminate repetitive manual work via automation |

---

## SLI / SLO / SLA Definitions

### SLI (Service Level Indicator)
A quantitative measure of a service characteristic:
- **Availability**: percentage of successful requests over a time window
- **Latency**: percentage of requests served within a threshold (e.g., < 200ms)
- **Error rate**: percentage of requests that return errors
- **Throughput**: volume of successful transactions per second

### SLO (Service Level Objective)
The reliability target you set for an SLI. Example:
```
SLO: 99.9% of HTTP requests return 2xx within 500ms, measured over a 28-day rolling window
```

SLOs are internal commitments — they set the standard your incident priorities are measured against.

### SLA (Service Level Agreement)
External, contractual reliability commitments. SLA ≤ SLO always — your internal target must be stricter than your customer promise.

---

## Error Budget

### Definition
```
Error Budget = 1 - SLO

Example: 99.9% SLO → 0.1% error budget
Over 28 days = 28 * 24 * 60 * 0.001 = ~40 minutes of allowed downtime
```

### Error Budget and Incident Priority

| Error Budget Status | Incident Adjustment |
|---|---|
| > 50% remaining | Standard priority per Impact × Urgency matrix |
| 10–50% remaining | Escalate P3 → P2; consider change freeze for risky changes |
| < 10% remaining | Escalate P2 → P1; freeze non-critical changes immediately |
| **Exhausted (0%)** | All incidents auto-P1 until budget recovers; full change freeze |

Error budget burn rate should be visible on your monitoring dashboard. When budget is exhausted, the SRE principle is: reliability work takes absolute priority over feature work.

### Change Freeze When Budget is Exhausted
When error budget reaches 0%:
1. Pause all Normal and Standard changes
2. Only Emergency changes (active incident fixes) are permitted
3. Budget recovers at the next SLO measurement window reset
4. Retrospective required: what burned the budget?

---

## AIOps and Incident Detection

Modern incident detection increasingly relies on AI/ML systems. ITIL v5 integrates this through the AI Governance principle: **AI recommends, humans approve**.

### AIOps in the Incident Detection Layer

```
Traditional:          Alert → Monitoring System → On-call page
AIOps-augmented:      Metrics → ML anomaly detection → Correlated alert group → Human review → Page
```

Benefits of AIOps detection:
- Reduces alert noise (correlation reduces 100 raw alerts to 3 meaningful incidents)
- Earlier detection of slow degradation (below threshold but trending bad)
- Cross-service correlation (identifies that service A's slowness is caused by service B's saturation)

### Governance Requirements for AIOps Detection

These requirements derive from ITIL v5 AI Governance (see `ai-governance-6c.md`):

1. **Human confirmation before P1 escalation**: AIOps systems should recommend severity, not auto-declare P1
2. **Explainability**: "Why did the system flag this as an incident?" must have a traceable answer
3. **Feedback loop**: False positives and missed detections should feed back into model improvement
4. **Override always available**: On-call engineers can escalate or de-escalate AI suggestions

---

## Blameless Postmortem Principles (Google SRE)

The blameless postmortem is the SRE approach to Post-Incident Review. Use `/postmortem` skill for the full workflow. Core principles:

### Why Blameless?
People make mistakes. Systems that punish mistakes create incentives to hide them. Blameless culture creates incentives to surface problems transparently so they can be fixed at the system level.

### Core Rules

1. **Assume good intent**: Every person involved was doing their best with the information they had at the time
2. **Facts, not blame**: "The deploy script did not check for database migration status" — not "Alice forgot to check the database"
3. **Systems thinking**: Most incidents result from complex interactions between systems, processes, and communication — not individual negligence
4. **Focus on contributing factors**: Multiple factors contributed; remove any one of them and the incident might not have happened
5. **Action items over apologies**: The output is a list of systemic improvements, not who said sorry

### Blameless Language Guide

| Instead of... | Write... |
|---|---|
| "He forgot to..." | "The deploy checklist did not include..." |
| "She didn't notice..." | "The monitoring alert threshold was set too high to detect..." |
| "They should have known..." | "The runbook did not cover this scenario..." |
| "Human error" | "The system allowed the invalid state to propagate" |

---

## When to Use This Reference

| Skill | When to Read |
|---|---|
| `/incident` | When calculating priority based on error budget, or when AIOps flagged the incident |
| `/postmortem` | Always — provides the blameless culture foundation |
| `/change-request` | When change freeze applies due to error budget exhaustion |
