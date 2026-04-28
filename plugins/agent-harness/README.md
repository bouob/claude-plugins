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

> **If you skip the wizard**, `/sprint` uses an all-Sonnet safe default
> (every role on Sonnet) so it works on any subscription tier or API plan
> without model-access errors. **For best Planner quality, run
> `/agent-harness:init` and pick `All models — Opus, Sonnet, Haiku`** — Opus
> Planner produces meaningfully better task decomposition than Sonnet.

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

- Claude Code on any subscription tier or API plan — model routing is configurable via `/agent-harness:init` (Opus access gives best Planner quality, Sonnet works as a substitute)
- Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) for maximum parallelism
- Playwright MCP (optional) for live UI verification in the Evaluator phase

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

## Multi-Host Roadmap

agent-harness is a Claude Code plugin first and foremost. v0.3.0+ lays the
groundwork for using **Codex CLI (OpenAI)** and **Auggie CLI (AugmentCode)**
either as alternative generator backends inside Claude Code's `/sprint`, or
as standalone hosts that drive a degraded sprint pipeline themselves.

| Version | Scope | Status |
|---------|-------|--------|
| **v0.2.0** | Claude Code only — Planner / Generator / Evaluator all on Claude models | Released |
| v0.3.0 | Vendor-neutral schemas + adapter / template stubs | Released |
| v0.3.1 | Host & backend detection (`detect-host.sh`/`.ps1`, `--detect-only`) | Released |
| **v0.4.0** | **Host-aware wizard** (Schema v2 with `engine` namespacing + v1 auto-lift, `model-registry.md`, host-aware presets for Claude Code / Codex / Auggie / multi-host, parent-process host inference, `--host=` flag, plan-mode tip in `/sprint`, Engine column in preview) | **You are here** |
| v0.4.1 | Codex backend for Generator tasks (Bash shell-out via `adapters/run-codex.sh`) | Planned |
| v0.5.0 | Auggie backend for Generator tasks (`adapters/run-auggie.sh` + JSON envelope normalize) | Planned |
| v0.5.1 | Cross-tool deployment: render `AGENTS.md`, symlink `.codex/skills/`, write `.augment/rules/agent-harness.md` | Planned |
| v0.6.0 | Codex CLI / Auggie CLI as primary host (sequential degradation, AGENTS.md-driven) | Planned |

Read `skills/sprint/references/cross-host-deployment.md` for the full
degradation matrix (which features work / are degraded / are unsupported in
each host).

Read `skills/sprint/references/engine-flag-matrix.md` for the CLI flag
mapping each backend uses to satisfy the sprint contract.

Read `skills/sprint/references/model-registry.md` for the validated list
of model IDs each engine accepts (verified per release).

### Trying v0.4.0 from Codex / Auggie

v0.4.0 enables `/agent-harness:init` to run from any host with the
correct config path written:

```bash
# From Codex CLI
codex exec --ask-for-approval=never \
  "Run /agent-harness:init --host=codex"

# From Auggie CLI
auggie --print --quiet \
  "Run /agent-harness:init --host=auggie"
```

Note: `/sprint` itself runs end-to-end **only on Claude Code** in
v0.4.0. Codex and Auggie hosts can configure routing but Phase 2/3/5
will surface BLOCKED for non-claude tasks until v0.4.1 (codex generator
backend) and v0.5.0 (auggie generator backend) ship.

The vendor-neutral path token `${AGENT_HARNESS_ROOT}` is introduced in
v0.3.0 as a synonym for `${CLAUDE_PLUGIN_ROOT}`. Under Claude Code v0.4.x
they are equivalent; when other host runtimes adopt agent-harness in
v0.6.0 they will substitute the new token to their own install directory.

## License

MIT
