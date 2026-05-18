# agent-harness Codex Configuration Schema

Canonical reference for the Codex model routing config consumed by
`agent-harness-sprint-plan` and `agent-harness-sprint`, and written by
`agent-harness-init`.

**Schema version:** v1.

Codex configuration is intentionally separate from Claude Code configuration:

- Codex reads `.codex/agent-harness.local.json` and `~/.codex/agent-harness.json`.
- Claude Code reads `.claude/agent-harness.local.json` and `~/.claude/agent-harness.json`.

Do not make either host read the other host's config file. Claude model names
such as `opus`, `sonnet`, and `haiku` are not Codex model names, and Codex model
names should not be written into Claude Code config.

## Lookup Order

When a Codex sprint resolves model routing, read files in this order. The first
existing file wins for any given field; later sources only fill missing fields.
Built-in defaults backfill anything nobody set.

1. `./.codex/agent-harness.local.json` - project-level override
2. `~/.codex/agent-harness.json` - user-level default
3. Built-in defaults

For each read attempt, treat missing files as `{}`. Do not fail because a
project has no local override.

## Schema v1

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

## Field Reference

| Field | Type | Valid Values | Default |
|---|---|---|---|
| `version` | integer | `1` | `1` |
| `host` | string | `codex` | `codex` |
| `models.planner.mode` | string | `inherit` | `inherit` |
| `models.evaluator.mode` | string | `inherit` | `inherit` |
| `models.generator.code.mode` | string | `inherit` | `inherit` |
| `models.generator.write.mode` | string | `inherit` | `inherit` |
| `models.generator.research.mode` | string | `inherit` | `inherit` |
| `models.generator.collect.mode` | string | `inherit` | `inherit` |

## Routing Behavior

`mode: "inherit"` means the orchestrator should not pass a model override when
spawning Codex subagents. Subagents inherit the current Codex session model and
reasoning settings.

This is the only mode produced by the v1 init skill. It avoids hard-coding
Codex model names that may vary by account, date, tier, or runtime.

Future schema versions may add an explicit model mode, but v1 readers should
treat unknown modes as unsupported and fall back to `inherit` only after
warning the user.

## Default Config

When no config file exists, use this built-in default:

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
