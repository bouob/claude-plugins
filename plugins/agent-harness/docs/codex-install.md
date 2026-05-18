# Codex Installation

agent-harness ships a Codex adapter alongside the existing Claude Code plugin.

## Local Development

From a checkout that contains this repository:

```bash
codex plugin marketplace add ./agent-harness
```

Restart Codex, open `/plugins`, choose the `Agent Harness` marketplace, and install `agent-harness`.

If you are already inside the `agent-harness` repository itself, add the current directory:

```bash
codex plugin marketplace add .
```

## Included Codex Components

- `.codex-plugin/plugin.json` - Codex plugin manifest
- `codex/skills/agent-harness-init` - Codex-only model routing setup
- `codex/skills/agent-harness-sprint-plan` - read-first sprint planning workflow
- `codex/skills/agent-harness-sprint` - execution workflow with explicit subagent delegation
- `codex/references/codex-config-schema.md` - Codex config schema
- `codex/hooks/hooks.json` - optional lifecycle guard for running sprints

Plugin hooks are off by default in current Codex releases unless plugin hook support is enabled. If hooks are not active, the skills still work; the push guard simply will not run.

## Usage

Initialize Codex-only model routing:

```text
$agent-harness:agent-harness-init
```

The init skill writes Codex config to `.codex/agent-harness.local.json` or
`~/.codex/agent-harness.json`. It does not read or write Claude Code config.
The default routing uses `mode: "inherit"`, so Planner, Evaluator, and
Generator subagents inherit the current Codex session model.

Ask Codex directly:

```text
$agent-harness:agent-harness-sprint-plan <spec>
```

Then execute an approved plan:

```text
$agent-harness:agent-harness-sprint <approved plan>
```

Codex only starts subagents when explicitly asked. The sprint skill therefore names when to delegate and when to keep work sequential.

## Difference From Claude Code

Claude Code uses `/sprint`, `/agent-harness:init`, Agent Teams, and Claude-specific hooks. Codex uses `$agent-harness:agent-harness-init`, `$agent-harness:agent-harness-sprint-plan`, `$agent-harness:agent-harness-sprint`, plugin manifests, Codex hooks, and explicit subagent delegation.

The sprint contract is shared conceptually, but the runtime adapter is separate by design.

Codex and Claude Code config files are separate by design:

- Claude Code reads `.claude/agent-harness.local.json` and `~/.claude/agent-harness.json`.
- Codex reads `.codex/agent-harness.local.json` and `~/.codex/agent-harness.json`.
