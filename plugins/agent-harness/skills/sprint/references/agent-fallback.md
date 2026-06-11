# Fallback: Agent-Tool Orchestration (Phases 2–6)

This is the legacy execution path for `/sprint`, used when Claude Code
dynamic workflows are unavailable (Claude Code < 2.1.154, workflows
disabled via `/config` / `disableWorkflows` / `CLAUDE_CODE_DISABLE_WORKFLOWS=1`,
or the workflow launch was rejected). The orchestrator (main session)
runs every phase below itself, spawning subagents via the `Agent` tool.

All `{placeholders}` are the values resolved in SKILL.md Phase 0 and
Phase 1. After Phase 6 completes here, return to SKILL.md Phase 5
(post-sprint actions).

---

## Phase 2 — Planner

Step 2a: Read these files and hold their full text in memory (skip if
already loaded in Phase 0):
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/planner.md` → PLANNER_CONTENT
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/handoff-schema.md` → SCHEMA_CONTENT

Step 2b: Spawn a subagent (model: {planner_model}) with a prompt assembled from these parts in order:

```
{effort_keyword(planner) — single line, e.g. "Think hard." Omit entirely if planner_effort is low.}

{PLANNER_CONTENT — paste full text}

---

## Handoff Schema (reference)

{SCHEMA_CONTENT — paste full text}

---

## Resolved Model Routing Table (assigned by orchestrator for this sprint)

{generator_routing_table — paste the 4-row table built in Phase 0; columns are type | model | effort | when to use}

---

## Your Assignment

SPEC: {$ARGUMENTS verbatim}
WORKSPACE: {workspace}

Write `{workspace}/sprint-plan.md` following the sprint-plan.md schema exactly.
Use the Resolved Model Routing Table above to assign each task's `model` AND
`effort` fields based on its `type`.
After writing the file, output exactly: PLANNER DONE
```

Wait for the subagent to complete before proceeding.

Read `{workspace}/sprint-plan.md`. Verify it exists and contains both `parallel_batch` and `sequential_tasks` sections.
If the file is missing or malformed: stop and report to user — do not continue with a broken plan.

---

## Phase 3 — Generator (maximize parallelism)

Read `{workspace}/sprint-plan.md` to extract `parallel_batch` and `sequential_tasks`.

Step 3a: Read these files and hold their full text in memory:
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/generator.md` → GENERATOR_CONTENT
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/handoff-schema.md` → SCHEMA_CONTENT (reuse from Phase 2 if still available)

For every Generator subagent, build the prompt using this template. Look up
the task's `effort` value from `sprint-plan.md` and map to a keyword before
spawning:

```
{effort_keyword(task.effort) — single line for this specific task. Omit entirely if low.}

{GENERATOR_CONTENT — paste full text}

---

## Handoff Schema (reference)

{SCHEMA_CONTENT — paste full text}

---

## Sprint Plan

{sprint-plan.md full content}

---

## Your Assignment

TASK_ID: {task-id}
WORKSPACE: {workspace}/

Find your TASK_ID in the Sprint Plan above and implement it.
Write your output to `{workspace}/sprint-progress/{task-id}.md` following the sprint-progress schema.
```

Step 3b: Check Agent Teams availability:
```bash
echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
```

### If output is non-empty (Agent Teams available):

For each task ID in `parallel_batch`, spawn a **teammate** simultaneously in a single message (one Agent tool call per task, all in the same turn).
Wait for ALL teammates to complete before proceeding.

### If output is empty (Agent Teams NOT available):

For each task ID in `parallel_batch`, spawn a **subagent** sequentially — one task at a time, wait for each to finish.
Note in output: "Agent Teams not available — parallel_batch running sequentially."

### Sequential tasks (all cases):

For each task ID in `sequential_tasks` (in listed order):
- Spawn one subagent using the prompt template above
- Wait for completion before spawning the next

---

## Phase 4 — Aggregate

