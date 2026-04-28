# Harness Anti-Patterns — 9 Canonical Failure Modes

> When diagnosing a failed harness run, match symptoms to one of these modes. Each
> entry includes the cause, the concrete signal you observe, and the prescribed fix.
>
> Sources: Anthropic Engineering (2026-04-04 P-G-E article) and claudecode-lab.com
> harness analysis.

## 1. Context Drift

**Cause**: agent's working understanding of the task diverges from the original spec
during a long session. Often due to compaction discarding load-bearing constraints, or
the agent rationalizing scope creep mid-run.

**Signal**: agent ships work that solves a different problem from the one specified;
PR description doesn't match the original ticket; "this looks fine but it's not what we
asked for."

**Fix**: switch from compaction to **context reset** with structured handoff. Each agent
re-reads the spec at boot, executes a narrow remit, hands off via files. Anchor the
spec in `sprint-plan.md` so it can't drift through summarization.

## 2. Schema Misalignment

**Cause**: handoff artifacts (progress files, eval reports) don't match what the next
agent expects. Schema evolves without all consumers updating.

**Signal**: Evaluator reads progress file and complains about missing fields; Generator
reads plan and can't find its task ID; pipeline silently produces empty outputs.

**Fix**: define and version the handoff schema (`handoff-schema.md`). Every agent
prompt embeds the schema verbatim. Validate handoff files exist and parse before the
next agent starts. If schema changes, bump a version number and update all agents
before deploying.

## 3. State Degradation

**Cause**: memory/context accumulates noise — old rationalizations, half-finished
exploration, contradicted decisions. Quality degrades the longer the session runs.

**Signal**: agent quality is fine for the first hour, mediocre at hour two, hallucinated
at hour three. Compaction summaries get noisier each cycle.

**Fix**: prune memory regularly (`/compact` or manual editing). Use context resets at
natural breakpoints (end of phase, before evaluator). Don't trust long-running session
state — break work into discrete agent runs.

## 4. Self-Evaluation Weakness

**Cause**: same agent that did the work also evaluates it. Models confidently praise
their own output even when quality is mediocre.

**Signal**: agent reports DONE on every task; PR review by the same agent finds no
issues; tests pass but production breaks; reviewer agent's tone is identical to
generator's.

**Fix**: separate Generator from Evaluator. Spawn Evaluator as a fresh subagent (or
yourself stepping back) with only the spec + acceptance criteria + artifacts — not the
Generator's reasoning trace. Anthropic (2026-04-04): "tuning a standalone evaluator to
be skeptical turns out to be far more tractable than making a generator critical of
its own work."

### 4a. Diagnostic Variant — Inferring from Derived Data

A specific instance of Self-Evaluation Weakness in **diagnosis tasks** (not just sprint
runs): the diagnostician uses a derived/proxy data source instead of the primary record,
then confidently asserts a conclusion that turns out to be wrong because the proxy
didn't carry the relevant signal.

**Concrete case (2026-04-27 sprint test session 2a7d68ff)**: Diagnostician was asked
"did model routing work?" Looked at the orchestrator's main `.jsonl` and saw the last
assistant message had `model: claude-opus-4-7`. Concluded "all subagents ran Opus —
routing failed, plugin has a bug, year cost 5–10× higher." The user pushed back; on
re-check of `subagents/<id>.jsonl` (one file per subagent), each subagent's actual
`message.model` field showed Haiku 4.5 / Sonnet 4.6 / Opus 4.7 exactly per plan. The
main `.jsonl` model field is the **orchestrator's** model, not the subagents'.

The Claude Code UI line `Agent(Generator TASK-001) Haiku 4.5` is the source of truth
for which model a subagent ran on. The diagnostician had this displayed in chat but
never scrolled back to check it.

**Signal**: a confident conclusion based on one data source, where a more authoritative
source was available but not consulted. The conclusion is internally consistent but
empirically wrong.

**Fix**: when diagnosing, list authoritative sources first and consult them in priority
order — do not stop at the first plausible-looking signal. For Claude Code subagent
diagnosis specifically:
1. UI line `Agent(<role>) <Model>` shown when subagent spawns — primary source
2. `subagents/<id>.jsonl` per-message `model` field — authoritative log
3. `subagents/<id>.meta.json` `agentType` and `description` — role only, not model
4. Main session `.jsonl` — orchestrator state only, NOT subagent state

