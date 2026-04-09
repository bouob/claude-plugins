# AI Governance — ITIL v5 6C Capability Model

> **Shared reference for `/change-request`, `/ai-change`, `/incident`, and `/postmortem`**

ITIL v5 introduces AI governance as its only dedicated extension module. The 6C model classifies AI capabilities and their corresponding governance requirements.

---

## The 6C AI Capability Model

| Capability | Definition | ITSM Examples | Governance Risk |
|---|---|---|---|
| **Creation** | Generating new content | Incident summaries, postmortem drafts, RFC descriptions, status page updates | Output accuracy, hallucination, IP ownership |
| **Curation** | Organizing and filtering information | Alert correlation, noise reduction, knowledge base summarization | Bias in filtering, missed critical alerts |
| **Clarification** | Explaining or simplifying | Translating technical details into stakeholder updates, policy explanations | Oversimplification, context loss |
| **Cognition** | Making decisions or predictions | Incident severity auto-classification, likely root cause suggestions, change risk scoring | Decision accountability, explainability requirement |
| **Communication** | Interacting with humans | Slack/Teams bots, automated status updates, chatbot service desk | Tone appropriateness, unauthorized actions |
| **Coordination** | Orchestrating workflows | Auto-assigning responders, triggering runbooks, escalation workflows | Scope creep, authorization boundaries |

---

## Governance Requirements by Capability

### High-risk capabilities (Cognition + Coordination)
These capabilities make decisions or take actions — requiring the strongest governance controls:

- **Human-in-the-loop approval** before any autonomous action affecting production
- **Full audit trail**: what the AI decided, why, and who approved
- **Override mechanism**: humans must always be able to countermand AI decisions
- **Defined authority scope**: explicit list of what AI is authorized to do without approval

### Medium-risk capabilities (Creation + Communication)
These capabilities produce outputs that humans consume — requiring review before use:

- **Review before publish**: AI-generated communications reviewed before sending to external audiences
- **Attribution**: make clear when content is AI-generated
- **Feedback loop**: mechanism to flag inaccurate AI outputs

### Lower-risk capabilities (Curation + Clarification)
These capabilities assist rather than decide — still require oversight:

- **Bias checks**: ensure curation doesn't systematically exclude important information
- **Context preservation**: clarification must not distort the original meaning

---

## Four AI Governance Challenges (ITIL v5)

### 1. Autonomy in Decision-Making
AI systems make choices without human approval at each step. The risk is unauthorized or incorrect decisions propagating at machine speed.

**Mitigation**: Define exact autonomy boundaries in the AI system's RFC. Any expansion of autonomous scope requires a new change record.

### 2. Lack of Transparency
It's often unclear why an AI made a particular decision (black-box models).

**Mitigation**: Require explainability documentation for any AI capability classified as Cognition or Coordination. "Why did the AI do X?" must have a traceable answer.

### 3. Evolving Ethical Dilemmas
Edge cases that weren't anticipated in the design phase emerge in production.

**Mitigation**: Regular bias/fairness reviews (quarterly minimum for customer-facing AI). Known edge-case failures documented in the Known Error Database.

### 4. Fast-Changing Regulatory Requirements
EU AI Act, NIST AI RMF, and national frameworks are actively evolving as of 2026.

**Mitigation**: Assign a "regulatory owner" for each AI system. Track relevant regulations in a living document. Schedule annual compliance reviews.

---

## ITIL v5 AI Governance Core Principles

1. **AI recommends, humans approve** — No AI system in Cognition or Coordination mode operates without defined human checkpoints
2. **Full traceability** — Every AI-influenced decision must be logged: input → AI output → human decision → action taken
3. **Reversibility** — All AI-driven changes must have a rollback plan, same as any other change
4. **Proportionate governance** — Governance overhead scales with AI capability risk level (Creation < Coordination)
5. **Continuous improvement** — AI governance is not a one-time audit; it improves through incident and postmortem learnings

---

## Classifying an AI System Change

When creating a change record for an AI system, identify which 6C capabilities are involved:

```
☐ Creation    — generates text, summaries, or reports
☐ Curation    — filters, ranks, or organizes information
☐ Clarification — rewrites or explains content
☐ Cognition   — makes decisions or predictions (HIGH RISK — requires ECAB if Emergency)
☐ Communication — sends messages or interacts with humans
☐ Coordination — triggers workflows or assigns resources (HIGH RISK)
```

Changes involving Cognition or Coordination require at minimum a Normal (Significant) change with full CAB review, regardless of the technical implementation's apparent simplicity.

---

## Related References

- `itil-v5-overview.md` — Full ITIL v5 context
- `change-enablement.md` — AI/ML System Changes section, GitOps patterns
- `sustainability.md` — AI compute energy considerations
- `sre-integration.md` — AIOps integration with incident management
