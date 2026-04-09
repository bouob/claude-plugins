---
name: ai-change
description: 'Use this skill whenever the user wants change-management paperwork (RFC, change request, change record, governance doc, rollback doc, CAB submission) for anything AI or ML. This is the correct skill — not a generic RFC skill — any time the subject of the change is a model, LLM, chatbot, AI agent, prompt, RAG pipeline, embedding, knowledge base, training data, or fine-tuning job. Common situations: swapping LLM providers or model versions, deploying or retraining an ML model, RLHF or fine-tuning runs, editing production prompts, refreshing RAG sources, granting an agent new autonomous actions or tools, and emergency rollbacks when an AI is hallucinating or producing harmful output. Rule of thumb: if the user is asking for approval/governance paperwork AND the thing being changed could shift an AI''s behavior, this skill wins over any general change-request skill. Also use for questions about ITIL v5 AI Governance or the 6C model (Creation, Curation, Clarification, Cognition, Communication, Coordination).'
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - WebSearch
  - AskUserQuestion
argument-hint: '<description of the AI system change>'
user-invocable: true
---

# AI System Change Request Workflow

Structured change management for AI and ML systems, applying ITIL v5 AI Governance principles. Produces an RFC with an AI governance appendix.

This skill extends `/change-request` with AI-specific fields and governance requirements. For non-AI infrastructure changes, use `/change-request` instead.

## Related Skills (auto-loaded)

- **itil** — change types, risk matrix, CAB process; reads `references/ai-governance-6c.md` for 6C classification
- **done-ops** — verification gate before finalizing the change

---

## Output

File: `{OUTPUT_DIR}/ai-change-{YYYY-MM-DD}-{slug}.md`

- **slug**: kebab-case summary, e.g. `claude-sonnet-upgrade`, `rag-knowledge-base-refresh`, `sentiment-model-retrain`
- **Change ID** (`CHG-{YYYYMMDD}-{NNN}`): same format as standard RFC

Default output directory: `./changes/ai/`. Fall back to `./changes/` if that doesn't exist.

All change documents are written in English. Preview in user's preferred language before writing.

---

## What Counts as an AI System Change

| Change Type | Examples |
|---|---|
| **Model version update** | Upgrading from GPT-4 to GPT-4o, Claude 3.5 → Claude Sonnet 4.6 |
| **Prompt engineering** | Modifying system prompts, changing output format, adding/removing instructions |
| **Training data** | Adding new data sources, re-weighting, removing data segments, updating cutoff date |
| **RAG / knowledge base** | Updating indexed documents, changing chunking strategy, switching embedding models |
| **AI autonomy expansion** | Allowing AI to take more actions without human approval |
| **Model retraining / fine-tuning** | Domain adaptation, task-specific fine-tuning, RLHF updates |
| **AI infrastructure** | Changing inference hardware, updating serving configuration, scaling policies |

If unsure whether a change qualifies, apply this test: **Could the AI's behavior change as a result?** If yes, this skill applies.

---

## Workflow

### Step 1: Gather Change Details

Collect the following (use AskUserQuestion for missing items):

| Field | Required | Example |
|---|---|---|
| What AI system is changing? | Yes | "Customer service chatbot using Claude Sonnet" |
| What specifically is changing? | Yes | "Upgrading from claude-3-5-sonnet to claude-sonnet-4-6" |
| Why is this change needed? | Yes | "Performance improvement, better reasoning capability" |
| What services/users are affected? | Yes | "All customer service chat interactions" |
| Proposed window? | Yes | "Saturday 02:00–04:00 UTC" |
| Has this been tested in staging? | Yes | "Yes — 500 test conversations analyzed" |

### Step 2: Classify the AI Capabilities

Load `itil/references/ai-governance-6c.md` and classify which capabilities this change affects:

```
Which 6C capabilities does this AI system use? (check all that apply)
☐ Creation    — generates text, summaries, or reports
☐ Curation    — filters, ranks, or organizes information
☐ Clarification — rewrites or explains content
☐ Cognition   — makes decisions or predictions  ← HIGH RISK
☐ Communication — sends messages or interacts with humans
☐ Coordination — triggers workflows or assigns resources  ← HIGH RISK
```

Changes involving **Cognition** or **Coordination** require:
- Minimum: Normal (Significant) change — full CAB review
- If these capabilities have expanded autonomy: additional ECAB or leadership approval

### Step 3: Classify the Change Type

Use the standard ITIL change types plus AI-specific guidance:

| Scenario | Classification |
|---|---|
| Model patch update (same API, same capabilities) | Standard — if pre-authorized in catalog |
| Model version upgrade (new capabilities, same provider) | Normal (Significant) |
| Switching AI provider | Normal (Major) — significant risk, full CAB |
| Prompt tuning (low-risk, staging-tested) | Standard — if pre-authorized |
| Adding new AI autonomy (Cognition/Coordination expansion) | Normal (Major) — requires explicit approval |
| Emergency prompt rollback (AI producing harmful output) | Emergency — abbreviated RFC, full RFC within 48h |

### Step 4: AI Risk Assessment

Rate standard risk dimensions, then add AI-specific dimensions:

**Standard risk assessment** (from `/change-request`):

```
| Dimension           | Rating | Justification |
|---|---|---|
| Impact (if failure) | {1-3}  | {Reason}      |
| Likelihood          | {1-3}  | {Reason}      |
| **Risk Score**      | **{N}**| **{Level}**   |
```

**AI governance assessment** (required for all AI changes):

