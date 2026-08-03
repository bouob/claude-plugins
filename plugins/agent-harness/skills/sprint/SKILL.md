---
name: sprint
description: >
  Autonomous multi-agent sprint: Planner decomposes spec → plan checkpoint (user approves,
  edits, or replans before anything is implemented; `auto` flag skips it) → Generators
  implement in parallel via a Claude Code dynamic workflow (Agent-tool fallback when
  workflows are unavailable) → Evaluator verifies against acceptance criteria → iterates
  up to 3 times.
  Use when spec requires 3+ distinct tasks or multi-step implementation across files or domains.
  Do NOT use for: single-file edits, quick bug fixes, or tasks completable in one context window.
allowed-tools: Read, Write, Bash, Glob, Grep, Agent, Workflow, TodoWrite, TodoRead, AskUserQuestion
argument-hint: "[auto] [product spec — 1 to 4 sentences describing what to build]"
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

## Two gates, two failure classes

A wrong direction caught after Generators run costs a full iteration to
rescue; caught before, it costs one plan re-read. `/sprint` therefore has
two gates in front of implementation:

1. **Plan mode (optional, before `/sprint`)** — catches a wrong or
   ambiguous **spec**. For vague verbs, missing acceptance criteria, or
   multiple possible interpretations, enter plan mode first so the
   Planner starts from a sharpened spec.
2. **Plan checkpoint (Phase 3, built-in)** — catches a wrong
   **decomposition**. The Planner's plan comes back to the main session
   for your approval before any Generator launches. You can approve,
   edit the plan file, replan with feedback, or abort. Prefix the spec
   with `auto` to skip this gate and run fully autonomously.

## References (read on demand)

- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/config-schema.md` —
  routing config, schema v4 (auto-lifts v1 / v2 / v3)
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/sprint-contract.schema.md` —
  artifact schema for sprint-meta / plan / progress / eval files
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/planner.md` — Planner
  role prompt
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/generator.md` —
  Generator role prompt
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/evaluator.md` —
  Evaluator role prompt
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/handoff-schema.md` —
  inter-phase handoff schema
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/agent-fallback.md` —
  legacy Agent-tool orchestration (used when dynamic workflows are
  unavailable)

---

## Input

```
$ARGUMENTS
```

If arguments are empty: ask the user for a spec before proceeding.

**`auto` flag**: if `$ARGUMENTS` starts with the word `auto` followed by a
space, set `{checkpoint_mode}` = `skip` and strip the flag — everything
after it is the spec. Otherwise `{checkpoint_mode}` = `review`. All later
references to "the spec" mean the flag-stripped text; it is what goes into
`sprint-meta.json` and every agent prompt.

---

## Phase 0 — Resolve Model Routing

Read configuration in this order; the first existing file wins for any
given field, and later sources only fill in missing fields. Built-in
defaults backfill anything nobody set.

1. `./.claude/agent-harness.local.json` — project-level override
2. `~/.claude/agent-harness.json` — user-level
3. Built-in defaults (see `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/config-schema.md`)

For each Read attempt, treat ENOENT (file not found) as `{}` — never
error on missing config.

Valid `model` values: `fable` / `opus` / `sonnet` / `haiku`. The config
routes **subagents only** — the orchestrator (this session) keeps the
model the user selected via `/model`.

### Auto-lift legacy schemas (v1 / v2 / v3 → v4)

`config-schema.md` § Migration documents the lift rules. Briefly:

- **v1** (≤ v0.3.x): plain string models. Lift each into `{model, effort}`
  with role-defaulted effort.
- **v2** (v0.4.x – v0.5.x): roles wrapped in `{engine, model}`. If
  `engine == "claude"`, lift to `{model: value.model, effort: <default>}`;
  if `engine` is `codex` or `auggie`, ABORT and tell the user to re-run
  `/agent-harness:init` (v0.6.0 dropped multi-host support).
- **v3** (v0.6.x): plain string models without effort. Lift each into
  `{model, effort}` with role-defaulted effort.

Role-defaulted effort during lift:
- `planner`, `generator.research` → `high`
- `evaluator`, `generator.code` → `medium`
- `generator.write`, `generator.collect` → `low`

Write the lifted v4 back to the same path so subsequent reads are fast.

### Step 0b — Load role prompts

Read these files now and hold their full text in memory — both backends
need them:

- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/planner.md` → PLANNER_CONTENT
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/generator.md` → GENERATOR_CONTENT
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/evaluator.md` → EVALUATOR_CONTENT
- `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/handoff-schema.md` → SCHEMA_CONTENT

