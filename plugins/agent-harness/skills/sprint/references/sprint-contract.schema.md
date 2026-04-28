# Sprint Contract Schema

> **Status:** schema introduced in v0.3.0; restored to Claude Code-only
> in v0.6.0 (the v0.4.x – v0.5.x multi-host experiment was rolled back).

This document is the single source of truth for the four files exchanged
between Planner, Generator, and Evaluator during a `/sprint` run.

The contract is versioned: this is **schema v1** of the sprint contract,
parallel to (but independent of) `agent-harness.json` config schema v3.

---

## Workspace Layout

All files for a single sprint run live under one timestamped directory:

```
.sprint/<YYYYMMDD-HHmmss>/
├── sprint-meta.json
├── sprint-plan.md
├── sprint-progress/
│   ├── <task-id-1>.md
│   └── <task-id-2>.md
├── sprint-progress-summary.md
└── sprint-eval.md
```

`.sprint/` is appended to `.gitignore` by Phase 1 of `/sprint` (see
`skills/sprint/SKILL.md`). Sprint artifacts are **local-only by default**;
do not commit them.

---

## 1. `sprint-meta.json`

Source of truth for iteration count and run state. Read fresh at the
start of Phase 6 — never rely on cached values from earlier phases.

```jsonc
{
  "iteration": 1,                    // monotonically increasing, max 3
  "max_iterations": 3,
  "status": "running",               // "running" | "done" | "blocked"
  "started_at": "2026-04-28T12:34:56Z",
  "spec": "<verbatim user $ARGUMENTS to /sprint>",
  "workspace": ".sprint/20260428-123456"
}
```

---

## 2. `sprint-plan.md`

Authored by Planner (Phase 2). Consumed by Generators (Phase 3) and
Evaluator (Phase 5).

```markdown
# Sprint Plan

## Interpretation

<one paragraph: what the Planner understood the spec to mean, including
any out-of-orchestrator-scope items (e.g. "push to GitHub when done")
so the orchestrator's Phase 7 destructive-action gate can classify them>

## Acceptance Criteria

- AC-1: <verb-led, measurable criterion>
- AC-2: ...

## Tasks

### parallel_batch

Tasks with no dependencies — safe to spawn simultaneously.

#### TASK-001
- **type**: code | write | research | collect
- **model**: opus | sonnet | haiku
- **summary**: <one sentence>
- **acceptance**: <which AC-N this task satisfies>
- **deliverables**: <files / decisions / reports the Generator must produce>

### sequential_tasks

Tasks with dependencies — listed in execution order.

#### TASK-002
- **type**: ...
- **model**: ...
- **depends_on**: [TASK-001]
- **summary**: ...
- **acceptance**: ...
- **deliverables**: ...
```

**Required sections:** `Interpretation`, `Acceptance Criteria`,
`parallel_batch`, `sequential_tasks`. If a sprint truly has no
parallelizable tasks, leave `parallel_batch` present-but-empty (with a
one-line note) — do not omit the section. Phase 2 validates structure
and aborts on missing sections.

---

## 3. `sprint-progress/<task-id>.md`

Authored by Generator (Phase 3) — one file per task.

```markdown
# <task-id>

## Status

DONE | BLOCKED | NEEDS-RETRY

## Summary

<one sentence: what was accomplished or why it's blocked>

## Files Changed

- path/to/file.ts (+12 -3)
- path/to/new-file.md (new)

## Verification

<how the Generator verified completion: tests run, builds passed,
manual checks performed>

## Notes

<optional: surprising findings, follow-up work flagged for retry, etc.>
```

The Generator subagent writes this file directly per its system prompt.

---

## 4. `sprint-progress-summary.md`

Aggregated by orchestrator in Phase 4. Pure projection of
`sprint-progress/*.md` files — no new reasoning.

```markdown
# Sprint Progress Summary

| Task ID  | Status      | Summary                             |
|----------|-------------|-------------------------------------|
| TASK-001 | DONE        | <one-sentence summary verbatim>     |
| TASK-002 | NEEDS-RETRY | <reason>                            |
```

---

## 5. `sprint-eval.md`

Authored by Evaluator (Phase 5). Consumed by Phase 6 decision gate.

```markdown
# Sprint Evaluation

## Overall

PASS | FAIL

## Per-Criterion

### AC-1: <criterion text verbatim>
- **Status:** PASS | FAIL
- **Evidence:** <test output, file diff, or specific observation>

### AC-2: ...

## Retry Tasks

<empty if Overall = PASS>

- TASK-002: <why it failed, what should change in retry>
- TASK-005: ...
```

**Status grading rule:** PASS requires concrete evidence (numbers,
boolean checks, file existence). Aesthetic judgments without thresholds
default to FAIL — this is the Sprint Contract's defense against Shallow
Testing (see
`skills/harness-engineering/references/anti-patterns.md`).

---

## Invariants

The Generator subagents MUST honor these regardless of model:

1. **No commits, no pushes from Generators.** The orchestrator owns
   git. Phase 7 destructive-action gate decides if/when to push.
   Generator-side `git commit` or `git push` is a contract violation.
2. **Status field is authoritative.** Always set `Status:` to
   `DONE`, `BLOCKED`, or `NEEDS-RETRY` — Phase 4 aggregation depends
   on this string.

---

## Versioning

- **Sprint contract schema:** v1 (this document)
- **agent-harness.json config schema:** v3 (see `config-schema.md`)

The two schemas evolve independently. Future contract changes (v2+)
MUST keep v1 readers parsing without errors — extend with new optional
fields rather than renaming required ones.

---

## See Also

- `config-schema.md` — `agent-harness.json` schema v3 (model routing
  config)
- `../SKILL.md` — Phase definitions that read / write these files
- `planner.md` / `generator.md` / `evaluator.md` — role prompts
