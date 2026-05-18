---
name: agent-harness-sprint
description: Use when a user asks Codex to run an agent-harness sprint with Planner, Generator, and Evaluator phases. Delegates parallel work only when task ownership is explicit and disjoint.
argument-hint: "[approved sprint plan or product spec]"
---

# Agent Harness Sprint

Run a Codex-oriented Planner -> Generator -> Evaluator sprint. Use this skill for complex work that benefits from planned delegation and a verification gate.

## References

- `../../references/codex-sprint-contract.md` - Codex sprint artifact contract and task rules
- `../../references/codex-config-schema.md` - Codex model routing config

## Step 1 - Resolve Codex Model Routing

Read Codex config in this order:

1. `./.codex/agent-harness.local.json`
2. `~/.codex/agent-harness.json`
3. Built-in defaults from `../../references/codex-config-schema.md`

Only read `.codex` config files. Do not read `.claude/agent-harness*.json`.

Resolve each role independently:

- `planner`
- `evaluator`
- `generator.code`
- `generator.write`
- `generator.research`
- `generator.collect`

Routing rules:

- `mode: "inherit"` - omit both `model` and `reasoning_effort` when spawning
  that role
- `mode: "explicit"` - pass `model`; if `reasoning_effort` is present, pass it too

If the config has an unknown host, version, mode, or malformed explicit route,
warn the user and fall back that role to inherit-mode routing for this run.

If Codex rejects a configured model or reasoning override at runtime, warn the
user, retry that role with inherit-mode routing, and continue unless the retry
also fails.

## Step 2 - Planning Gate

If the user provided only a loose spec, first use the planning behavior from `agent-harness-sprint-plan`.

Continue to execution only when the plan has:

- Acceptance criteria
- A task list
- Ownership boundaries
- Verification commands or checks
- Routing notes that state which tasks inherit the current session and which use
  explicit model or reasoning overrides

## Step 3 - Initialize Artifacts

Use `.sprint/<YYYYMMDD-HHmmss>/` for local sprint artifacts.

Create:

- `sprint-meta.json`
- `sprint-plan.md`
- `sprint-progress/`

Keep `.sprint/` local-only. Do not commit sprint artifacts unless the user explicitly asks.

## Step 4 - Execute Generator Tasks

For `parallel_batch`, spawn subagents only for tasks with disjoint ownership.
Tell each subagent:

- It is not alone in the codebase
- Its exact files, modules, or responsibility
- It must not revert edits made by others
- It must write `.sprint/<timestamp>/sprint-progress/<task-id>.md`
- Whether it inherits the current Codex session model or uses an explicit
  `model` and optional `reasoning_effort`

When spawning:

- For inherit routes, omit `model` and omit reasoning override
- For explicit routes, pass `model`
- Pass `reasoning_effort` only when the route includes it

For `sequential_tasks`, run tasks in order. Wait for dependency results before starting the next task.

For shared-file edits, do not run workers in parallel. Keep the main agent or one worker responsible for the shared file.

## Step 5 - Evaluate

After implementation, run the verification plan. Use focused commands that prove the acceptance criteria.

Write `.sprint/<timestamp>/sprint-eval.md` with:

- Overall PASS or FAIL
- Per-criterion evidence
- Retry tasks when needed
- Any routing fallbacks that occurred during execution

If any criterion fails and the retry is small, run one retry pass. If the failure changes scope, stop and report the decision needed.

## Step 6 - Finish

Summarize:

- What changed
- Verification run and result
- Open risks or blocked items
- Any role that had to fall back from explicit routing to inherit

Do not commit or push. Git remains a separate user-invoked workflow.