### Hold resolved values in scope

- `{planner_model}`, `{planner_effort}`
- `{evaluator_model}`, `{evaluator_effort}`
- `{generator_routing_table}` — a 4-row markdown table built from
  `models.generator.{code,write,research,collect}` with columns
  `type | model | effort | when to use`. Use the schema doc text:
  - `code` — implementing features, fixing bugs, writing tests
  - `write` — long-form text, documentation, structured reports
  - `research` — synthesizing multiple sources, connecting concepts
  - `collect` — fetching data, format conversion, file discovery

### Effort resolution (differs by backend)

Reasoning effort is **clamped to the model's valid ladder first** (ladder
table below), then delivered differently on each backend:

- **Workflow backend** (this file's Phase 2 / Phase 4 scripts): pass the clamped value
  as the native `effort` opt — `agent(prompt, { model, effort, ... })`. The
  script's `effortOpt(model, effort)` helper returns `{ effort }` or `{}`
  (omitted for `haiku` / anything that clamps to empty). No keyword injected.
- **Fallback backend** (`agent-fallback.md`, Agent-tool path): the `Agent`
  tool does NOT accept `effort`, so the clamped value is injected as a keyword
  at the **top** of the subagent prompt via the table below.

| `effort` value | Fallback keyword to inject |
|---|---|
| `low` | _(no keyword — omit the line entirely)_ |
| `medium` | `Think.` |
| `high` | `Think hard.` |
| `xhigh` | `Think harder.` |
| `max` | `Ultrathink.` |

(`ultracode` is intentionally NOT an effort value — it collides with the
Claude Code Workflow multi-agent opt-in keyword. `max` is the ceiling.)

**Effort is not uniform across models.** Each model accepts a different
range, so effort is resolved against the model's valid ladder and
**rounded down** to the highest level that model supports — on both backends:

| Model | Valid effort ladder |
|---|---|
| `haiku` | _(none — no effort passed / no keyword injected, regardless of config)_ |
| `sonnet` / `opus` / `fable` / `mythos` | `low` / `medium` / `high` / `xhigh` / `max` |

Clamp examples: `haiku`+anything → omitted; `sonnet`+`xhigh` → `xhigh`;
`opus`+`max` → `max`. Since Sonnet 5 every non-`haiku` model is on the full
ladder, so the clamp is currently a no-op for them — it remains as a guard.

Both backends share the clamp. The workflow script does it in
`normalizeEffort(model, effort)`, then `effortOpt` wraps the result as an opt;
the fallback orchestrator applies the same clamp by hand, then maps to the
keyword table above. `{effort_keyword(role_or_type)}` in `agent-fallback.md`
means: take the role/type's **model AND effort**, clamp, then map via the
keyword table — empty for `low`, `haiku`, or any value that clamps to empty.

Note: roles routed to `fable` (Claude Fable 5) use adaptive thinking — effort
has limited effect there. Pass/inject it anyway for consistency. `mythos`
(Mythos 5) is restricted to Project Glasswing accounts; if the account lacks
access the spawn fails the same way an inaccessible `opus` does.

### Defaults & hints

**Built-in defaults (no config file)**: every reasoning role uses
`sonnet` at `medium` effort, `collect` at `low`. Safe across every tier
and API plan — `/sprint` runs without model-access errors.

**Print this hint when running with built-in defaults** (no config file
at any layer):
> "Using safe defaults (all Sonnet, medium effort). Planner quality is
> better with Opus or Fable 5 + high effort — run /agent-harness:init
> to upgrade if you have access."

**Plan-mode tip** — print on Phase 0 finish (always):
> "Tip: ambiguous spec? Plan mode often catches mis-understandings
> before the workspace is created."

### When the spawn would fail

If `{planner_model}` resolves to a model the user lacks access to
(e.g. `opus` without Opus subscription, or `fable` without Fable 5
access), the Planner spawn will fail at first turn. Recover by
re-running `/agent-harness:init` and selecting an accessible preset.

---

## Phase 1 — Initialize Workspace

Create the sprint workspace directory: `.sprint/<timestamp>/`
where `<timestamp>` is the current UTC time in format `YYYYMMDD-HHmmss`.
Compute the timestamp and the ISO `started_at` value **now, in this
session** — the workflow script cannot call `Date.now()` (it throws
inside workflow scripts), so these values travel into the workflow via
`args`.

If `.sprint/` is not already listed in `.gitignore`, append the line
`.sprint/` to `.gitignore`. This must happen here, before any agent
writes artifacts — never delegate it to a subagent.

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

All subsequent sprint files go inside `.sprint/<timestamp>/`. Reference
this path as `{workspace}` in later phases — always the **relative**
path (`.sprint/<timestamp>`), never an absolute Windows path (backslashes
read as escape noise inside agent prompts).

---

## Phase 2 — Plan Stage

### Step 2a — Backend check

If the `Workflow` tool is available in the current tool set (Claude Code
≥ 2.1.154 with dynamic workflows enabled): use the **workflow backend**
(Step 2b). Invoking it from this skill counts as user opt-in — `/sprint`
may call `Workflow` directly.

If the `Workflow` tool is absent, or the launch is rejected/disabled:
print
> "Dynamic workflows unavailable — using Agent-tool fallback."

then execute Phase 2 (Planner) of
`${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/agent-fallback.md`, come
back to **Phase 3 (Plan Checkpoint)** of this file, and only after the
checkpoint approves run the fallback's Phases 3–6 (they run in this
session). On completion continue at Phase 6 of this file (skip the
meta-status updates the fallback already did).