Treat user pushback on a confident diagnosis as a signal to re-check sources, not as
disagreement to argue against. If a primary source contradicts your conclusion,
the conclusion is wrong — update it without negotiation.

## 5. Context Anxiety

**Cause**: model approaches its context limit and starts wrapping work prematurely
rather than completing tasks. Observed pre-Opus-4.6.

**Signal**: agent declares "I should wrap this up to save context" mid-task; deliverable
is truncated or stub-filled; agent skips verification claiming "context is getting full."

**Fix**: context reset (clear window, fresh agent with structured handoff) — not
compaction. The handoff carries the state forward; the new agent has full context
budget. On Opus 4.6+, this matters less but is still recommended for multi-hour runs.

## 6. Under-Scoping (Missing Planner)

**Cause**: brief user prompt goes directly to a Generator without expansion. Generator
under-specifies, ships hollow output that technically matches the prompt but misses the
intent.

**Signal**: deliverable is "fine" but lacks features, polish, or integrations the user
clearly expected; ambition gap between user vision and shipped artifact.

**Fix**: insert a Planner step. Planner expands 1–4 sentences into a detailed spec with
ambition-appropriate scope, integrations, and acceptance criteria. Generator implements
against the spec, not against the brief prompt.

## 7. Shallow Testing

**Cause**: Evaluator finds legitimate issues, then talks itself into approving the work
anyway ("this is probably fine," "the user didn't strictly require X").

**Signal**: eval report acknowledges bugs in prose but marks PASS; criteria interpreted
charitably; "good enough" instead of "meets threshold."

**Fix**: hard thresholds in the sprint contract — numbers, booleans, exact behaviors.
Evaluator marks FAIL if any criterion is not met as written. Iterative prompt tuning
against observed judgment divergence. Use Playwright MCP to verify by interaction, not
by reading code.

## 8. Tool Overload

**Cause**: more than ~15 tools exposed in one context. Model selection accuracy
collapses; attention fragments across tool descriptions.

**Signal**: model picks wrong tool for the job; calls Bash when Read would do; ignores
specialized tools and falls back to generic ones.

**Fix**: prune to 5–15 focused tools per context. Delegate overflow to subagents
(subagent has its own tool budget). Use logits masking / dynamic tool rationing via
MCP to expose only task-relevant tools.

## 9. Opaque Errors

**Cause**: tools return errors like "Error: undefined" or "Failed" without specifying
what failed and how to fix it. Agent can't self-repair.

**Signal**: agent retries the same failed call; gives up and reports "tool error" to
user; loops on partial information.

**Fix**: every tool error message must include (a) what failed, (b) the input that
caused failure, (c) what the agent could try differently. Idempotent tools where
possible. Precise error messages let the model self-repair instead of escalating.

---

## Triage Order

When diagnosing a failed run, check in this order (cheapest to verify first):

1. **Schema Misalignment** — read handoff files; do they parse and contain expected fields?
2. **Tool Overload / Opaque Errors** — count tools available; check error messages
3. **Self-Evaluation Weakness** — was Evaluator a separate fresh agent?
4. **Under-Scoping** — was there a Planner expansion step?
5. **Shallow Testing** — did eval criteria have hard thresholds?
6. **Context Anxiety / State Degradation** — how long was the session? was reset used?
7. **Context Drift** — does shipped work match the original spec?

Most multi-failure runs trace to (1)–(4); the rest are tail issues for long-running
or production harnesses.

## Diagnostician Self-Check (before reporting a conclusion)

When you are the diagnostician (not the harness operator), run this check before
asserting a conclusion:

- [ ] Is the data source I'm reading the **primary record** for the question, or a
      derived/proxy artifact?
- [ ] If derived: is a primary source available (per-subagent log, UI display, raw
      tool output)? If yes, consult it before concluding.
- [ ] Did I check the source named in the question? (e.g., asked about subagent
      models → did I open subagent-level logs?)
- [ ] If the user pushes back, do I re-check sources or argue? **Re-check.** Pushback
      from someone who can see the runtime is evidence, not friction.

See §4a for the canonical case study (2026-04-27 sprint test session 2a7d68ff).
