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

## Tip — Plan Mode First (recommended)

For ambiguous specs (vague verbs, missing acceptance criteria, multiple
possible interpretations), **enter plan mode** before invoking `/sprint`:

- Most models reason more carefully in plan mode and surface clarifying
  questions before committing to a workspace
- The Planner phase still runs, but starts from a sharpened spec rather
  than the original 1-sentence prompt
- Press `Esc` then `P` (Claude Code default) or your terminal's
  plan-mode keybinding to enter

This is a recommendation, not a requirement. Crisp specs (single
concrete deliverable, clear acceptance) can skip plan mode and run
`/sprint` directly.

## Path Token Convention (v0.3.0+)

Inside this skill, `${CLAUDE_PLUGIN_ROOT}` is the active path-substitution
token under Claude Code. v0.3.0 introduced `${AGENT_HARNESS_ROOT}` as
the vendor-neutral synonym — when this skill is invoked from Codex or
Auggie host runtimes (v0.6.0 target), they will substitute
`${AGENT_HARNESS_ROOT}` to the equivalent install directory. **Under
Claude Code v0.4.x the two are equivalent; treat them as aliases.**

References (read on demand):
- `${AGENT_HARNESS_ROOT}/skills/sprint/references/config-schema.md` —
  routing config, schema v2 (auto-lifts v1)
- `${AGENT_HARNESS_ROOT}/skills/sprint/references/sprint-contract.schema.md` —
  vendor-neutral artifact schema (consumed by all engines)
- `${AGENT_HARNESS_ROOT}/skills/sprint/references/engine-flag-matrix.md` —
  CLI flag mapping for Claude Code / Codex / Auggie generator backends
- `${AGENT_HARNESS_ROOT}/skills/sprint/references/model-registry.md` —
  valid model IDs per engine (verified per release)
- `${AGENT_HARNESS_ROOT}/skills/sprint/references/cross-host-deployment.md` —
  host detection and degradation matrix

---

## Input

```
$ARGUMENTS
```

If arguments are empty: ask the user for a spec before proceeding.

---

## Phase 0 — Resolve Model Routing

Read configuration in this order; the first existing file wins for any given
field, and later sources only fill in missing fields. Built-in defaults
backfill anything nobody set. **Path lookup depends on host** — see
`config-schema.md` § Lookup Order for the full table.

Default lookup (when host is unknown or claude-code):
1. `./.claude/agent-harness.local.json` — project-level override
2. `~/.claude/agent-harness.json` — user-level
3. Built-in defaults

For each Read attempt, treat ENOENT (file not found) as `{}` — never error on
missing config.

### Schema v1 → v2 auto-lift

If the loaded config has `version: 1` or no `version` field:

1. Determine the engine to attribute v1 string models to:
   - If config has a top-level `host` field → use that as engine
   - Else run `adapters/detect-host.sh` (or `.ps1` on Windows) and read
     `running_host`
   - If `running_host=unknown` → ABORT and report:
     > "v1 config without host field cannot be auto-lifted in an
     > ambiguous environment. Re-run `/agent-harness:init` (optionally
     > with `--host=<name>`) to regenerate with explicit host."
2. For each role under `models.*`:
   - If value is a string: replace with `{ engine: <inferred>, model: <string> }`
   - If value is already an object: keep as-is
3. Set `version: 2` and `host: <inferred>`
4. Write the lifted v2 back to the same path

The lift only adds structure; model strings are preserved verbatim.

### Validate against model-registry

For each `models.*.{engine, model}`:
- Check `engine` is in `{claude, codex, auggie}` — else ABORT with the
  specific role / engine name
- Check `model` is in the registry list for that engine
  (`${AGENT_HARNESS_ROOT}/skills/sprint/references/model-registry.md`)
- Unknown model with `engine=auggie` → WARN ("BYOM allowed but not
  validated"); proceed
- Unknown model with `engine=claude` or `codex` → ABORT, suggest
  re-running init

### Hold resolved values in scope

- `{planner_engine}` + `{planner_model}` — substituted into Phase 2b
- `{evaluator_engine}` + `{evaluator_model}` — substituted into Phase 5b
- `{generator_routing_table}` — a 4-row markdown table built from
  `models.generator.{code,write,research,collect}`, with columns
  `type | engine | model | when to use`. Use the schema doc text:
  - `code` — implementing features, fixing bugs, writing tests
  - `write` — long-form text, documentation, structured reports
  - `research` — synthesizing multiple sources, connecting concepts
  - `collect` — fetching data, format conversion, file discovery

### Defaults & hints

**Built-in defaults (when no config file exists)**: every role uses
`{engine: claude, model: sonnet}`. This is conservative — Claude Sonnet
is available on every subscription tier and most API plans, so `/sprint`
runs without model-access errors. **Note:** if the host is detected as
`codex` or `auggie` and there is no config, /sprint cannot use Claude
defaults — it will print:
> "Detected host=<host> with no config. Run /agent-harness:init first
> so /sprint knows which models to route to."
> and abort cleanly.

**Print this hint when running with built-in defaults under claude-code**
(no config file found at any layer): "Using safe defaults (all
claude/sonnet). Planner quality is better with Opus — run
/agent-harness:init to upgrade if you have Opus access."

**Plan-mode tip**: print on Phase 0 finish (always):
> "Tip: ambiguous spec? Plan mode often catches mis-understandings before
> the workspace is created."

### When the spawn would fail

