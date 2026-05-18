---
name: agent-harness-init
description: Initialize agent-harness model routing for Codex. Writes Codex-only config under .codex or ~/.codex using inherit-mode routing so subagents use the current Codex session model.
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

If either file exists, parse the JSON and show the current config in a fenced
code block. If parsing fails, report the invalid file and recommend
reconfiguration.

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

## Step 3 - Build Config

Use this v1 config exactly:

```json
{
  "version": 1,
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

`mode: "inherit"` means Codex subagents inherit the current session model. Do
not translate Claude model names such as `opus`, `sonnet`, or `haiku` into this
file.

## Step 4 - Preview and Confirm

Show:

- Selected target path
- A short explanation: "All roles inherit the current Codex session model."
- The JSON that will be written

Ask for confirmation before writing.

## Step 5 - Write Config

Create the parent directory if needed, then write the pretty-printed JSON with
2-space indentation.

After writing, tell the user:

```text
Config written. Codex sprints will inherit the current Codex session model for Planner, Evaluator, and Generator subagents.
```

## Gotchas

- Do not read or write `.claude/agent-harness*.json` from this skill.
- Do not edit `~/.claude/agent-harness.json`; that file belongs to Claude Code.
- If sandbox permissions block writing `~/.codex/agent-harness.json`, request
  approval instead of choosing another location silently.
- Project config should be local-only. If the repository does not already ignore
  `.codex/*.local.json`, mention that the user may want to add an ignore rule.
