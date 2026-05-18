---
name: agent-harness-sprint
description: Use when a user asks Codex to run an agent-harness sprint with Planner, Generator, and Evaluator phases. Delegates parallel work only when task ownership is explicit and disjoint.
argument-hint: "[approved sprint plan or product spec]"
---

# Agent Harness Sprint

Run a Codex-oriented Planner -> Generator -> Evaluator sprint. Use this skill for complex work that benefits from planned delegation and a verification gate.

## References

- `../../references/codex-sprint-contract.md` - Codex sprint artifact contract and task rules

## Step 1 - Planning Gate

If the user provided only a loose spec, first use the planning behavior from `agent-harness-sprint-plan`.

Continue to execution only when the plan has:
- Acceptance criteria
- A task list
- Ownership boundaries
- Verification commands or checks

## Step 2 - Initialize Artifacts

Use `.sprint/<YYYYMMDD-HHmmss>/` for local sprint artifacts.

Create:
- `sprint-meta.json`
- `sprint-plan.md`
- `sprint-progress/`

Keep `.sprint/` local-only. Do not commit sprint artifacts unless the user explicitly asks.

## Step 3 - Execute Generator Tasks

For `parallel_batch`, spawn subagents only for tasks with disjoint ownership. Tell each subagent:
- It is not alone in the codebase
- Its exact files, modules, or responsibility
- It must not revert edits made by others
- It must write `.sprint/<timestamp>/sprint-progress/<task-id>.md`

For `sequential_tasks`, run tasks in order. Wait for dependency results before starting the next task.

For shared-file edits, do not run workers in parallel. Keep the main agent or one worker responsible for the shared file.

## Step 4 - Evaluate

After implementation, run the verification plan. Use focused commands that prove the acceptance criteria.

Write `.sprint/<timestamp>/sprint-eval.md` with:
- Overall PASS or FAIL
- Per-criterion evidence
- Retry tasks when needed

If any criterion fails and the retry is small, run one retry pass. If the failure changes scope, stop and report the decision needed.

## Step 5 - Finish

Summarize:
- What changed
- Verification run and result
- Open risks or blocked items

Do not commit or push. Git remains a separate user-invoked workflow.