If `{planner_model}` resolves to a model the user lacks access to (e.g.
`opus` without Opus subscription, or `gpt-5.5` without that beta), the
Phase 2 spawn will fail at first turn. Recover by re-running
`/agent-harness:init` and selecting an accessible preset.

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

Step 2b: Spawn the Planner using `{planner_engine}` + `{planner_model}`:

- If `{planner_engine}` == `claude` → spawn via the `Agent` tool with
  `model: {planner_model}`.
- If `{planner_engine}` == `codex` or `auggie` → write the prompt to
  `{workspace}/.prompts/planner.md` and run via Bash:
  - codex:  `bash ${AGENT_HARNESS_ROOT}/adapters/run-codex.sh planner {workspace} {planner_model} {workspace}/.prompts/planner.md`
  - auggie: `bash ${AGENT_HARNESS_ROOT}/adapters/run-auggie.sh planner {workspace} {planner_model} {workspace}/.prompts/planner.md`
  Each adapter writes the final assistant message to
  `{workspace}/sprint-plan.md` (auggie via post-processing).
  Adapters are stubs in v0.4.0 and exit 64; full implementation lands
  in v0.4.1 (codex) / v0.5.0 (auggie). Until then, on non-claude
  engines, fall back to a clear error: "Planner engine={engine} not yet
  runnable; v0.4.0 ships scaffolding only. Use claude planner or wait
  for v0.4.1+."

Prompt assembled from these parts in order:

```
{PLANNER_CONTENT — paste full text}

---

## Handoff Schema (reference)

{SCHEMA_CONTENT — paste full text}

---

## Resolved Model Routing Table (assigned by orchestrator for this sprint)

{generator_routing_table — paste the 4-row table built in Phase 0; columns are type | engine | model | when to use}

---

## Your Assignment

SPEC: {$ARGUMENTS verbatim}
WORKSPACE: {workspace}

Write `{workspace}/sprint-plan.md` following the sprint-plan.md schema exactly.
Use the Resolved Model Routing Table above to assign each task's `engine`
AND `model` fields based on its `type`. Both fields are required per task
in v0.4.0+ — see sprint-contract.schema.md.
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

Step 3b: For each task, branch on `task.engine` (read from sprint-plan.md):

### Branch by engine

- **engine == claude** → spawn via the `Agent` tool with `model: task.model`.
  Parallel via Agent Teams (see Step 3c) when applicable.
- **engine == codex** → write task prompt to `{workspace}/.prompts/{task-id}.md`,
  then run via Bash:
  ```bash
  bash ${AGENT_HARNESS_ROOT}/adapters/run-codex.sh \
    {task-id} {workspace} {task.model} {workspace}/.prompts/{task-id}.md
  ```
  Adapter writes `{workspace}/sprint-progress/{task-id}.md` directly via
  `codex exec --output-last-message`. v0.4.0 ships stub; v0.4.1 wires
  real impl. Until then: skip the task and surface "codex backend
  pending" as BLOCKED in progress.
- **engine == auggie** → same shape but with `run-auggie.sh`. v0.5.0
  delivers real impl.

### Step 3c: Agent Teams (claude tasks only)

If `parallel_batch` contains 2+ claude tasks, check Agent Teams:
```bash
echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
```

#### If output is non-empty (Agent Teams available):
Spawn all claude `parallel_batch` tasks as **teammates** simultaneously
in a single message (one Agent tool call per task, all in the same turn).
Wait for ALL teammates to complete before proceeding.

#### If output is empty (Agent Teams NOT available):
Spawn each claude `parallel_batch` task as a **subagent** sequentially.
Note: "Agent Teams not available — parallel_batch running sequentially."

#### codex / auggie parallelism

When `parallel_batch` includes codex or auggie tasks, spawn each adapter
script via Bash with `run_in_background: true`, then `wait` in a barrier
before Phase 4 starts. Agent Teams does not affect non-claude engines.

### Sequential tasks (all cases):

For each task ID in `sequential_tasks` (in listed order):
- Branch by engine as above
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

Step 5b: Spawn the Evaluator using `{evaluator_engine}` + `{evaluator_model}`,
following the same engine-branch logic as Phase 2b (claude → Agent;
codex/auggie → adapter script with prompt file). Evaluator writes
`{workspace}/sprint-eval.md`.

Prompt assembled from these parts:

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
- v0.3.0 adds `references/sprint-contract.schema.md` (artifact schema), `references/engine-flag-matrix.md` (CLI flags by backend), and `references/cross-host-deployment.md` (host detection). v0.3.1 adds detect-host adapter scripts. v0.4.0 adds schema v2 (engine-namespaced models), `references/model-registry.md`, host-aware presets in init wizard, and cross-engine Phase 2/3/5 dispatch.
- v0.4.0 still ships codex/auggie adapter scripts as stubs (exit 64). Phase 2/3/5 will surface BLOCKED for non-claude tasks until v0.4.1 (codex) and v0.5.0 (auggie) wire the real implementations. The sprint contract artifacts and config schema are forward-compatible — once adapters land, existing configs work without changes.
- v0.4.0 wizard always asks for the primary host explicitly (Step 0c), even when detection is confident. This is a deliberate fix from v0.3.x's silent-fallback bug; it costs one extra Enter in the common case but prevents the wizard from writing the wrong-host config in mixed environments.
- Plan-mode tip is printed by Phase 0 every run. Users running automated sprints can ignore it; users with vague specs should heed it before launching the workspace.