### Step 2b — Assemble plan `args`

Build a JSON object for the plan workflow's `args` input. Passing all
variable content through `args` (instead of pasting it into the script
source) avoids JS string-escaping bugs and keeps the script body stable
for `resumeFromRunId`:

```json
{
  "spec": "<spec, auto flag stripped>",
  "workspace": ".sprint/<timestamp>",
  "plannerModel": "<planner_model>",
  "plannerEffort": "<planner_effort>",
  "routingTable": "<generator_routing_table markdown>",
  "plannerContent": "<PLANNER_CONTENT>",
  "schemaContent": "<SCHEMA_CONTENT>",
  "feedback": ""
}
```

`feedback` is empty on the first launch; the Phase 3 "replan" path
relaunches this same workflow with the user's feedback in it.

Pass `args` as a real JSON object in the Workflow tool call — not a
JSON-encoded string.

### Step 2c — Launch the plan workflow

Call the `Workflow` tool with the script template below, adapted only
if the runtime reports an API difference. Authoring rules (violating
any of these breaks the run or its resumability):

1. `export const meta = {...}` first, **pure literal** — no variables,
   no interpolation.
2. Build every prompt by **string concatenation** (`a + '\n' + b`).
   **Never** use backtick template literals to embed role-prompt content
   — the markdown contains backticks and `${`-shaped text that
   terminates or interpolates the literal.
3. **No `Date.now()`, `Math.random()`, or argless `new Date()`** —
   they throw inside workflow scripts. Timestamps come from `args`.
4. The script has no filesystem access — every file read/write happens
   inside an agent. Agents receive the `{workspace}` path and read the
   artifacts themselves.

