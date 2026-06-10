# agent-harness

[Traditional Chinese](./README.zh-TW.md)

A dual-host agent workflow package for multi-agent orchestration.

- **Claude Code**: plugin commands for autonomous Planner -> Generator -> Evaluator sprints, executed as background dynamic workflows (up to 16 parallel agents) with iterative feedback loops.
- **Codex**: plugin skills for plan-first sprints with explicit subagent delegation, optional per-role routing, and Codex lifecycle hooks.

## Install

### Claude Code

```bash
# Add marketplace (one-time)
/plugin marketplace add bouob/claude-plugins

# Install
/plugin install agent-harness@bouob-plugins

# Or load directly during development
claude --plugin-dir ./agent-harness
```

### Codex

```bash
# From the parent directory that contains agent-harness
codex plugin marketplace add ./agent-harness

# Or, from inside this repository
codex plugin marketplace add .
```

Restart Codex, open `/plugins`, choose the `Agent Harness` marketplace, and
install `agent-harness`. See `docs/codex-install.md` for details.

## Quick Start

### Claude Code

After install, run the wizard once to set up model routing for the Claude
models you can actually use:

```bash
/agent-harness:init
```

Then run an autonomous sprint:

```bash
/sprint build a login page with email/password and Google OAuth
```

If you skip the wizard, `/sprint` uses an all-Sonnet safe default so it works
on any subscription tier or API plan without model-access errors.

### Codex

Initialize Codex-only model routing:

```text
$agent-harness:agent-harness-init
```

The built-in Codex default keeps every role on `mode: "inherit"`, so Planner,
Evaluator, and Generator subagents inherit the current Codex session model and
reasoning settings. Codex config can also switch any role to explicit routing
with a `model` and optional `reasoning_effort`. It never reads or writes
Claude Code's `.claude/agent-harness*.json` files.

Plan first:

```text
$agent-harness:agent-harness-sprint-plan build a login page with email/password and Google OAuth
```

Then execute an approved plan:

```text
$agent-harness:agent-harness-sprint run the approved plan. Spawn parallel subagents only for disjoint tasks.
```

Codex only spawns subagents when explicitly asked. The Codex skills therefore
name which tasks may run in parallel, which must stay sequential, and which
roles should inherit versus use explicit model or reasoning overrides.

## Skills

| Skill | Usage |
|-------|-------|
| `/sprint <spec>` | Autonomous multi-agent sprint: decompose -> implement in parallel -> evaluate -> iterate, producing `.sprint/<ts>/` artifacts |
| `/harness-engineering [task\|question]` | Multi-agent harness framework: plan, execute, design-review, route, or diagnose harness failures |
| `agent-harness-init` | Codex skill: initialize Codex-only model routing under `.codex` or `~/.codex` |
| `agent-harness-sprint-plan` | Codex skill: read-first sprint planning without implementation |
| `agent-harness-sprint` | Codex skill: execute an approved sprint with explicit subagent delegation |

## Commands

| Command | Usage |
|---------|-------|
| `/agent-harness:init` | Interactive wizard that asks which Claude models you can use and writes `~/.claude/agent-harness.json` so `/sprint` knows how to route Planner / Evaluator / Generator |

## Configuration

### Claude Code

Without a config file, `/sprint` uses Sonnet at `medium` effort for every
reasoning role (and `low` for `collect`), which is a safe default across
subscription tiers and API plans. The wizard lets users with Opus access
upgrade Planner quality (Opus at `high` effort) or choose lower-cost routing.

Each role accepts a `model` (`fable` / `opus` / `sonnet` / `haiku`) and an
`effort` (`low` / `medium` / `high` / `xhigh` / `max`). Effort is injected as a
prompt-level keyword (`Think.`, `Think hard.`, `Think harder.`, `Ultrathink.`)
at the top of each subagent prompt — a workaround for neither Claude Code's
`Agent` tool nor the workflow runtime's `agent()` hook accepting `effort` at
invocation time. The schema is forward-compatible with native effort whenever
Anthropic ships it.

Notes on `fable` (Claude Fable 5): adaptive thinking makes the effort keyword
advisory; pricing is ~2× Opus 4.8; restricted topics silently fall back to
Opus 4.8. The config routes subagents only — the orchestrator (main session)
model is whatever you pick via `/model`; Fable 5's 1M context makes it a good
orchestrator for large sprints.

Schema: `skills/sprint/references/config-schema.md`.

### Codex

Codex uses its own config files and never reads Claude Code model routing:

- Project override: `./.codex/agent-harness.local.json`
- User default: `~/.codex/agent-harness.json`

Initialize them with:

```text
$agent-harness:agent-harness-init
```

Codex schema v2 supports two route shapes for each role:

- `{"mode": "inherit"}` - use the current Codex session model and reasoning
- `{"mode": "explicit", "model": "...", "reasoning_effort": "..."}` - pass explicit overrides

