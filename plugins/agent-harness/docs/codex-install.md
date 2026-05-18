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
- `codex/skills/agent-harness-sprint-plan` - read-first sprint planning workflow
- `codex/skills/agent-harness-sprint` - execution workflow with explicit subagent delegation
- `codex/hooks/hooks.json` - optional lifecycle guard for running sprints

Plugin hooks are off by default in current Codex releases unless plugin hook support is enabled. If hooks are not active, the skills still work; the push guard simply will not run.

## Usage

Ask Codex directly:

```text
Use agent-harness-sprint-plan to plan this feature before implementation: <spec>
```

Then execute an approved plan:

```text
Use agent-harness-sprint to run the approved plan. Spawn parallel subagents only for disjoint tasks.
```

Codex only starts subagents when explicitly asked. The sprint skill therefore names when to delegate and when to keep work sequential.

## Difference From Claude Code

Claude Code uses `/sprint`, `/agent-harness:init`, Agent Teams, and Claude-specific hooks. Codex uses skills, plugin manifests, Codex hooks, and explicit subagent delegation.

The sprint contract is shared conceptually, but the runtime adapter is separate by design.