```js
export const meta = {
  name: 'sprint-plan',
  description: 'Planner decomposes the spec into a reviewable sprint plan',
  phases: [
    { title: 'Plan', detail: 'decompose spec into tasks' },
  ],
}

// Per-model valid effort ladders. haiku takes no effort; every other model
// accepts the full low..max range (Sonnet gained `xhigh` with Sonnet 5).
const EFFORT_LADDER = {
  haiku: [],
  sonnet: ['low', 'medium', 'high', 'xhigh', 'max'],
  opus: ['low', 'medium', 'high', 'xhigh', 'max'],
  fable: ['low', 'medium', 'high', 'xhigh', 'max'],
  mythos: ['low', 'medium', 'high', 'xhigh', 'max'],
}
const EFFORT_RANK = { low: 0, medium: 1, high: 2, xhigh: 3, max: 4 }
// Round the requested effort DOWN to the highest level valid for the model.
// e.g. haiku/anything -> '' (effort omitted). With every non-haiku model now on
// the full ladder, clamping is a no-op for them — it stays as a guard for any
// future model whose ladder is shorter.
function normalizeEffort(model, effort) {
  const ladder = EFFORT_LADDER[model] || EFFORT_LADDER.sonnet
  if (!ladder.length) return ''
  const want = EFFORT_RANK[effort]
  if (want === undefined) return ''
  let best = ''
  for (const lvl of ladder) {
    if (EFFORT_RANK[lvl] <= want) best = lvl
  }
  return best
}
// Workflow agent() accepts a native `effort` opt. Clamp to the model's valid
// ladder first, then spread the result into the agent() opts object.
// haiku / out-of-range -> '' -> omit the opt entirely (agent inherits session effort).
function effortOpt(model, effort) {
  const e = normalizeEffort(model, effort)
  return e ? { effort: e } : {}
}

const PLAN_SCHEMA = {
  type: 'object',
  required: ['tasks', 'parallel_batch', 'sequential_tasks'],
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'type', 'model', 'effort', 'depends_on', 'acceptance_criteria'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          type: { enum: ['code', 'write', 'research', 'collect'] },
          model: { enum: ['fable', 'mythos', 'opus', 'sonnet', 'haiku'] },
          effort: { enum: ['low', 'medium', 'high', 'xhigh', 'max'] },
          depends_on: { type: 'array', items: { type: 'string' } },
          acceptance_criteria: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    parallel_batch: { type: 'array', items: { type: 'string' } },
    sequential_tasks: { type: 'array', items: { type: 'string' } },
  },
}

phase('Plan')
let plannerPrompt =
  args.plannerContent
  + '\n\n---\n\n## Handoff Schema (reference)\n\n' + args.schemaContent
  + '\n\n---\n\n## Resolved Model Routing Table (assigned by orchestrator for this sprint)\n\n' + args.routingTable
  + '\n\n---\n\n## Your Assignment\n\nSPEC: ' + args.spec
  + '\nWORKSPACE: ' + args.workspace
  + '\n\nWrite `' + args.workspace + '/sprint-plan.md` following the sprint-plan.md schema exactly.'
  + '\nUse the Resolved Model Routing Table above to assign each task\'s `model` AND `effort` fields based on its `type`.'
  + '\nYour structured return must agree with the file: the file is the record, the return drives scheduling.'
if (args.feedback) {
  plannerPrompt = plannerPrompt
    + '\n\n---\n\n## User Feedback on Previous Plan\n\n' + args.feedback
    + '\n\nA previous plan exists at `' + args.workspace + '/sprint-plan.md`. Read it, apply the feedback, and overwrite the file.'
}

const plan = await agent(plannerPrompt, { label: 'planner', phase: 'Plan', model: args.plannerModel, ...effortOpt(args.plannerModel, args.plannerEffort), schema: PLAN_SCHEMA })
if (!plan || !plan.tasks || !plan.tasks.length) {
  return { overall: 'ERROR', reason: 'Planner returned no tasks', workspace: args.workspace }
}
return { overall: 'PLANNED', plan: plan, workspace: args.workspace }
```

Wait for the plan workflow to complete. Its return value carries the
structured plan into Phase 3. Nothing has been implemented at this point
— the Planner only wrote `{workspace}/sprint-plan.md`.

---

## Phase 3 — Plan Checkpoint (main session)

The point of this phase: **a wrong direction dies here, before any
Generator writes a file.** Rescuing a misdirected sprint after
implementation costs a full iteration; rejecting a bad plan costs one
read.

If the plan workflow returned `overall: "ERROR"`: update
`{workspace}/sprint-meta.json` → `status: "blocked"`, report the reason,
and stop (a rejected model spawn usually means the config names a model
the account lacks — suggest re-running `/agent-harness:init`).

Otherwise hold the returned `plan` object as `{approved_plan}` candidate.
Read `{workspace}/sprint-plan.md` and present the plan to the user:

- **Interpretation** — verbatim from `sprint-plan.md` (this is where the
  Planner records its reading of the spec, every assumption, and any
  out-of-orchestrator-scope items)
- **Acceptance criteria** — the full list
- **Tasks** — a table: id | title | type | model + effort | depends_on
- **Schedule** — `parallel_batch` vs `sequential_tasks`

If `{checkpoint_mode}` is `skip` (`auto` flag): print the plan summary
for the record and continue straight to Phase 4.

Otherwise ask via `AskUserQuestion` (single-select) with these options:

1. **核准，開始實作 (Recommended)** — `{approved_plan}` is final;
   proceed to Phase 4.
2. **我要修改計畫** — tell the user to edit
   `{workspace}/sprint-plan.md` directly and say when they are done.
   Then re-read the file and rebuild the structured plan from it
   (Planner return shape in `handoff-schema.md`). Validate before
   proceeding: every task has `id` / `title` / `type` / `model` /
   `effort` / `acceptance_criteria` with enum-valid values;
   `parallel_batch` + `sequential_tasks` together cover ALL task ids;
   every `depends_on` references an existing task. Report what changed
   relative to the original plan, set the rebuilt object as
   `{approved_plan}`, and proceed to Phase 4. If validation fails, name
   the exact broken field and let the user fix and retry.
