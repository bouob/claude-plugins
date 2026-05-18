# agent-harness

[繁體中文](./README.zh-TW.md)

A dual-host agent workflow package for multi-agent orchestration.

- **Claude Code**: plugin commands for autonomous Planner→Generator→Evaluator sprints with parallel Agent Teams and iterative feedback loops.
- **Codex**: plugin skills for plan-first sprints with explicit subagent delegation and Codex lifecycle hooks.

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

The wizard takes ~30 seconds — it asks which Claude models you have access to
(Opus / Sonnet / Haiku, or some subset) and writes `~/.claude/agent-harness.json`.
You can re-run it anytime to reconfigure.

Then run an autonomous sprint:

```bash
/sprint build a login page with email/password and Google OAuth
```

> **If you skip the wizard**, `/sprint` uses an all-Sonnet safe default
> (every role on Sonnet) so it works on any subscription tier or API plan
> without model-access errors. **For best Planner quality, run
> `/agent-harness:init` and pick `All models — Opus, Sonnet, Haiku`** — Opus
> Planner produces meaningfully better task decomposition than Sonnet.

### Codex

Plan first:

```text
Use agent-harness-sprint-plan to plan this feature before implementation: build a login page with email/password and Google OAuth
```

Then execute an approved plan:

```text
Use agent-harness-sprint to run the approved plan. Spawn parallel subagents only for disjoint tasks.
```

Codex only spawns subagents when explicitly asked. The Codex skill therefore
names which tasks may run in parallel and which must stay sequential.

## Skills

| Skill | Usage |
|-------|-------|
| `/sprint <spec>` | Autonomous multi-agent sprint: decompose → implement in parallel → evaluate → iterate (fixed 6-phase pipeline, produces `.sprint/<ts>/` artifacts) |
| `/harness-engineering [task\|question]` | Multi-agent harness framework: plan, execute, design-review, route, or diagnose harness failures (Anthropic 2026-04-04 P-G-E pattern + Harness Defects diagnosis) |
| `agent-harness-sprint-plan` | Codex skill: read-first sprint planning without implementation |
| `agent-harness-sprint` | Codex skill: execute an approved sprint with explicit subagent delegation |

## Commands

| Command | Usage |
|---------|-------|
| `/agent-harness:init` | Interactive wizard that asks which Claude models you can use and writes `~/.claude/agent-harness.json` so `/sprint` knows how to route Planner / Evaluator / Generator across the models you have access to |

## Configuration

Without a config file, `/sprint` uses **Sonnet for every role** — a safe
default that works on every subscription tier and API plan. The wizard lets
you upgrade Planner to Opus (for users with Opus access) or lower cost on
specific tasks:

```bash
/agent-harness:init
```

The wizard asks which Claude models you can use (works for both Claude.ai
subscriptions and direct API access) and writes
`~/.claude/agent-harness.json`. For per-project overrides, copy that file to
`./.claude/agent-harness.local.json` in your repo — the `.local.json` suffix
matches the documented `.claude/*.local.json` gitignore pattern, so the
override stays out of git by default.

Schema: `skills/sprint/references/config-schema.md`.

## How It Works

### Claude Code

```
/sprint build a login page with email/password and Google OAuth
       │
       ├─ Phase 1: Initialize workspace (.sprint/<timestamp>/)
       ├─ Phase 2: Planner (model from your config) → sprint-plan.md
       │           └─ task list, acceptance criteria, dependency graph
       ├─ Phase 3: Generators (parallel via Agent Teams)
       │           ├─ Independent tasks → Agent Teams (simultaneous)
       │           └─ Dependent tasks → sequential subagents
       ├─ Phase 4: Aggregate progress files
       ├─ Phase 5: Evaluator (model from your config) → sprint-eval.md
       │           └─ PASS/FAIL per acceptance criterion
       └─ Phase 6: Decision Gate
                   ├─ All PASS → done, report to user
                   └─ Any FAIL → retry failed tasks (max 3 iterations)
```

### Codex