**Do not skip this phase.** Read all `{workspace}/sprint-progress/*.md` files.
Write `{workspace}/sprint-progress-summary.md` listing each task ID, status (DONE/BLOCKED), and one-sentence summary.

---

## Phase 5 — Evaluator

Step 5-guard: Confirm `{workspace}/sprint-progress-summary.md` exists. If it
does not (Phase 4 was skipped or its write failed), run Phase 4 now before
continuing — the Evaluator should never be invoked without it. If it still
cannot be produced, pass the individual `sprint-progress/*.md` files instead
and note the missing summary in the eval.

Step 5a: Read these files and hold their full text in memory:
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/evaluator.md` → EVALUATOR_CONTENT
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/handoff-schema.md` → SCHEMA_CONTENT
- `{workspace}/sprint-plan.md` → PLAN_CONTENT
- `{workspace}/sprint-progress-summary.md` → SUMMARY_CONTENT
- All `{workspace}/sprint-progress/*.md` → PROGRESS_FILES (labelled by task ID)

Step 5b: Spawn a subagent (model: {evaluator_model}) with a prompt assembled from these parts:

```
{effort_keyword(evaluator) — single line, e.g. "Think." Omit entirely if evaluator_effort is low.}

{EVALUATOR_CONTENT — paste full text}

---

## Handoff Schema (reference)

{SCHEMA_CONTENT — paste full text}

---

## Sprint Artifacts

### sprint-plan.md
{PLAN_CONTENT}

### sprint-progress-summary.md
{SUMMARY_CONTENT}

### Progress Files
{Each PROGRESS_FILES entry, labelled with its task ID}

---

## Your Assignment

WORKSPACE: {workspace}/

Write `{workspace}/sprint-eval.md` following the sprint-eval.md schema exactly.
After writing the file, output exactly: EVALUATOR DONE
```

Wait for the subagent to complete.

---

## Phase 6 — Decision Gate

Read `{workspace}/sprint-eval.md`.
Read `{workspace}/sprint-meta.json` fresh (do not rely on in-memory state from earlier phases).

### If overall status is PASS:
1. Update `{workspace}/sprint-meta.json` → `status: "done"`
2. Report to user: summary of what was built, files changed, eval results
3. Done.

### If overall status is FAIL and `iteration < max_iterations`:
1. Increment `{workspace}/sprint-meta.json` → `iteration`
2. Extract `retry_tasks` from `{workspace}/sprint-eval.md`
3. Update `{workspace}/sprint-plan.md` → move `retry_tasks` into a new `parallel_batch` (if no deps) or `sequential_tasks`
4. Return to Phase 3 with only the retry tasks
   — append `{workspace}/sprint-eval.md` content to each Generator prompt so they know what failed and why

### If overall status is FAIL and `iteration >= max_iterations`:
1. Update `{workspace}/sprint-meta.json` → `status: "blocked"`
2. Report to user:
   - Which criteria failed
   - What was attempted across all iterations
   - Specific next steps the user should take manually

---

## Gotchas (fallback-specific)

- This path embeds full file content into each Agent prompt string —
  cold-start agents are not pointed at reference paths here; never pass
  a file path as a substitution for file content
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` lives only on this path. If it
  is unset, `parallel_batch` runs sequentially — note this in output but
  do not abort the sprint
- All intermediate artifacts (plan, progress files, eval) pass through
  the orchestrator's context window on this path — expect higher main
  session token usage than the workflow backend
- `{effort_keyword(...)}` must be clamped to the role's **model** before
  injection: `haiku` → no keyword; `sonnet`+`xhigh` → `Think hard.` (high);
  only `opus` / `fable` / `mythos` reach `Think harder.` (xhigh). Round
  effort DOWN to the model's nearest valid level (same rule as the workflow
  backend's `normalizeEffort`)
- The `WORKSPACE:` line you write into each Assignment is the agent's only
  source for the workspace path — substitute the real `{workspace}` value;
  never leave the literal token, or the agent reports an undefined path