3. **重新規劃（附回饋）** — collect the user's feedback text, then
   relaunch the Phase 2 plan workflow with `args.feedback` set to it
   (all other args unchanged; this is a fresh launch, not a resume —
   a resume would replay the cached plan). Return to the top of this
   phase with the new plan.
4. **放棄 sprint** — update `{workspace}/sprint-meta.json` →
   `status: "blocked"`, report that the sprint was abandoned at the
   plan checkpoint, and stop.

Dual-channel rule at the checkpoint: after approval, `{approved_plan}`
(the structured JSON) is what drives scheduling in Phase 4, and
`sprint-plan.md` is the durable record the Generators and Evaluator
read — **they must agree**. That is why the edit path rebuilds the JSON
from the edited file rather than patching the JSON alone.

---

## Phase 4 — Execute Workflow (Generate → Aggregate → Evaluate)

### Step 4a — Assemble exec `args`

```json
{
  "workspace": ".sprint/<timestamp>",
  "maxIterations": 3,
  "plan": "<{approved_plan} — the real JSON object, not a string>",
  "evaluatorModel": "<evaluator_model>",
  "evaluatorEffort": "<evaluator_effort>",
  "generatorContent": "<GENERATOR_CONTENT>",
  "evaluatorContent": "<EVALUATOR_CONTENT>",
  "schemaContent": "<SCHEMA_CONTENT>"
}
```

### Step 4b — Launch the exec workflow

Same authoring rules as Step 2c.

```js
export const meta = {
  name: 'sprint-exec',
  description: 'Parallel Generators -> Evaluator sprint with retry loop, from an approved plan',
  phases: [
    { title: 'Generate', detail: 'implement tasks in parallel' },
    { title: 'Aggregate', detail: 'summarize progress files' },
    { title: 'Evaluate', detail: 'verify acceptance criteria' },
  ],
}

// Per-model valid effort ladders — same helpers as the plan script.
const EFFORT_LADDER = {
  haiku: [],
  sonnet: ['low', 'medium', 'high', 'xhigh', 'max'],
  opus: ['low', 'medium', 'high', 'xhigh', 'max'],
  fable: ['low', 'medium', 'high', 'xhigh', 'max'],
  mythos: ['low', 'medium', 'high', 'xhigh', 'max'],
}
const EFFORT_RANK = { low: 0, medium: 1, high: 2, xhigh: 3, max: 4 }
function normalizeEffort(model, effort) {
  const ladder = EFFORT_LADDER[model] || EFFORT_LADDER.sonnet
  if (!ladder.length) return ''
  const want = EFFORT_RANK[effort]
  if (want === undefined) return ''
  let best = ''
  for (const lvl of ladder) {
    if (EFFORT_RANK[lvl] <= want) best = lvl
  }
  return best
}
function effortOpt(model, effort) {
  const e = normalizeEffort(model, effort)
  return e ? { effort: e } : {}
}

const EVAL_SCHEMA = {
  type: 'object',
  required: ['overall', 'retry_tasks'],
  properties: {
    overall: { enum: ['PASS', 'FAIL'] },
    retry_tasks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'criterion'],
        properties: { id: { type: 'string' }, criterion: { type: 'string' } },
      },
    },
    notes: { type: 'string' },
  },
}

const plan = args.plan
const taskById = {}
for (const t of plan.tasks) taskById[t.id] = t

function generatorPrompt(task, evalNotes) {
  let body = args.generatorContent
    + '\n\n---\n\n## Handoff Schema (reference)\n\n' + args.schemaContent
    + '\n\n---\n\n## Sprint Plan (structured)\n\n' + JSON.stringify(plan.tasks, null, 2)
    + '\n\n---\n\n## Your Assignment\n\nTASK_ID: ' + task.id
    + '\nWORKSPACE: ' + args.workspace + '/'
    + '\n\nFind your TASK_ID in the Sprint Plan above and implement it.'
    + '\nRead `' + args.workspace + '/sprint-plan.md` for full plan context.'
    + '\nWrite your output to `' + args.workspace + '/sprint-progress/' + task.id + '.md` following the sprint-progress schema.'
    + '\nDo NOT run git commit or git push.'
  if (evalNotes) {
    body += '\n\n---\n\n## Previous Evaluation (what failed and why)\n\n' + evalNotes
  }
  return body
}

let iteration = 1
let parallelIds = plan.parallel_batch || []
let sequentialIds = plan.sequential_tasks || []
let evalNotes = ''
let verdict = null

while (true) {
  log('Iteration ' + iteration + ': ' + (parallelIds.length + sequentialIds.length) + ' task(s)')
  await parallel(parallelIds.map(id => () =>
    agent(generatorPrompt(taskById[id], evalNotes), { label: id, phase: 'Generate', model: taskById[id].model, ...effortOpt(taskById[id].model, taskById[id].effort) })))
  for (const id of sequentialIds) {
    await agent(generatorPrompt(taskById[id], evalNotes), { label: id, phase: 'Generate', model: taskById[id].model, ...effortOpt(taskById[id].model, taskById[id].effort) })
  }

  await agent('Read every file under `' + args.workspace + '/sprint-progress/` and write `'
    + args.workspace + '/sprint-progress-summary.md` listing each task ID, its status (DONE or BLOCKED), and a one-sentence summary.',
    { label: 'aggregate', phase: 'Aggregate', model: 'haiku' })

  const evalPrompt =
    args.evaluatorContent
    + '\n\n---\n\n## Handoff Schema (reference)\n\n' + args.schemaContent
    + '\n\n---\n\n## Your Assignment\n\nWORKSPACE: ' + args.workspace + '/'
    + '\nITERATION: ' + iteration + ' of ' + args.maxIterations
    + '\n\nRead `' + args.workspace + '/sprint-plan.md`, `' + args.workspace + '/sprint-progress-summary.md`,'
    + ' and every file under `' + args.workspace + '/sprint-progress/`.'
    + '\nWrite `' + args.workspace + '/sprint-eval.md` following the sprint-eval.md schema exactly.'
    + '\nIf your overall verdict is FAIL and this is not the final iteration, update the `iteration` field in `'
    + args.workspace + '/sprint-meta.json` to ' + (iteration + 1) + '. Do not touch the `status` field.'
    + '\nYour structured return must agree with sprint-eval.md: the file is the record, the return drives scheduling.'
  verdict = await agent(evalPrompt, { label: 'evaluator', phase: 'Evaluate', model: args.evaluatorModel, ...effortOpt(args.evaluatorModel, args.evaluatorEffort), schema: EVAL_SCHEMA })

  if (!verdict || verdict.overall === 'PASS' || iteration >= args.maxIterations) break

  const retryIds = (verdict.retry_tasks || []).map(r => r.id).filter(id => taskById[id])
  if (!retryIds.length) break
  iteration = iteration + 1
  parallelIds = retryIds.filter(id => !(taskById[id].depends_on || []).length)
  sequentialIds = retryIds.filter(id => (taskById[id].depends_on || []).length)
  evalNotes = JSON.stringify(verdict, null, 2)
}

