# agent-harness Codex Configuration Schema

Canonical reference for the Codex model routing config consumed by
`agent-harness-sprint-plan` and `agent-harness-sprint`, and written by
`agent-harness-init`.

**Schema version:** v2.

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

## Schema v2

Each role accepts one of two route shapes:

- `{"mode": "inherit"}` - do not override model or reasoning
- `{"mode": "explicit", "model": "...", "reasoning_effort": "..."}` - pass
  explicit overrides to Codex when spawning that role

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

## Field Reference

| Field | Type | Valid Values | Default |
|---|---|---|---|
| `version` | integer | `2` | `2` |
| `host` | string | `codex` | `codex` |
| `models.<role>.mode` | string | `inherit` / `explicit` | `inherit` |
| `models.<role>.model` | string | Any Codex model id | unset |
| `models.<role>.reasoning_effort` | string | `low` / `medium` / `high` / `xhigh` | unset |

Roles are:

- `planner`
- `evaluator`
- `generator.code`
- `generator.write`
- `generator.research`
- `generator.collect`

## Routing Behavior

### `mode: "inherit"`

The orchestrator should not pass a `model` or `reasoning_effort` override when
spawning that Codex subagent. The subagent inherits the current Codex session
model and reasoning settings.

### `mode: "explicit"`

The orchestrator should pass the configured `model` when spawning that role.
If `reasoning_effort` is present, pass it too.

`reasoning_effort` is optional so users can override model only while keeping
the session's current reasoning level.

The schema intentionally does not hard-code an allowlist of Codex model ids.
Model availability changes by account, date, tier, and runtime. Document
recommended models, but let runtime determine whether a specific model is
accepted.

## Built-in Defaults

When no config file exists, use this built-in default:

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

## Recommended Presets

These presets are guidance for `agent-harness-init`. They are not stored as
named presets in the file.

### `all-inherit`

Use the built-in default above. Best when the user prefers changing models by
switching the current Codex session.

### `balanced`

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

## Migration

### v1 -> v2

v1 used only `{"mode": "inherit"}` route objects. Treat every v1 role as the
same route in v2. Do not require automatic rewrite; a re-run of
`agent-harness-init` may write the v2 file when the user confirms.

### Forward compatibility

If a reader encounters:

- unknown `version`
- unknown `host`
- unknown `mode`
- `mode: "explicit"` without `model`
- malformed `reasoning_effort`

warn the user and fall back that role to `{"mode": "inherit"}` for the current
run.

If Codex rejects the configured `model` or `reasoning_effort` at runtime, warn
the user and fall back that role to inherit-mode routing instead of aborting
the whole sprint.
