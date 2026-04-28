---
name: sprint
description: >
  Autonomous multi-agent sprint: Planner decomposes spec → Generators implement in parallel
  via Agent Teams → Evaluator verifies against acceptance criteria → iterates up to 3 times.
  Use when spec requires 3+ distinct tasks or multi-step implementation across files or domains.
  Do NOT use for: single-file edits, quick bug fixes, or tasks completable in one context window.
allowed-tools: Read, Write, Bash, Glob, Grep, Agent, TodoWrite, TodoRead
argument-hint: "[product spec — 1 to 4 sentences describing what to build]"
hooks:
  - event: PreToolUse
    matcher: Bash
    prompt: |
      Check if this Bash command is a git push variant (git push, git push --force, git push -f).
      Also check if any file matching the glob `.sprint/*/sprint-meta.json` contains `"status": "running"`.
      If BOTH conditions are true: BLOCK with message "Sprint in progress. Complete the sprint (eval must PASS) before pushing."
      Otherwise: ALLOW
---

# /sprint — Autonomous Multi-Agent Sprint

## Input

```
$ARGUMENTS
```

If arguments are empty: ask the user for a spec before proceeding.

---

## Phase 0 — Resolve Model Routing

Read configuration in this order; the first existing file wins for any given
field, and later sources only fill in missing fields. Built-in defaults
backfill anything nobody set.

1. `./.claude/agent-harness.local.json` — project-level override
2. `~/.claude/agent-harness.json` — user-level
3. Built-in defaults (see `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/config-schema.md`)

For each Read attempt, treat ENOENT (file not found) as `{}` — never error on
missing config. The schema is documented in
`${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/config-schema.md`.

Hold the resolved values in scope as:

- `{planner_model}` — substituted into Phase 2b
- `{evaluator_model}` — substituted into Phase 5b
- `{generator_routing_table}` — a 4-row markdown table built from
  `models.generator.{code,write,research,collect}`, with columns
  `type | model | when to use`. Use the same `when to use` text as the schema
  doc:
  - `code` — implementing features, fixing bugs, writing tests
  - `write` — long-form text, documentation, structured reports
  - `research` — synthesizing multiple sources, connecting concepts
  - `collect` — fetching data, format conversion, file discovery

**Built-in defaults (when no config file exists)**: every role uses
`sonnet`. This is conservative — Sonnet is available on every subscription
tier and most API plans, so `/sprint` runs without model-access errors.

**Print this hint when running with built-in defaults** (no config file
found at any layer): "Using safe defaults (all Sonnet). Planner quality is
better with Opus — run /agent-harness:init to upgrade if you have Opus
access."

If `{planner_model}` resolves to `opus` (because the user picked `full-access`
in the wizard) and the user has no Opus access, the Phase 2 spawn will
fail. Recover by re-running `/agent-harness:init` and selecting a
non-Opus preset.

---

## Phase 1 — Initialize Workspace

Create the sprint workspace directory: `.sprint/<timestamp>/`
where `<timestamp>` is the current UTC time in format `YYYYMMDD-HHmmss`.

If `.sprint/` is not already listed in `.gitignore`, append the line `.sprint/` to `.gitignore`.

Write `.sprint/<timestamp>/sprint-meta.json`:
```json
{
  "iteration": 1,
  "max_iterations": 3,
  "status": "running",
  "started_at": "<ISO timestamp>",
  "spec": "<$ARGUMENTS verbatim>",
  "workspace": ".sprint/<timestamp>"
}
```

All subsequent sprint files go inside `.sprint/<timestamp>/`. Reference this path as `{workspace}` in later phases.

---

## Phase 2 — Planner

Step 2a: Read these files and hold their full text in memory:
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/planner.md` → PLANNER_CONTENT
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/handoff-schema.md` → SCHEMA_CONTENT

Step 2b: Spawn a subagent (model: {planner_model}) with a prompt assembled from these parts in order:

```
{PLANNER_CONTENT — paste full text}

---

## Handoff Schema (reference)

{SCHEMA_CONTENT — paste full text}

---

## Resolved Model Routing Table (assigned by orchestrator for this sprint)

{generator_routing_table — paste the 4-row table built in Phase 0}

---

## Your Assignment

SPEC: {$ARGUMENTS verbatim}
WORKSPACE: {workspace}

Write `{workspace}/sprint-plan.md` following the sprint-plan.md schema exactly.
Use the Resolved Model Routing Table above to assign each task's `model` field
based on its `type`.
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

For every Generator subagent, build the prompt using this template:

```
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

