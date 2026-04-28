# agent-harness

[繁體中文](./README.zh-TW.md)

A [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/plugins) for multi-agent orchestration — autonomous Planner→Generator→Evaluator sprints with parallel Agent Teams and iterative feedback loops.

## Install

```bash
# Add marketplace (one-time)
/plugin marketplace add bouob/claude-plugins

# Install
/plugin install agent-harness@bouob-plugins

# Or load directly during development
claude --plugin-dir ./agent-harness
```

## Quick Start

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

> **If you skip the wizard**, `/sprint` falls back to Opus-tier defaults
> (Planner=Opus, Evaluator=Sonnet, Generator=Sonnet, collect=Haiku). On a
> Pro/Team subscription or a Sonnet-only API key, the Phase 2 Planner spawn
> will fail because the harness tries to use Opus. **Run `/agent-harness:init`
> first** if you don't have Opus.

## Skills

| Skill | Usage |
|-------|-------|
| `/sprint <spec>` | Autonomous multi-agent sprint: decompose → implement in parallel → evaluate → iterate (fixed 6-phase pipeline, produces `.sprint/<ts>/` artifacts) |
| `/harness-engineering [task\|question]` | Multi-agent harness framework: plan, execute, design-review, route, or diagnose harness failures (Anthropic 2026-04-04 P-G-E pattern + Harness Defects diagnosis) |

## Commands

| Command | Usage |
|---------|-------|
| `/agent-harness:init` | Interactive wizard that asks which Claude models you can use and writes `~/.claude/agent-harness.json` so `/sprint` knows how to route Planner / Evaluator / Generator across the models you have access to |

## Configuration

By default, `/sprint` uses Opus for the Planner and Sonnet for everything else
(Haiku for `collect` tasks). Run the wizard to change routing — for example
if you don't have Opus access (Pro/Team subscription, or an API key without
Opus), or want to lower cost on a specific project:

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

```
/sprint build a login page with email/password and Google OAuth
       │
       ├─ Phase 1: Initialize workspace (.sprint/<timestamp>/)
       ├─ Phase 2: Planner (Opus) → sprint-plan.md
       │           └─ task list, acceptance criteria, dependency graph
       ├─ Phase 3: Generators (parallel via Agent Teams)
       │           ├─ Independent tasks → Agent Teams (simultaneous)
       │           └─ Dependent tasks → sequential subagents
       ├─ Phase 4: Aggregate progress files
       ├─ Phase 5: Evaluator (Sonnet) → sprint-eval.md
       │           └─ PASS/FAIL per acceptance criterion
       └─ Phase 6: Decision Gate
                   ├─ All PASS → done, report to user
                   └─ Any FAIL → retry failed tasks (max 3 iterations)
```

## Model Routing

| Task Type | Model | Why |
|-----------|-------|-----|
| Planning, evaluation | Opus | Complex reasoning, architectural judgment |
| Code, writing, research | Sonnet | Quality + speed balance |
| Data collection, format conversion | Haiku | Mechanical tasks, 15× cheaper |

## Requirements

- Claude Code on any subscription tier or API plan — model routing is configurable via `/agent-harness:init` (Opus access gives best Planner quality, Sonnet works as a substitute)
- Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) for maximum parallelism
- Playwright MCP (optional) for live UI verification in the Evaluator phase

## License

MIT
