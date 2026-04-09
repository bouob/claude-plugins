# AI Change Request — RFC Template Reference

Complete field-by-field guidance for the AI Change RFC. Use when the SKILL.md template needs clarification on what to write in each section.

---

## Field-by-Field Guide

### Header Fields

**Change Type Classification for AI Changes**

| Scenario | Type | Why |
|---|---|---|
| Same model, patch version update | Standard (if pre-authorized) | Behavior change minimal, reversible |
| Major model upgrade (same provider) | Normal (Significant) | New capabilities, behavior changes expected |
| Provider migration | Normal (Major) | Significant behavior change, new dependencies |
| Autonomy expansion (Cognition/Coordination) | Normal (Major) | Governance impact beyond technical change |
| Emergency rollback of harmful AI output | Emergency | Immediate action required |

**Risk Level Guidance**

The standard Impact × Likelihood risk score applies, but calibrate with AI-specific factors:
- AI behavior is probabilistic — "it worked in 1000 test cases" is less certain than deterministic code
- Cascade effects: AI feeding into downstream systems amplifies impact
- Detection difficulty: harmful AI behavior may not trigger standard monitoring

---

### AI System Description

This section captures the before/after state of the AI system precisely enough that the CAB understands what is changing.

**Model / System name**: The name users and operators know the system by (not internal artifact ID).

**Model version**: Exact version identifier. For LLM APIs: `claude-sonnet-4-6`, `gpt-4o-2024-11-20`. For internally hosted models: the artifact version or training run ID.

**Provider**: `Anthropic`, `OpenAI`, `Google`, `internal`, etc. Provider changes affect contract terms and data processing agreements — note if the provider is changing.

**6C capabilities**: List only the capabilities this system actively uses in production. If the system was classified as Clarification but you're adding a Coordination capability (e.g., AI now triggers a workflow), mark that addition explicitly — it's a governance-relevant scope change.

**Training data cutoff**: For externally hosted LLMs, document the stated knowledge cutoff. For internally trained models, document the date range of training data.

---

### AI Governance Assessment — Field Guidance

**Behavior change scope**

| Rating | Meaning | When to Use |
|---|---|---|
| Narrow | Behavior changes are limited to specific, tested scenarios | Model patch update, small prompt addition |
| Broad | Behavior changes across many interactions expected | Model version upgrade, significant prompt rewrite |
| Unknown | Behavior change scope was not fully characterized in testing | Flag to CAB — needs additional testing before approval |

**Bias/fairness tested**

Testing is required for changes to customer-facing AI systems. Testing is optional for purely internal tools with no user-facing output.

Minimum testing for customer-facing changes:
- Demographic parity check (does the AI treat different demographic groups differently?)
- Fairness on known edge cases from previous incidents
- A-B comparison against previous version on representative sample

Document: test method, sample size, who conducted it, results, and any identified issues with planned mitigations.

If "Not applicable": document the reason (e.g., "Internal code generation tool with no user-facing output, no demographic exposure").

**Explainability level**

| Level | Meaning | Governance Implication |
|---|---|---|
| Full | AI decisions are traceable step-by-step | Lowest governance overhead |
| Partial | Key decision factors are logged, but not complete reasoning | Document which factors are logged |
| Black-box | Output explanation not available | Higher oversight required; consider Cognition capability limits |

For Cognition-class changes with Black-box explainability: requires explicit CAB approval with documented acceptance of the explainability gap.

**Regulatory flags**

As of 2026-Q1 relevant regulations:
- **EU AI Act**: High-risk categories (employment decisions, credit scoring, biometric processing, critical infrastructure) require mandatory conformity assessment before deployment
- **GDPR Article 22**: Automated decisions with legal effects require human review option
- **Industry-specific**: Financial services (SR 11-7 equivalent), healthcare (FDA guidance on AI/ML software), etc.

If any flag is "Review needed": escalate to legal/compliance before CAB submission. Do not proceed with change until cleared.

**Human approval points**

For Cognition and Coordination capabilities, list every point in the AI workflow where a human reviews or approves the AI's output before it has real-world effect.

Example for an AI that generates and sends status page updates:
```
Human approval points:
1. AI drafts status update → on-call engineer reviews before posting
2. AI suggests escalation to P1 → incident manager confirms
(No autonomous actions — all AI outputs reviewed before effect)
```

Example for an AI with limited autonomy:
```
Human approval points:
1. AI auto-routes tickets (Coordination, pre-authorized) — no approval needed for routing
2. AI suggests KB article for response → agent reviews before sending (human in loop)
3. AI flags for escalation > P2 → manager confirms (high-stakes requires human)
```

---

### Post-Implementation Validation

AI validation requires both technical and behavioral checks:

**Technical checks** (same as standard changes):
- Service health, error rates, latency within thresholds

**Behavioral checks** (AI-specific):
- Run a sample of representative prompts and compare outputs to expected behavior
- Check for capability regression (does the AI still handle known edge cases correctly?)
- For Cognition/Coordination: verify that human approval points are functioning

**Validation sample size guidelines**:
- Low-traffic AI system: 50–100 representative prompts
- Medium-traffic: 200–500 prompts, stratified by use case
- High-traffic, customer-facing: Statistical sample from production traffic within first 2 hours

---

### Rollback Plan

AI rollback is distinct from infrastructure rollback:

**Infrastructure rollback**: Restore previous model artifacts, container image, or API configuration.

**Behavioral rollback verification**: After restoring previous artifacts, re-run the behavioral validation sample to confirm the AI is acting as it did before the change — not just that the old infrastructure is running.

**Rollback trigger criteria** (examples):
```
Rollback if ANY of the following within 2 hours of deploy:
- Error rate > 5% on payment-related AI interactions
- Any detected harmful, biased, or policy-violating output
- Latency P99 > 3x pre-change baseline
- User escalation rate > 2x baseline
```

Make trigger criteria specific and measurable. "If something seems wrong" is not a trigger criterion.