```
agent-harness-sprint-plan <spec>
       │
       ├─ Read-only repo exploration
       ├─ Sprint plan with acceptance criteria and ownership boundaries
       └─ User-reviewed plan

agent-harness-sprint <approved plan>
       │
       ├─ Initialize .sprint/<timestamp>/ artifacts
       ├─ Delegate disjoint tasks to parallel subagents when explicitly requested
       ├─ Run shared-file or dependent tasks sequentially
       ├─ Evaluate acceptance criteria with concrete evidence
       └─ Summarize changes, verification, and risks
```

## Model Routing

Default routing (no config file) uses Sonnet for every role for compatibility.
The table below is the **recommended routing** the wizard's `full-access`
preset writes — best quality on Opus access:

| Task Type | Recommended Model | Why |
|-----------|-------------------|-----|
| Planning, evaluation | Opus | Complex reasoning, architectural judgment |
| Code, writing, research | Sonnet | Quality + speed balance |
| Data collection, format conversion | Haiku | Mechanical tasks, 15× cheaper |

Run `/agent-harness:init` to apply this. Pick `Sonnet + Haiku` or `Sonnet only`
if you don't have Opus access.

## Requirements

### Claude Code

- Claude Code on any subscription tier or API plan — model routing is configurable via `/agent-harness:init` (Opus access gives best Planner quality, Sonnet works as a substitute)
- Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) for maximum parallelism
- Playwright MCP (optional) for live UI verification in the Evaluator phase

### Codex

- Codex with plugin support
- Subagent workflows enabled (current Codex releases enable them by default)
- Plugin hooks enabled if you want the optional sprint push guard

## Recommended Workflow

For non-trivial specs:

1. **Enter plan mode first** (Esc → P, or your terminal's plan-mode key) —
   clarify the spec with the model, surface ambiguities, agree on scope
2. Exit plan mode and run `/sprint <spec>` — the Planner picks up the
   sharpened context and produces a tighter `sprint-plan.md`

Skip step 1 only when the spec is already concrete (single deliverable,
clear acceptance, no architectural decisions). Most models reason more
carefully in plan mode and will surface clarifying questions before
committing to a workspace.

## Version History

| Version | Scope | Status |
|---------|-------|--------|
| v0.2.0 | Claude Code only — initial release | Released |
| v0.3.x – v0.5.x | Multi-host experiment (Codex CLI generator backend, Auggie CLI scaffolding, schema v2 with engine namespacing). Reverted in v0.6.0 — see below. | Reverted |
| v0.6.0 | Claude Code-only, simplified. Schema v3 (plain string models). v0.4.x – v0.5.x configs auto-lift; configs with non-claude engines are rejected with a re-init message. Recommended Workflow + plan-mode tip retained. | Released |
| **v0.7.0** | **Dual-host package.** Claude Code plugin remains stable; Codex adapter added through `.codex-plugin/`, Codex skills, optional Codex hooks, and local marketplace metadata. | **Current** |

### Why the v0.4–v0.5 multi-host track was reverted

The Codex / Auggie experiments hit two practical blockers that made
multi-host support more cost than benefit for the agent-harness use
case:

- **Auggie**: the main agent did not reliably honour `.augment/rules/*.md`
  constraints when calling MCP tools (e.g. still creating Jira /
  Confluence docs against deny lists). The `toolPermissions` deny
  mechanism in `~/.augment/settings.json` was too coarse for
  sprint-level isolation. Removed in v0.5.0.
- **Codex**: there is no clean install path for a Claude Code plugin
  in Codex CLI today. Skills must be hand-copied or symlinked into
  `~/.agents/skills/` or `~/.codex/skills/`, slash commands like
  `/agent-harness:init` don't exist in Codex (no namespaced commands),
  and hooks have to be re-authored for Codex's separate hook system.
  Maintaining a parallel install / config / hook story for Codex
  doubled the surface area without delivering proportional value.
  Removed in v0.6.0.

The schema-v2 / `adapters/` / `templates/` scaffolding from those
versions has been deleted. v0.6.0 kept only the durable improvements
that are valuable on Claude Code regardless of the multi-host story:
the plan-mode workflow recommendation, sprint contract artifacts, and
the harness-engineering meta-skill.

v0.7.0 reintroduces Codex support as a separate adapter, not as a mixed
engine inside the Claude `/sprint` runtime. See
`docs/claude-code-change-recommendations.md` for Claude-side change notes.

## License

MIT