Read all `{workspace}/sprint-progress/*.md` files.
Write `{workspace}/sprint-progress-summary.md` listing each task ID, status (DONE/BLOCKED), and one-sentence summary.

---

## Phase 5 — Evaluator

Step 5a: Read these files and hold their full text in memory:
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/evaluator.md` → EVALUATOR_CONTENT
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/handoff-schema.md` → SCHEMA_CONTENT
- `{workspace}/sprint-plan.md` → PLAN_CONTENT
- `{workspace}/sprint-progress-summary.md` → SUMMARY_CONTENT
- All `{workspace}/sprint-progress/*.md` → PROGRESS_FILES (labelled by task ID)

Step 5b: Spawn a subagent (model: {evaluator_model}) with a prompt assembled from these parts:

```
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

## Phase 7 — Post-Sprint Actions (only if spec requested any)

After Phase 6 reports done, if `sprint-plan.md` Interpretation lists any
"out-of-orchestrator scope" items the user expects performed (e.g. "push to
GitHub when done", "open in browser"), the orchestrator handles them with a
destructive-action gate:

1. **Classify each item**:
   - **Destructive** (modifies shared / production / external systems): push to main,
     deploy, drop / delete, force push, reset --hard, send to external chat / Slack,
     post to issue tracker, modify production state, share secrets
   - **Non-destructive**: open browser, copy file path to clipboard, print summary,
     read-only display

2. **For destructive items**:
   - If spec specifies target precisely (exact branch / env / recipient / scope):
     execute, then in the final report state "Executed X because spec specified Y"
   - If spec is vague (no target / "deploy somewhere" / "tell the team" / "share it"):
     **ask user before executing — do NOT auto-execute even in auto mode**
     (Auto mode rule 5: destructive actions still need explicit confirmation)
   - Force push to main / master is never auto-executed regardless of spec wording

3. **For non-destructive items**: execute directly.

4. **Reference**: `.claude/rules/ai-collaboration.md` Push-to-main Workflow defines
   per-repo push policy; this gate is the orchestrator-level guard above it.

---

## Output Example

```
Sprint complete — Iteration 1

Built:
  TASK-001  Login page with email/password fields     PASS
  TASK-002  Google OAuth button and callback route    PASS
  TASK-003  Session persistence (7-day cookie)        PASS

Files changed: 6 files, +312 lines
Workspace: .sprint/20260427-143022/
```

---

## Gotchas

- Phase 0 reads model config from `~/.claude/agent-harness.json` (user-level) and `./.claude/agent-harness.local.json` (project override). Missing config falls back to all-Sonnet — safe across every tier, but Planner quality is better with Opus
- Users with Opus access should run `/agent-harness:init` and pick `full-access` to upgrade Planner to Opus. Without that, /sprint still works on Sonnet, just with slightly lower planning quality
- Workspace path is `.sprint/<timestamp>/` — all handoff files live there, not in the project root
- Phases 2, 3, and 5 embed full file content into each Agent prompt string — cold-start agents cannot read files they were not given; never pass a file path as a substitution for file content
- Phase 3 generators also receive the full `sprint-plan.md` content in their prompt — they do not need separate Read access to it
- If Agent Teams is not available, `parallel_batch` runs sequentially — note this in output but do not abort the sprint
- Generator subagents must NOT commit or push — the PreToolUse hook blocks `git push` during any active sprint
- If Phase 2 produces a malformed `sprint-plan.md` (missing `parallel_batch` or `sequential_tasks`): stop and report to user rather than continuing
- `sprint-meta.json` is the source of truth for iteration count — always read it fresh at the start of Phase 6, never use a cached value
- When retrying, Generators receive both the original `sprint-plan.md` AND the failed `sprint-eval.md` so they know exactly what failed and why
- `.sprint/` is gitignored — sprint artifacts are local-only by default; do not commit them
- If spec mentions a target folder (e.g. "build under sprint/foo/"), Planner will overwrite existing files in that folder by default — Interpretation must explicitly state "existing files at <path> will be overwritten; if you intended to keep them, abort and rerun with `do not overwrite existing files in <path>` in the spec"
