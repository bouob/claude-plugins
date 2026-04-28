# Sprint Handoff Schema

Defines the data contracts between Planner, Generator, and Evaluator.
All agents read and write these files. Format must be followed exactly.

---

## sprint-meta.json

```json
{
  "iteration": 1,
  "max_iterations": 3,
  "status": "running",
  "started_at": "2026-04-27T00:00:00Z",
  "spec": "Original user spec verbatim"
}
```

`status` values: `running` | `done` | `blocked`

---

## sprint-plan.md

```markdown
# Sprint Plan

## Spec
[original spec verbatim]

## Tasks

### TASK-001: [title]
- **type**: code | write | research | collect
- **model**: sonnet | haiku
- **depends_on**: [] or [TASK-002, TASK-003]
- **acceptance_criteria**:
  - [measurable, verb-first criterion]
  - [measurable, verb-first criterion]

### TASK-002: [title]
...

## Execution Schedule

### Parallel Batch (no dependencies — run simultaneously via Agent Teams)
- TASK-001
- TASK-003

### Sequential Tasks (ordered by dependency)
1. TASK-002 (depends on TASK-001)
2. TASK-004 (depends on TASK-002, TASK-003)
```

Rules:
- `acceptance_criteria` must be measurable (start with a verb: "Returns", "Renders", "Stores", "Validates")
- `depends_on` must reference valid task IDs in the same plan
- Every task must have at least one acceptance criterion
- `type` determines which model the Generator uses (see model routing table)

---

## sprint-progress/TASK-XXX.md

```markdown
# TASK-XXX Progress

## Status
DONE | BLOCKED

## What was built
[concise description, 2-5 sentences]

## Files changed
- path/to/file.ts
- path/to/file.py

## Open issues
- [any known limitations or follow-up needed]
```

If status is BLOCKED, add:
```markdown
## Blocker
[specific reason — what is missing or what failed]
```

---

## sprint-eval.md

```markdown
# Sprint Evaluation — Iteration N

## Results

| Task | Criterion | Status | Reason |
|------|-----------|--------|--------|
| TASK-001 | Returns 200 on valid input | PASS | Verified via curl |
| TASK-002 | Renders without console errors | FAIL | TypeError on mount |

## Retry Tasks
- TASK-002 (criterion: "Renders without console errors")

## Overall
PASS | FAIL
```

`status` per criterion: `PASS` | `FAIL` | `SKIP` (if task was BLOCKED)
