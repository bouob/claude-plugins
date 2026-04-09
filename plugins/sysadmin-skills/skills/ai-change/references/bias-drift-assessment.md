# Bias, Drift, and Explainability Assessment

Reference for Step 4 (AI Risk Assessment) of the `/ai-change` skill.

---

## Why These Matter

AI systems can silently degrade in ways that traditional monitoring misses:

- **Bias**: The AI produces systematically different outcomes for different groups, often in ways that violate fairness expectations or regulations
- **Model drift**: The AI's behavior diverges from its original deployment behavior over time (input distribution shift, feedback loop effects)
- **Explainability gap**: Decisions made by the AI cannot be traced or audited, creating liability exposure

ITIL v5 AI Governance requires that these risks are assessed and documented before any AI change is deployed to production.

---

## Bias Assessment

### What to Check

| Bias Type | Description | How to Test |
|---|---|---|
| **Demographic parity** | Does the AI treat different demographic groups (age, gender, race, language) differently? | Compare outputs across group-stratified test samples |
| **Representation bias** | Is the AI's knowledge or vocabulary skewed toward certain cultures or regions? | Test with inputs from different cultural contexts |
| **Task bias** | Does the AI perform worse on certain task types? | Performance benchmarks across task categories |
| **Feedback loop bias** | Does the system reinforce existing patterns (e.g., only routing certain ticket types to certain teams)? | Analyze routing distribution over time |

### Minimum Testing Requirements

**Internal tool (no external user exposure):**
- Basic output review: 50–100 representative inputs covering known edge cases
- Document: "Internal tool, no demographic exposure, standard quality review conducted"

**Customer-facing AI (English-only, single region):**
- 200+ representative prompts stratified by use case
- Manual review of 20+ samples per category
- Comparison against previous version outputs

**Customer-facing AI (multilingual or multi-region):**
- 500+ prompts with language/region stratification
- Native speaker review for non-English outputs
- Regulatory review if operating in EU (EU AI Act)

**AI with Cognition capability (makes decisions):**
- Above requirements, plus:
- Pairwise fairness testing: same scenario, different demographic signals
- Legal review if decisions affect employment, credit, healthcare, or law enforcement

### Documentation Template

```
Bias/Fairness Testing Summary

Method: {Manual review / Automated benchmark / Third-party audit}
Sample size: {N prompts}
Test date: {YYYY-MM-DD}
Tester: {Team or role}

Results:
- Demographic parity: {Pass / Fail / N/A — details}
- Representation: {Pass / Fail / N/A — details}
- Task performance: {Pass / Fail — categories tested}

Known issues identified: {Describe or "None"}
Mitigation for known issues: {Describe or "N/A"}

Sign-off: {Role who approved the test results}
```

---

## Model Drift Detection

Drift occurs when the AI's behavior changes over time without an intentional update. Changes to the surrounding system (new inputs, feedback loops, data pipeline changes) can cause drift even when the model weights haven't changed.

### Types of Drift

| Type | What Changes | Example |
|---|---|---|
| **Input drift** | The distribution of inputs changes | Customers start using the AI for new topics not in training data |
| **Output drift** | AI outputs shift from baseline patterns | Average response length changes; sentiment of responses changes |
| **Performance drift** | Accuracy/quality measurably degrades | Customer satisfaction with AI responses drops over time |
| **Covariate shift** | Feature distributions change but label distributions don't | Same questions, but phrased differently due to UI change |

### Drift Monitoring

For each AI change, document the baseline metrics that will be monitored for drift:

```
Drift Monitoring Baseline (captured at deploy time)

Metric                    | Baseline Value | Alert Threshold | Measurement Window
--------------------------|----------------|-----------------|-------------------
Response length (P50)     | {N tokens}     | ±20%            | 7-day rolling
User satisfaction score   | {N/5}          | < {N-0.3}       | 7-day rolling
Error/refusal rate        | {N%}           | > {2x baseline} | 24-hour
Task completion rate      | {N%}           | < {baseline-5%} | 7-day rolling
```

Set up automated alerts for drift thresholds. Significant drift triggers a problem investigation (`/problem` skill) not a new change request.

---

## Explainability Assessment

### Explainability Levels

| Level | Description | Governance Requirement |
|---|---|---|
| **Full** | Every output has a traceable reasoning chain (chain-of-thought, rule-based system) | Standard monitoring |
| **Partial** | Key decision factors are logged (input features, retrieved documents, confidence scores) | Log retention policy required; audit-ready |
| **Black-box** | Model produces output without traceable reasoning | Higher oversight required; strict human review for Cognition/Coordination |

### Explainability by Capability

| 6C Capability | Minimum Explainability | Notes |
|---|---|---|
| Creation | None required | Output is content, not a decision |
| Curation | Partial | Log which items were selected and why (if deterministic criteria exist) |
| Clarification | None required | Clarification doesn't make binding decisions |
| Cognition | Partial minimum | Full preferred; Black-box requires explicit CAB acceptance and human override |
| Communication | None required | Communication doesn't make decisions |
| Coordination | Partial minimum | Log what was triggered and what input caused it |

### Explainability Documentation Template

```
Explainability Assessment

Capability classification: {Creation / Curation / Clarification / Cognition / Communication / Coordination}
Explainability level: {Full / Partial / Black-box}

What is logged:
- {Input/prompt — Yes/No}
- {Retrieved context (for RAG) — Yes/No}
- {Output — Yes/No}
- {Confidence scores — Yes/No}
- {Reasoning chain — Yes/No (chain-of-thought)}

Log retention: {N days/months}
Audit access: {Who can access logs for compliance review}

If Black-box:
- Justification for accepting black-box: {Reason}
- Compensating controls: {What human oversight exists to catch errors}
- CAB explicit acceptance required: Yes
```

---

## Regulatory Reference (2026-Q1)

> This is a general reference. Always consult your legal/compliance team for jurisdiction-specific requirements.

| Regulation | Scope | AI Relevance |
|---|---|---|
| **EU AI Act** (enforcing 2026) | EU users | High-risk AI systems require conformity assessment. Prohibited uses include real-time biometric identification in public spaces, social scoring. |
| **GDPR Article 22** | EU users | Automated decisions with legal/significant effects require human review option and right to explanation. |
| **NIST AI RMF** (US, voluntary) | US organizations | Framework for managing AI risk — not legally binding but increasingly referenced in contracts. |
| **FRB SR 11-7 equivalent** | Financial services | Model risk management guidelines apply to AI models used in credit, fraud, or trading decisions. |
| **FDA AI/ML SaMD guidance** | Healthcare | AI/ML Software as Medical Device guidance governs AI in diagnostic or treatment tools. |

Document which regulations apply to your AI system in the RFC's Regulatory Flags field.
