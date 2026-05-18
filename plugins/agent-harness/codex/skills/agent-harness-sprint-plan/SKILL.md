---
name: agent-harness-sprint-plan
description: Use when a user wants a Codex-ready plan for an agent-harness sprint before implementation. Produces a decision-complete Planner/Generator/Evaluator sprint plan without editing application code.
argument-hint: "[product spec or implementation goal]"
---

# Agent Harness Sprint Plan

Plan a Codex sprint without implementing it. Use this skill for ambiguous or multi-step work where a plan should be reviewed before edits.

## Step 1 - Ground the Plan

Read only the files needed to understand the request. Prefer `rg` and targeted file reads.

Identify:
- Goal and user-facing outcome
- Affected subsystem or files
- Existing conventions to preserve
- Risks, dependencies, and likely verification commands

Do not edit files during this skill.

## Step 2 - Write the Sprint Plan

Produce a plan in the format from `../../references/codex-sprint-contract.md`.

The plan must include:
- Interpretation
- Acceptance Criteria
- parallel_batch
- sequential_tasks
- Verification Plan
- Assumptions

Use 3 to 7 tasks. A task belongs in `parallel_batch` only when its write ownership is disjoint from every other parallel task. Read-heavy exploration, test analysis, and documentation review may run in parallel.

## Step 3 - Codex Delegation Notes

Add explicit instructions for future execution:
- Which tasks should use parallel subagents
- Which tasks must stay sequential
- Which files or modules each worker owns
- Which tasks are read-only

Codex only spawns subagents when the user or skill explicitly asks for parallel delegation. State that execution should use subagents only for the listed parallel tasks.

## Output

Return the plan to the user. If the user asks to persist it, write it under `.sprint/<YYYYMMDD-HHmmss>/sprint-plan.md` and create only the sprint artifact directory needed for that plan.
