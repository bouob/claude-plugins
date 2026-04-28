# Sprint Contract Schema

> **Status:** vendor-neutral schema introduced in v0.3.0. Three engines (Claude
> Code, Codex CLI) read and write to the same on-disk artifacts.

This document is the single source of truth for the four files exchanged
between Planner, Generator, and Evaluator during a `/sprint` run. Any engine
backend (`{engine: "claude" | "codex"}` in the routing config) MUST
produce / consume these schemas verbatim.

The contract is versioned: this is **schema v1** of the sprint contract,
parallel to (but independent of) `agent-harness.json` config schema v2.

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

For the Codex generator backend, an additional `.work/` subtree is
allocated per task to keep working directories (and git indices) isolated:

```
.sprint/<ts>/
├── .work/
│   ├── <task-id-1>/      # cwd for run-codex.sh task 1
│   └── <task-id-2>/
└── .prompts/
    └── <task-id-1>.md    # cold-start prompt rendered by Phase 3
```

---

## 1. `sprint-meta.json`

Source of truth for iteration count and run state. Read fresh at the start of
Phase 6 — never rely on cached values from earlier phases.

```jsonc
{
  "iteration": 1,                    // monotonically increasing, max 3
  "max_iterations": 3,
  "status": "running",               // "running" | "done" | "blocked"
  "started_at": "2026-04-28T12:34:56Z",
  "spec": "<verbatim user $ARGUMENTS to /sprint>",
  "workspace": ".sprint/20260428-123456",
  "host": "claude-code",             // v0.3.0+: which CLI orchestrates this run
  "engines_used": ["claude"]         // v0.4.1+: union of engines spawned in Phase 3
}
```

---

## 2. `sprint-plan.md`

Authored by Planner (Phase 2). Consumed by Generators (Phase 3) and Evaluator
(Phase 5).

```markdown
# Sprint Plan

## Interpretation

<one paragraph: what the Planner understood the spec to mean, including any
out-of-orchestrator-scope items (e.g. "push to GitHub when done") so the
orchestrator's Phase 7 destructive-action gate can classify them>

## Acceptance Criteria

- AC-1: <verb-led, measurable criterion>
- AC-2: ...

## Tasks

### parallel_batch

Tasks with no dependencies — safe to spawn simultaneously.

#### TASK-001
- **type**: code | write | research | collect
- **engine**: claude | codex    # v0.5.0+: validated against model-registry.md (Auggie removed in v0.5.0)
- **model**: per-engine model ID — see model-registry.md. Examples:
    - claude → opus | sonnet | haiku
    - codex  → gpt-5.5 | gpt-5.4 | gpt-5.4-mini | gpt-5.3-codex-spark
- **summary**: <one sentence>
- **acceptance**: <which AC-N this task satisfies>
- **deliverables**: <files / decisions / reports the Generator must produce>

### sequential_tasks

Tasks with dependencies — listed in execution order.

#### TASK-002
- **type**: ...
- **engine**: ...
- **model**: ...
- **depends_on**: [TASK-001]
- **summary**: ...
- **acceptance**: ...
- **deliverables**: ...

> Phase 0 of `/sprint` validates `engine` and `model` against
> `model-registry.md` before Phase 2 spawns the Planner; the Planner is
> told to assign these per task; Phase 3 dispatches to the appropriate
> backend (Agent tool for claude, run-codex.sh for codex).
```

**Required sections:** `Interpretation`, `Acceptance Criteria`, `parallel_batch`,
`sequential_tasks`. If a sprint truly has no parallelizable tasks, leave
`parallel_batch` present-but-empty (with a one-line note) — do not omit the
section. Phase 2 validates structure and aborts on missing sections.

---

## 3. `sprint-progress/<task-id>.md`

Authored by Generator (Phase 3) — one file per task. Schema is identical
across engines so Phase 4 aggregation does not need to know which backend ran.

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

For **Codex backend**: `run-codex.sh` writes the assistant's final message via
`codex exec --output-last-message`, then the Phase 3 orchestrator wraps it in
this schema (a small post-processing step in `normalize-codex-output.mjs`).

For **Claude backend**: the Generator subagent writes this file directly per
its system prompt (current behaviour, unchanged from v0.2.0).

---

## 4. `sprint-progress-summary.md`

Aggregated by orchestrator in Phase 4. Pure projection of `sprint-progress/*.md`
files — no new reasoning.

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

**Status grading rule:** PASS requires concrete evidence (numbers, boolean
checks, file existence). Aesthetic judgments without thresholds default to
FAIL — this is the Sprint Contract's defense against Shallow Testing
(see `skills/harness-engineering/references/anti-patterns.md`).

---

## Cross-Engine Invariants

Any engine backend MUST honor these regardless of how the underlying CLI
behaves natively:

1. **Working directory isolation per task.** Codex `--cd` MUST point
   to `.sprint/<ts>/.work/<task-id>/` so parallel tasks don't collide
   on the git index.
2. **Ephemeral session.** Codex `--ephemeral` MUST be set — sprint runs
   are not part of the user's interactive history.
3. **No approval prompts.** Codex `--ask-for-approval=never` (or
   `--full-auto`) — headless runs that block on a TTY prompt count as
   a harness defect, not a model output.
4. **No commits, no pushes from Generators.** The orchestrator owns git.
   Phase 7 destructive-action gate decides if/when to push. Generator-side
   `git commit` or `git push` is a contract violation.
5. **Exit code is advisory, file content is authoritative.** Codex
   may exit 0 even when the task is incomplete. Always inspect the
   resulting `sprint-progress/<task-id>.md` for `Status:` before
   treating a task as done.

---

## Versioning

- **Sprint contract schema:** v1 (this document)
- **agent-harness.json config schema:** v2 (see `config-schema.md`)

The two schemas evolve independently. A v2 config can drive a v1 contract.
Future contract changes (v2+) MUST keep v1 readers parsing without errors —
extend with new optional fields rather than renaming required ones.

---

## See Also

- `engine-flag-matrix.md` — exact CLI flags each backend uses to satisfy the
  invariants above
- `cross-host-deployment.md` — how the contract surfaces in Codex /
  IDE host environments
- `config-schema.md` — `agent-harness.json` schema (model routing config)
- `../SKILL.md` — Phase definitions that read / write these files
