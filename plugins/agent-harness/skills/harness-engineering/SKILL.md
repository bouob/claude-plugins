---
name: harness-engineering
description: >
  Plan, execute, and review multi-agent harnesses using the Planner-Generator-Evaluator
  pattern (Anthropic Engineering, 2026-04-04). Use when a task exceeds one context window,
  benefits from parallel subagents, needs Playwright MCP browser-level verification, or
  requires sprint-contract negotiation between Generator and Evaluator. Also use when
  routing work across Opus (orchestration/eval) / Sonnet (generation) / Haiku (collection),
  deciding spawn-vs-inline-vs-Agent-Teams, designing context reset vs compaction handoffs,
  or reviewing whether a knowledge unit belongs in a hook, skill, rule, reference, or
  prompt. Do NOT use for: single-file edits, simple Q&A, or work that /sprint already
  templates end-to-end.
allowed-tools: Read, Write, Bash, Glob, Grep, Agent, TodoWrite
argument-hint: "[task description, design question, or skill/hook/rule under review]"
---

# /harness-engineering — Multi-Agent Harness Framework

A flexible framework for the Planner-Generator-Evaluator (P-G-E) design pattern as
formalized by Anthropic Engineering on 2026-04-04. Where `/sprint` is a fixed 6-phase
pipeline producing `.sprint/<ts>/` artifacts, this skill helps you **reason about,
construct, or review** harnesses that don't fit a rigid template — including the
harness elements (skills/rules/hooks/references) that surround them.

## Core Premise

> **Every component in a harness encodes an assumption about what the model can't do
> on its own — and those assumptions are worth stress-testing.** (Anthropic, 2026-04-04)

The harness is durable goods; the model is a replaceable engine. As models
strengthen, remove non-load-bearing scaffolding. As failure modes appear, add elements
that survive model swaps (Hooks > Skills > Rules > References > Prompts on the
durability axis).

---

## Input

```
$ARGUMENTS
```

If empty: ask whether the user wants (a) execution of a P-G-E task, (b) design review
of an existing skill/rule/hook, (c) routing/decomposition advice, or (d) diagnosis of
a failed harness run — then proceed.

---

## Procedure

### Step 1 — Classify the Request

State the chosen mode in one line before proceeding. Do not collapse modes — they have
different downstream procedures.

| Mode | Trigger | Goes to |
|---|---|---|
| **Execute** | "do X using multi-agent / subagents / P-G-E" | Step 2 |
| **Design** | "should this be a hook / skill / rule?" or "review this skill" | Step 6 |
| **Route** | "which model should handle X?" or "spawn subagent or inline?" | Step 5 |
| **Diagnose** | "why did the harness fail?" / context drift / stale handoff | Step 7 |

### Step 2 — Plan: Expand the Spec

Apply Planner discipline. The Planner's job is to **expand a brief prompt (1–4
sentences) into a detailed spec** — not to write code. Output:

1. Re-stated goal (one sentence)
2. Deliverables (files, decisions, reports)
3. Sprint contract: testable success criteria with hard thresholds
4. Decomposition into 2–7 tasks; each:
   - Self-contained (cold-start agent can execute with task text alone)
   - Measurable (acceptance criteria start with a verb: Returns, Renders, Stores)
   - Scoped (≤50k tokens of work)
5. Dependencies → tasks with no deps go to `parallel_batch`; with deps go to
   `sequential_tasks`.

If the goal is genuinely a single task, report it and skip P-G-E — do not force-fit.

### Step 3 — Negotiate Sprint Contract

Before any Generator runs, produce a `sprint-contract.md` with:
- Each acceptance criterion phrased so an Evaluator can grade PASS/FAIL without ambiguity
- Explicit thresholds (numbers, not vibes)
- The exact verification method (unit test / Playwright assertion / file existence)

Generators read this contract; Evaluators grade against it. **The contract is the
schema between roles** — without it, Self-Evaluation Weakness creeps back in.

### Step 4 — Route Each Task to a Model

See `references/model-routing.md`. Quick rule:

| Work | Model |
|---|---|
| Plan, evaluate, architectural judgment | Opus |
| Code, write, research synthesize | Sonnet |
| Collect, transform, fetch | Haiku |

Override only with reason in the plan.

### Step 5 — Decide Subagent vs Inline vs Agent Teams

