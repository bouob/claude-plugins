# Root Cause Analysis Techniques

Reference for Step 4 of the `/problem` skill. Choose the method that fits the complexity of the problem.

---

## Method Selection Guide

| Method | Best For | Time Required | Team Size |
|---|---|---|---|
| **5 Whys** | Linear cause chains, straightforward failures | 30–60 min | 1–3 people |
| **Fishbone (Ishikawa)** | Multi-factor failures, cross-team causes | 60–90 min | 3–8 people |
| **Pareto Analysis** | Prioritizing among many known contributing factors | 60 min | 1–2 people |
| **Kepner-Tregoe** | Safety-critical, high-stakes, complex systems | 2–4 hours | 4–10 people |

**Default**: Start with 5 Whys. If the chain splits into multiple parallel causes, switch to Fishbone.

---

## 5 Whys

### Concept
Ask "why" repeatedly until you reach a root cause that, if fixed, would prevent recurrence. Typically 4–6 iterations.

### Process

1. Write the problem statement clearly
2. Ask "Why did this happen?" — write the answer
3. For the answer, ask "Why did *that* happen?" — write the answer
4. Repeat until you reach a cause that is:
   - Within your team's ability to change
   - Would prevent the problem if fixed

### Example

```
Problem: Email service failed to send outbound messages for 45 minutes

Why? → The mail queue service ran out of memory
Why? → A batch job ran during business hours instead of off-hours
Why? → The batch job schedule was changed last week without updating the maintenance window
Why? → There was no process requiring schedule changes to be reviewed for resource impact
Why? → The change management process does not include a resource conflict check step

Root cause: Change management process lacks resource conflict validation
Fix: Add resource impact check to change request workflow
```

### Pitfalls to Avoid

- Stopping too early ("human error" — keep asking why that was possible)
- Jumping to solutions before finishing the why chain
- Multiple "why" answers at one level — this signals a Fishbone is needed
- Assigning blame instead of identifying process gaps

---

## Fishbone Diagram (Ishikawa)

### Concept
A cause-and-effect diagram that maps contributing factors across multiple categories. Named for its visual resemblance to a fish skeleton.

### Standard Categories (adapt as needed)

| Category | In IT Operations Context |
|---|---|
| **People** | Skills, training, staffing, communication gaps |
| **Process** | Workflow steps, approval chains, runbook completeness |
| **Technology** | Tools, monitoring, automation, configuration |
| **Environment** | Infrastructure, network, dependencies, external services |
| **Management** | Policies, resource allocation, prioritization decisions |
| **Measurement** | Metrics, alerting thresholds, observability gaps |

### Process

1. Write the problem statement in the "fish head" (right side)
2. Draw 4–6 "bones" for categories
3. For each category, brainstorm contributing factors as sub-bones
4. For each factor, ask "why?" to add deeper sub-branches
5. Identify the factors that appear across multiple categories — these are highest priority

### Text Representation

When working in a text-based environment (no whiteboard):

```
PROBLEM: Payment service 23-minute outage

People:
  └─ On-call was investigating wrong service initially
       └─ Alert message did not include affected service name

Process:
  └─ Deploy rollback procedure was not in the runbook
       └─ Runbook last updated 18 months ago
  └─ Smoke test did not cover payment flow
       └─ Smoke tests not updated after payment service refactor

Technology:
  └─ Schema migration ran during deploy without pre-flight check
       └─ Deploy pipeline has no pre-migration validation step
  └─ Error monitoring threshold set too high (missed first 5 minutes)

Environment:
  └─ Staging DB schema diverged from production
       └─ No automated schema sync check in CI
```

---

## Pareto Analysis (80/20 Rule)

### Concept
When you have a list of known contributing factors or incident types, Pareto helps identify which 20% of causes produce 80% of the impact. Use when you already know the factors and need to prioritize fixes.

### Process

1. List all contributing factors or incident types
2. Measure frequency or impact of each (count incidents, estimate revenue impact, etc.)
3. Sort descending by impact
4. Calculate cumulative percentage
5. The factors above 80% cumulative = highest priority

### Example

| Factor | Incident Count | Cumulative % |
|---|---|---|
| Deploy without smoke test | 12 | 40% |
| Missing rollback procedure | 9 | 70% |
| Stale runbook | 5 | 87% |
| Missing monitoring coverage | 3 | 97% |
| Insufficient load testing | 1 | 100% |

Fix the top 2 factors first (deploy smoke test + rollback procedure) — they cover 70% of incidents.

---

## Kepner-Tregoe (KT) Problem Analysis

### When to Use
Use for high-stakes, complex, or safety-critical problems where the cost of a wrong root cause hypothesis is high. Requires trained facilitator and significant time investment.

### Core Questions

KT separates IS from IS NOT to precisely define the problem boundary:

| Dimension | IS | IS NOT |
|---|---|---|
| **What** | What exactly is failing? | What is similar but working? |
| **Where** | Where does the failure occur? | Where doesn't it occur? |
| **When** | When does it fail (time, sequence)? | When doesn't it fail? |
| **Extent** | How many are affected? | How many similar things are not affected? |

### Process

1. Define the problem precisely using IS / IS NOT
2. List all distinguishing features — what makes the IS unique vs. the IS NOT
3. Generate hypotheses: what change could explain all IS and none of IS NOT?
4. Test each hypothesis against the distinguishing features
5. The hypothesis that explains all IS and none of IS NOT is the probable cause
6. Verify by testing: can you reproduce the failure with the hypothesized cause?

---

## Documenting RCA Findings

Regardless of method used, document in the Problem Record:

```markdown
### Root Cause Analysis

**Method used**: {5 Whys / Fishbone / Pareto / Kepner-Tregoe}

**Process summary**: {Brief description of who was involved and how the analysis was conducted}

**Contributing factors**:
- {Factor 1}
- {Factor 2}

**Root cause**: {Single clear statement of the underlying cause}

**Evidence**: {How was the root cause confirmed? Test, log entry, reproduction?}
```
