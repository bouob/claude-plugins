# Codex Sprint Contract

This is the host-neutral contract for Codex agent-harness sprints. It preserves the Planner -> Generator -> Evaluator shape while using Codex-native subagent delegation instead of Claude Code Agent Teams.

## Workspace Layout

```text
.sprint/<YYYYMMDD-HHmmss>/
  sprint-meta.json
  sprint-plan.md
  sprint-progress/
    <task-id>.md
  sprint-progress-summary.md
  sprint-eval.md
```

## sprint-meta.json

```json
{
  "iteration": 1,
  "max_iterations": 3,
  "status": "running",
  "started_at": "<ISO timestamp>",
  "spec": "<verbatim user request>",
  "workspace": ".sprint/<timestamp>",
  "host": "codex"
}
```

## sprint-plan.md

```markdown
# Sprint Plan

## Interpretation

<what the request means, including out-of-scope items>

## Acceptance Criteria

- AC-1: <measurable criterion>
- AC-2: <measurable criterion>

## Tasks

### parallel_batch

#### TASK-001
- **type**: code | write | research | collect | verify
- **ownership**: <exact files, modules, or responsibility>
- **summary**: <one sentence>
- **acceptance**: <AC ids>
- **deliverables**: <expected output>

### sequential_tasks

#### TASK-002
- **type**: code | write | research | collect | verify
- **depends_on**: [TASK-001]
- **ownership**: <exact files, modules, or responsibility>
- **summary**: <one sentence>
- **acceptance**: <AC ids>
- **deliverables**: <expected output>

## Verification Plan

- <command or static check>

## Assumptions

- <assumption>
```

## Task Rules

- Put a task in `parallel_batch` only when its write ownership is disjoint from other parallel tasks.
- Read-only exploration, research, and verification tasks may run in parallel when they do not mutate shared state.
- Shared-file edits must be sequential or owned by one worker.
- Every Generator must write one progress file.
- No Generator may commit, push, or rewrite unrelated work.

## sprint-progress/<task-id>.md

```markdown
# <task-id>

## Status

DONE | BLOCKED | NEEDS-RETRY

## Summary

<one sentence>

## Files Changed

- <path> (<summary>)

## Verification

<checks run or why not run>

## Notes

<optional>
```

## sprint-eval.md

```markdown
# Sprint Evaluation

## Overall

PASS | FAIL

## Per-Criterion

### AC-1: <criterion text>
- **Status:** PASS | FAIL | SKIP
- **Evidence:** <specific evidence>

## Retry Tasks

- <task id and reason, or empty>
```

PASS requires concrete evidence. If a criterion cannot be verified, mark it FAIL unless the related task was BLOCKED.