return {
  overall: verdict ? verdict.overall : 'ERROR',
  iteration: iteration,
  retry_tasks: verdict ? (verdict.retry_tasks || []) : [],
  tasks: plan.tasks.map(t => t.id),
  workspace: args.workspace,
}
```

Wait for the workflow to complete. Its return value is the only thing
that lands in this session's context — all intermediate progress stays
inside the run.

---

## Phase 5 — Inside the Workflows (for reference)

The two scripts together implement the same P-G-E contract as the
fallback path, with the checkpoint spliced between them:

- **Plan** (plan workflow): one Planner agent ({planner_model}) writes
  `{workspace}/sprint-plan.md` AND returns the structured task list.
  Dual-channel rule: the file is the durable record, the structured
  return drives control flow — they must agree.
- **Checkpoint** (main session, Phase 3): the user approves, edits,
  replans, or aborts. The approved plan travels into the exec workflow
  via `args.plan` — the exec script never re-plans.
- **Generate**: `parallel_batch` runs via `parallel()` (true concurrency,
  up to 16 agents — no Agent Teams flag needed); `sequential_tasks` run
  in listed order. Each Generator gets its task's `model` and clamped
  `effort` opt (the fallback backend injects it as a keyword instead).
- **Aggregate**: one Haiku agent writes `{workspace}/sprint-progress-summary.md`.
- **Evaluate**: the Evaluator ({evaluator_model}) reads the workspace
  artifacts, writes `{workspace}/sprint-eval.md`, returns
  `{overall, retry_tasks}`, and on FAIL bumps `iteration` in
  `sprint-meta.json` (the script has no filesystem access, so the agent
  owns this write).
- **Retry loop**: on FAIL with iterations remaining, only `retry_tasks`
  re-enter Generate, with the previous eval verdict appended to their
  prompts. The retry loop stays fully autonomous — the checkpoint gates
  direction, not iteration.

---

## Phase 6 — Post-Workflow Wrap-Up

Read the workflow's return value `{overall, iteration, retry_tasks, tasks, workspace}`.
Read `{workspace}/sprint-eval.md` and `{workspace}/sprint-progress-summary.md`
for report detail.

### If overall is PASS:
1. Update `{workspace}/sprint-meta.json` → `status: "done"`
2. Report to user: summary of what was built, files changed, eval results

### If overall is FAIL (iterations exhausted):
1. Update `{workspace}/sprint-meta.json` → `status: "blocked"`
2. Report to user: which criteria failed, what was attempted across all
   iterations, and specific next steps to take manually

### If overall is ERROR (an exec-side agent died):
1. Update `{workspace}/sprint-meta.json` → `status: "blocked"`
2. Report the reason; suggest re-running `/sprint` (a rejected model
   spawn usually means the config names a model the account lacks —
   re-run `/agent-harness:init`). Planner-side errors never reach this
   phase — they are handled at the Phase 3 checkpoint

The terminal `status` write is always done **here, by the main session**
— never by a workflow agent. While `status` is `"running"`, the
PreToolUse hook blocks `git push`; this wrap-up is what unblocks it.

---

## Phase 7 — Post-Sprint Actions (only if spec requested any)

After Phase 6 reports done, if `sprint-plan.md` Interpretation lists any
"out-of-orchestrator scope" items the user expects performed (e.g. "push to
GitHub when done", "open in browser"), the orchestrator handles them with a
destructive-action gate. These run **after** the workflow returns — a
workflow cannot pause for user input, so nothing inside the script ever
asks for confirmation.

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
Sprint complete — Iteration 1 (workflow backend, plan approved at checkpoint)

Built:
  TASK-001  Login page with email/password fields     PASS
  TASK-002  Google OAuth button and callback route    PASS
  TASK-003  Session persistence (7-day cookie)        PASS

Files changed: 6 files, +312 lines
Workspace: .sprint/20260610-143022/
```