```
| AI Dimension           | Status | Notes |
|---|---|---|
| Behavior change scope  | Narrow / Broad / Unknown | {What behaviors may change?} |
| Bias/fairness tested   | Yes / No / N/A | {Test method and result, or why not applicable} |
| Explainability level   | Full / Partial / Black-box | {How are decisions traceable?} |
| Regulatory flags       | None / Review needed / Blocked | {EU AI Act, GDPR, sector-specific rules} |
| Rollback plan          | Tested / Defined / Absent | {How to revert to previous AI version} |
| Human approval points  | {List checkpoints in the AI flow where humans review output} |
```

For detailed bias/drift/explainability assessment guidance, read `references/bias-drift-assessment.md`.

### Step 5: Build the RFC Document

Create the change file. MUST follow this structure:

```markdown
# AI Change Request: {TITLE}

| Field | Value |
|---|---|
| Change ID | CHG-{YYYYMMDD}-{NNN} |
| Change Type | Standard / Normal (Significant) / Normal (Major) / Emergency |
| Risk Level | {Low / Medium / High} (Score: {N}) |
| Status | Draft |
| Requester | {NAME / TEAM} |
| Date Submitted | {YYYY-MM-DD} |
| Proposed Window | {DATE TIME} to {DATE TIME} ({TIMEZONE}) |

## Business Justification

{Why this AI change is needed. What problem it solves or capability it improves. What happens if not implemented.}

## AI System Description

| Field | Current | After Change |
|---|---|---|
| Model / System name | {current} | {new} |
| Model version | {current version} | {target version} |
| Provider | {provider} | {provider} |
| 6C capabilities | {list} | {list — note any additions} |
| Training data cutoff | {date or "N/A"} | {date or "N/A"} |

## Scope and Impact

### Services Affected
{List of services, APIs, and user-facing features.}

### Users Affected
{Who will experience behavior changes. Estimated number.}

### Dependencies
{Other systems, models, or pipelines this change affects.}

## Risk Assessment

### Standard Risk
| Dimension           | Rating | Justification |
|---|---|---|
| Impact (if failure) | {1-3}  | {Reason} |
| Likelihood (of failure) | {1-3} | {Reason} |
| **Risk Score** | **{N}** | **{Low/Medium/High}** |

### AI Governance Assessment
| AI Dimension | Status | Notes |
|---|---|---|
| Behavior change scope | {Narrow / Broad / Unknown} | {Details} |
| Bias/fairness tested | {Yes / No / N/A} | {Test method/result} |
| Explainability level | {Full / Partial / Black-box} | {Details} |
| Regulatory flags | {None / Review needed} | {Details} |
| Rollback plan | {Tested / Defined / Absent} | {Rollback approach} |
| Human approval points | {Checkpoints} | |

## Implementation Plan

### Pre-Implementation
| Step | Action | Owner | Duration |
|---|---|---|---|
| 1 | Verify staging test results | {Team} | 15 min |
| 2 | Notify dependent teams | {Team} | 30 min |

### Implementation
| Step | Action | Owner | Duration |
|---|---|---|---|
| 1 | {Implementation step} | {Owner} | {Time} |

### Post-Implementation Validation
| Check | Expected Result | Method |
|---|---|---|
| {Behavior check} | {Expected AI output} | {Sample prompts / A-B comparison} |
| {Performance check} | {Latency / throughput target} | {Monitoring query} |

## Rollback Plan

**Trigger criteria:** {When to rollback — specific, measurable: e.g., "error rate > 5% on key flows, or any harmful output detected within 1 hour of deploy"}

**Estimated rollback time:** {Duration}

**Rollback steps:**
1. {Revert to previous model version / restore prompt config}
2. {Verify rollback is complete — AI behavior confirmed, not just infrastructure}

## Communication Plan

| When | Audience | Channel | Message |
|---|---|---|---|
| Before change | {Users/teams} | {Channel} | {Maintenance notice} |
| During (if issues) | {Teams} | {Channel} | Status update |
| After | {Users/teams} | {Channel} | Completion or rollback confirmation |

## Approvals

| Role | Name | Decision | Date |
|---|---|---|---|
| Change Manager | | | |
| AI System Owner | | | |
| CAB (if required) | | | |

## Related Records

{Linked incidents, problem records, or previous AI change records.}

---

## AI Governance Appendix

{Attach bias test results, A-B comparison data, staging evaluation summary, or any regulatory review documentation.}
```

### Step 6: CAB and AI Governance Review

For Normal and Emergency AI changes, prepare the CAB review:

**Standard CAB checklist** (from `/change-request`): Apply as usual.

**Additional AI governance checklist:**
- [ ] 6C capabilities correctly classified
- [ ] Behavior change scope is understood and documented
- [ ] Bias/fairness testing completed (or exemption documented)
- [ ] Explainability requirements met for this capability level
- [ ] Rollback plan includes AI behavior verification (not just infrastructure)
- [ ] Human approval points defined for Cognition/Coordination capabilities
- [ ] Regulatory review completed if required

### Step 7: Finalize

Load **done-ops** verification gate. Confirm:
- All required fields populated
- AI governance assessment realistic (not understated)
- Rollback plan verified (or reason for untested rollback documented)
- Communication plan covers all affected audiences

---

## Gotchas

- AI rollback is harder than infrastructure rollback — reverting the model doesn't restore conversation history or cached responses. Verify behavior has reverted, not just that the old model is active
- Prompt changes can have cascading behavior effects that staging doesn't catch — consider a canary rollout for significant prompt changes
- "It worked in staging" has a lower confidence threshold for AI changes than for deterministic code — LLM behavior is non-deterministic
- Changes to Cognition/Coordination capabilities that expand AI autonomy require explicit sign-off — don't bury this in a routine Normal change
- If the change involves customer-facing AI in the EU: check EU AI Act classification before CAB — this may be a legal blocker, not just a risk item
- Emergency AI changes (e.g., rolling back a prompt that produces harmful outputs) should be executed immediately; complete the full RFC within 48 hours