`reasoning_effort` is optional. If omitted, the role overrides only the model.

Schema: `codex/references/codex-config-schema.md`.

## How It Works

### Claude Code

```text
/sprint <spec>
  -> Initialize workspace (.sprint/<timestamp>/)
  -> Launch a background dynamic workflow (Claude Code >= 2.1.154):
       Planner (model from your config) writes sprint-plan.md
       Generators implement tasks in parallel (up to 16 concurrent)
       Aggregate progress files
       Evaluator (model from your config) writes sprint-eval.md
       Retry failed tasks (up to 3 iterations) inside the run
  -> Main session receives only the final verdict and reports
```

Intermediate results stay inside the workflow run — the main session's
context holds only the final report. When dynamic workflows are unavailable
(older Claude Code, or disabled), `/sprint` falls back to orchestrating the
same phases turn-by-turn with the `Agent` tool.

### Codex

```text
$agent-harness:agent-harness-init
  -> Write Codex-only config under .codex or ~/.codex
  -> Each role uses inherit or explicit model/reasoning routing

$agent-harness:agent-harness-sprint-plan <spec>
  -> Read-only repo exploration
  -> Sprint plan with acceptance criteria, ownership boundaries, and routing notes
  -> User-reviewed plan

$agent-harness:agent-harness-sprint <approved plan>
  -> Initialize .sprint/<timestamp>/ artifacts
  -> Delegate disjoint tasks to parallel subagents when explicitly requested
  -> Pass per-role model and optional reasoning overrides when configured
  -> Run shared-file or dependent tasks sequentially
  -> Evaluate acceptance criteria with concrete evidence
  -> Summarize changes, verification, risks, and any routing fallbacks
```

## Model Routing

### Claude Code

Default routing uses Sonnet at `medium` effort for every reasoning role
(and `low` for `collect`) for compatibility. The recommended `full-access`
preset upgrades Planner to Opus + `high` effort and keeps lower-cost work
on cheaper models where appropriate:

| Role | Recommended Route |
|------|-------------------|
| Planner | `opus` + `high` |
| Evaluator | `sonnet` + `medium` |
| Generator code | `sonnet` + `medium` |
| Generator write | `sonnet` + `low` |
| Generator research | `sonnet` + `high` |
| Generator collect | `haiku` + `low` |

Users with Claude Fable 5 access can pick the `frontier` preset instead,
which upgrades the Planner to `fable` + `high` (~2× the Opus planner cost)
and keeps every other role identical to `full-access`.

### Codex

Codex routing supports both inherit and explicit route shapes.

The built-in default remains all-inherit. The recommended `balanced` preset is:

| Role | Recommended Route |
|------|-------------------|
| Planner | `gpt-5.5` + `high` |
| Evaluator | `gpt-5.4` + `medium` |
| Generator code | `gpt-5.4` + `high` |
| Generator write | `gpt-5.4` + `medium` |
| Generator research | `gpt-5.4-mini` + `low` |
| Generator collect | `gpt-5.4-mini` + `low` |

If an explicit route is malformed or Codex rejects a configured model or
reasoning override at runtime, that role should warn and fall back to
inherit-mode routing for the current run.

## Requirements

### Claude Code

- Claude Code on any subscription tier or API plan
- Claude Code v2.1.154+ with dynamic workflows enabled for parallel execution
  (the legacy `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` path works as fallback)
- Playwright MCP (optional) for live UI verification in the Evaluator phase

### Codex

- Codex with plugin support
- Subagent workflows enabled
- Plugin hooks enabled if you want the optional sprint push guard

## Recommended Workflow

For non-trivial specs:

1. Enter plan mode first to clarify the spec, surface ambiguities, and agree on scope.
2. Exit plan mode and run `/sprint <spec>` or the Codex planning skill so the planner starts from sharper context.

Skip step 1 only when the spec is already concrete and low-risk.

## Version History

| Version | Scope | Status |
|---------|-------|--------|
| v0.2.0 | Claude Code only, initial release | Released |
| v0.3.x -> v0.5.x | Multi-host experiment with older Codex / Auggie adapters | Reverted |
| v0.6.0 | Claude Code-only simplification, schema v3 for Claude routing | Released |
| v2.2.1 | Dual-host package with separate Codex adapter | Released |
| v2.3.0 | Per-role reasoning effort (low/medium/high/xhigh/max) for Claude, schema v4 | Released |
| v2.5.0 | Workflow-backed sprint orchestration, `fable` (Claude Fable 5) routing, `frontier` preset | Current |

Codex support is intentionally separate from the Claude `/sprint` runtime. The
Codex adapter keeps its own config files, skills, and hooks rather than mixing
Claude and Codex engine routing into one schema.

## License

MIT
