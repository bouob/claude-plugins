---
name: agent-harness-init
description: Initialize agent-harness model routing for Codex. Writes Codex-only config under .codex or ~/.codex using inherit or explicit per-role routing.
argument-hint: "[--project | --user | --show]"
---

# Agent Harness Init for Codex

Configure Codex-only model routing for agent-harness.

This skill is the Codex equivalent of Claude Code's `/agent-harness:init`.
Codex does not provide a namespaced slash command for this plugin, so users call
this skill as `agent-harness-init` or `$agent-harness:agent-harness-init`.

## References

- `../../references/codex-config-schema.md` - Codex config schema and lookup order

## Step 1 - Detect Existing Config

Read these files in order:

1. `./.codex/agent-harness.local.json`
2. `~/.codex/agent-harness.json`

If either file exists:

1. Parse the JSON.
2. If it is v1, resolve it as v2 by treating every role as
   `{"mode": "inherit"}`.
3. Show the current resolved config in a fenced code block.
4. If parsing fails, report the invalid file and recommend reconfiguration.

If the user passed `--show`, print the resolved config and stop without writing.

## Step 2 - Choose Target

If the user passed `--project`, target `./.codex/agent-harness.local.json`.

If the user passed `--user`, target `~/.codex/agent-harness.json`.

If no target flag is present, ask the user which target to write:

- Project config - `./.codex/agent-harness.local.json`
- User config - `~/.codex/agent-harness.json`

Recommend project config when the user is inside a repository and wants the
setting to apply only there. Recommend user config when they want the same
behavior across repositories.

## Step 3 - Choose Routing Strategy

Ask which preset to use:

- `all-inherit`
- `balanced`
- `custom`

### `all-inherit`

Write the built-in default:

```json
{
  "version": 2,
  "host": "codex",
  "models": {
    "planner": { "mode": "inherit" },
    "evaluator": { "mode": "inherit" },
    "generator": {
      "code": { "mode": "inherit" },
      "write": { "mode": "inherit" },
      "research": { "mode": "inherit" },
      "collect": { "mode": "inherit" }
    }
  }
}
```

### `balanced`

Write this preset:

```json
{
  "version": 2,
  "host": "codex",
  "models": {
    "planner": {
      "mode": "explicit",
      "model": "gpt-5.5",
      "reasoning_effort": "high"
    },
    "evaluator": {
      "mode": "explicit",
      "model": "gpt-5.4",
      "reasoning_effort": "medium"
    },
    "generator": {
      "code": {
        "mode": "explicit",
        "model": "gpt-5.4",
        "reasoning_effort": "high"
      },
      "write": {
        "mode": "explicit",
        "model": "gpt-5.4",
        "reasoning_effort": "medium"
      },
      "research": {
        "mode": "explicit",
        "model": "gpt-5.4-mini",
        "reasoning_effort": "low"
      },
      "collect": {
        "mode": "explicit",
        "model": "gpt-5.4-mini",
        "reasoning_effort": "low"
      }
    }
  }
}
```

### `custom`

Ask per role:

1. `planner`
2. `evaluator`
3. `generator.code`
4. `generator.write`
5. `generator.research`
6. `generator.collect`

For each role ask:

1. `inherit` or `explicit`
2. If `explicit`, ask for `model`
3. If `explicit`, ask for `reasoning_effort`

Accepted `reasoning_effort` values are:

- `low`
- `medium`
- `high`
- `xhigh`

Users may leave `reasoning_effort` empty only if they want to override the
model while keeping the current session reasoning level.

Do not translate Claude model names such as `opus`, `sonnet`, or `haiku` into
this file. Use Codex model ids such as `gpt-5.5`, `gpt-5.4`, or
`gpt-5.4-mini`.

## Step 4 - Preview and Confirm

Show:

- Selected target path
- A short explanation:
  `Roles in inherit mode use the current Codex session model and reasoning. Roles in explicit mode pass model and optional reasoning overrides.`
- A role table with columns:
  - Role
  - Mode
  - Model
  - Reasoning
- The JSON that will be written

Ask for confirmation before writing.

## Step 5 - Write Config

Create the parent directory if needed, then write the pretty-printed JSON with
2-space indentation.

After writing, tell the user:

```text
Config written. Codex sprints will use per-role inherit or explicit routing for Planner, Evaluator, and Generator subagents.
```

## Gotchas

- Do not read or write `.claude/agent-harness*.json` from this skill.
- Do not edit `~/.claude/agent-harness.json`; that file belongs to Claude Code.
- If sandbox permissions block writing `~/.codex/agent-harness.json`, request
  approval instead of choosing another location silently.
- Project config should be local-only. If the repository does not already ignore
  `.codex/*.local.json`, mention that the user may want to add an ignore rule.
- Do not hard-code a runtime allowlist of model ids. Codex model availability is
  account-specific and time-sensitive.