See `references/subagent-decision.md`. Summary:

- **Inline**: <10k tokens AND result needed for next step
- **Single subagent**: isolation needed OR result can wait
- **Agent Teams (parallel)**: 2+ independent tasks AND `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

Verify Agent Teams via `echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` before assuming
parallelism. Empty → fall back to sequential and note it.

### Step 6 — Execute / Advise / Review

**Execute mode**: spawn the chosen agents with full cold-start prompts (embed
context, don't pass file paths alone). After all return, run Evaluator (yourself or
fresh subagent) against the sprint contract. If FAIL and budget remains, return to
Step 2 with only failed tasks. Cap at 3 iterations.

**Design mode**: read `references/durability.md` and apply the harness-element
decision tree. Output the recommendation with the rule from the tree that justifies it.

**Route mode**: answer with the model + one-sentence reason, then stop.

### Step 7 — Diagnose Harness Defects

If diagnosing a failed harness run, read `references/anti-patterns.md` and match the
symptoms to one of the canonical failure modes:

- **Context Drift**: agent's working understanding diverges from spec mid-run
- **Schema Misalignment**: handoff artifacts don't match what the next agent expects
- **State Degradation**: memory/context accumulates noise; quality degrades over time
- **Self-Evaluation Weakness**: Generator approves its own work; no fresh evaluator
- **Context Anxiety**: agent wraps work prematurely fearing context exhaustion
- **Under-Scoping**: no Planner; Generator under-specifies and ships hollow output
- **Shallow Testing**: Evaluator finds issues then talks itself into approval
- **Tool Overload**: >15 tools in one context; selection accuracy collapses
- **Opaque Errors**: tool returns "Error: undefined"; agent can't self-repair

Report the matched mode and the prescribed fix from `anti-patterns.md`.

### Step 8 — Verify Before Reporting Done

- [ ] Every task has a status (DONE / BLOCKED / NEEDS-RETRY)
- [ ] Evaluator graded against `sprint-contract.md` criteria, not against vibes
- [ ] Failed criteria listed verbatim if any
- [ ] If Agent Teams unavailable, fallback noted
- [ ] No Generator committed or pushed (orchestrator owns git)

---

## Gotchas

- Mode classification is not optional — Execute, Design, Route, Diagnose have different procedures
- Cold-start agents have no context — embed task text, criteria, handoff data in the prompt; never pass a file path alone unless the agent is told what to read and what to extract
- Agent Teams check via `echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`; empty → sequential fallback (note it, don't abort)
- Opus 1M context is for the orchestrator (main session), not subagents — subagent budgets are normal
- Evaluator must NOT be the same agent that did the work — Anthropic's data shows tuning a standalone skeptical Evaluator is far more tractable than making a Generator critical of its own work
- Sprint-contract criteria need hard thresholds (numbers / boolean checks), not aesthetic judgments — without thresholds, FAIL/PASS becomes negotiable and Shallow Testing creeps in
- "Context reset" (clear window + structured handoff) ≠ "compaction" (summarize in place); reset is the cure for Context Anxiety on Sonnet, Opus 4.6+ tolerates compaction better
- Iteration budget must be set up front (typically 3); without a cap, ambiguous criteria produce infinite fail-retry loops — when cap hits, surface the blocker and stop
- Haiku synthesizes poorly — use it only for `collect` (fetch/transform), never for `research` (synthesize)
- `/sprint` is one template built on this framework; if the task is batch-implementation-shaped, prefer `/sprint` over re-deriving the pipeline
- Description above is a trigger condition (when to load), not a summary — keep it phrased that way
- Industry data: 65% of enterprise AI failures trace to harness defects; 88% of agent projects never reach production. The lever is harness, not model.

---

## References

- `references/pattern.md` — Anthropic 2026-04-04 P-G-E architecture: roles, sprint contracts, Playwright MCP, context reset vs compaction
- `references/model-routing.md` — Opus/Sonnet/Haiku routing with cost reasoning
- `references/subagent-decision.md` — Inline vs subagent vs Agent Teams decision tree, OODA-loop framing
- `references/durability.md` — Harness Engineering philosophy, 5-Layer architecture, hook/skill/rule/reference decision tree
- `references/anti-patterns.md` — 9 canonical harness failure modes with matched fixes

Read references on demand. Do not preload them all at the start of every invocation.