---

## Gotchas

- Phase 0 reads model + effort config from `~/.claude/agent-harness.json` (user-level) and `./.claude/agent-harness.local.json` (project override). Missing config falls back to all-Sonnet/medium-effort — safe across every tier
- Valid models are `fable` / `mythos` / `opus` / `sonnet` / `haiku`. `fable` (Claude Fable 5) needs Fable access on the account and costs ~2× Opus 5 ($10/$50 vs $5/$25 per Mtok); it also silently falls back to Opus 5 on restricted topics. `mythos` (Mythos 5) is restricted to Project Glasswing accounts — and it is NOT in Claude Code's documented model value set (`sonnet` / `opus` / `haiku` / `fable`), so on a non-Glasswing account the spawn may be rejected at parameter validation rather than failing like an inaccessible `opus`. Users with Opus or Fable access should run `/agent-harness:init` and pick `full-access` or `frontier`
- The config routes subagents only — the orchestrator's model is whatever the user picked via `/model`. A Fable 5 main session (1M context) pairs well with Sonnet/Haiku-routed subagents
- **`CLAUDE_CODE_SUBAGENT_MODEL` silently overrides all routing.** That env var sits FIRST in Claude Code's subagent model resolution chain (env var > per-invocation `model` > frontmatter > session model) — if the user has it set, every `model` this skill passes is ignored with no error and all subagents run on the env-var model. When routing appears to have no effect, check this env var before debugging the config
- **Effort delivery differs by backend.** The **workflow** backend passes a native `effort` opt on `agent()` (`agent(prompt, { model, effort })`) via the `effortOpt(model, effort)` helper — no keyword. The **fallback** backend uses the `Agent` tool, which does NOT accept `effort`, so it injects a keyword (`Think hard.`, `Ultrathink.`) at the very top of the prompt. Both clamp to the model's ladder first; `haiku` / out-of-range → effort omitted (workflow) or no keyword (fallback)
- **Effort is per-model** — `haiku` takes no effort (opt omitted / no keyword); `sonnet` / `opus` / `fable` / `mythos` all accept the full `low` → `max` ladder including `xhigh`. **Sonnet gained `xhigh` with Sonnet 5** — before that the ladder omitted it and `sonnet` + `xhigh` silently clamped down to `high`, so any routing table or config still asserting "Sonnet has no xhigh" is stale. The effort is rounded DOWN to the model's nearest valid level (both backends). `ultracode` is not an effort value (it is the Workflow opt-in keyword) — `max` is the ceiling
- Fable 5 uses adaptive thinking — effort has limited effect on `fable`-routed roles; treat their `effort` field as advisory
- **Workflow script authoring**: prompts by string concatenation only — never embed role-prompt markdown in backtick template literals (backticks and `${`-shaped text break the literal). All variable content travels via `args`
- **No `Date.now()` / `Math.random()` / argless `new Date()` in the script** — they throw (they would break resume). The workspace timestamp and `started_at` are computed in Phase 1 and passed via `args`
- Workflow subagents run in `acceptEdits` mode and inherit your tool allowlist — Bash commands outside the allowlist (e.g. `npm test`, build commands) still prompt mid-run with nobody watching. Before a long sprint, allowlist the build/test commands the Generators will need
- A workflow cannot ask the user anything mid-run — that is exactly why the plan is approved at the Phase 3 checkpoint **between** the plan workflow and the exec workflow. Clarifications during Generate/Evaluate still cannot happen, so the approved plan must be decision-complete; spec-level ambiguity belongs in plan mode before `/sprint`, and the destructive-action gate (Phase 7) runs after the exec workflow returns
- `auto` prefix on the spec (`/sprint auto <spec>`) skips the Phase 3 checkpoint — the pre-v2.6 fully autonomous behavior. The flag is stripped before the spec is recorded in `sprint-meta.json`
- **Two workflow runs per sprint** (plan + exec), each with its own runId. Resume the half that failed. Resuming the exec run replays its cached `args.plan` — a plan change requires a fresh Phase 4 launch with new args, not a resume; likewise the Phase 3 replan path relaunches the plan workflow fresh (a resume would replay the cached plan)
- If the user walks away at the checkpoint, `sprint-meta.json` stays `"status": "running"` and the hook keeps blocking `git push` — resolve the checkpoint (approve or abandon) to unblock
- At the checkpoint's edit path, the user-edited `sprint-plan.md` is authoritative — rebuild the structured plan from the file and validate (coverage, enums, depends_on) before launching Phase 4; never launch with a JSON that disagrees with the file
- `parallel()` runs at most 16 agents concurrently; larger batches queue automatically. Planner guidance already caps practical batch size well below this
- **If a workflow run is stopped or crashes, `sprint-meta.json` stays `"status": "running"` and the hook keeps blocking `git push`.** Recover by resuming the run (`/workflows` → resume, or relaunch with `resumeFromRunId`) or by manually setting `status` to `"blocked"`
- Workspace path is `.sprint/<timestamp>/` — always relative; never put absolute Windows paths (backslashes) into agent prompts
- `.sprint/` is gitignored in Phase 1 by the main session — never delegated to an agent; sprint artifacts are local-only by default, do not commit them
- On the workflow backend, agents receive the `{workspace}` path and read artifacts themselves (the script has no filesystem access). On the fallback backend, the orchestrator pastes full file content into prompts — see `agent-fallback.md`
- Generator subagents must NOT commit or push — the prompt forbids it and the PreToolUse hook blocks `git push` during any active sprint
- `sprint-meta.json` write responsibilities: main session writes `"running"` (Phase 1), `"blocked"` on checkpoint abort or plan ERROR (Phase 3), and the terminal `"done"` / `"blocked"` (Phase 6); the Evaluator agent bumps `iteration` on FAIL. No other writer
- If the Planner returns no tasks or a malformed plan, the plan workflow returns `overall: "ERROR"` — handled at the Phase 3 checkpoint (status → `"blocked"`, report, stop); the exec workflow never launches
- When retrying, Generators receive the structured plan AND the failed eval verdict so they know exactly what failed and why
- If spec mentions a target folder (e.g. "build under sprint/foo/"), Planner will overwrite existing files in that folder by default — Interpretation must explicitly state "existing files at <path> will be overwritten; if you intended to keep them, abort and rerun with `do not overwrite existing files in <path>` in the spec"
- **v2.6.0 added the plan checkpoint**: the Planner runs in its own plan workflow, the main session gates the plan (approve / edit / replan / abort) before the Generate→Evaluate exec workflow launches; `auto` restores the old single-shot behavior. This mirrors the Codex adapter's Planning Gate. v2.5.0 moved orchestration to the dynamic-workflow backend (Claude Code ≥ 2.1.154); the Agent-tool path including the `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` check survives only in `references/agent-fallback.md`. v2.3.0 added per-role `effort` (schema v4; v1 / v2 / v3 auto-lift). v0.4.x–v0.5.x multi-host (Codex / Auggie) was rolled back in v0.6.0
- Plan-mode tip is printed by Phase 0 every run. Users running automated sprints can ignore it; users with vague specs should heed it before launching the workspace
