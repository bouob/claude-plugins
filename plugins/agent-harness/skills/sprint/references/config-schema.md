# agent-harness Configuration Schema

Canonical reference for the model routing config consumed by `/sprint` Phase 0
and written by `/agent-harness:init`.

---

## Lookup Order

When `/sprint` resolves model routing, it reads files in this order. The first
existing file wins for any given field; later sources only fill in missing
fields. Built-in defaults backfill any field that nobody set.

1. `./.claude/agent-harness.local.json` — project-level override
2. `~/.claude/agent-harness.json` — user-level
3. Built-in defaults (no file required)

For each Read attempt, treat ENOENT (file not found) as `{}` — never error on
missing config.

The `.local.json` suffix on the project file matches the documented
`.claude/*.local.json` gitignore pattern (per Claude Code plugin-settings
guidance), so the override stays out of git by default.

---

## Schema

```json
{
  "version": 1,
  "models": {
    "planner": "opus",
    "evaluator": "sonnet",
    "generator": {
      "code": "sonnet",
      "write": "sonnet",
      "research": "sonnet",
      "collect": "haiku"
    }
  }
}
```

### Field Reference

| Field | Type | Valid Values | Default |
|---|---|---|---|
| `version` | integer | `1` | `1` |
| `models.planner` | string | `opus` / `sonnet` / `haiku` | `opus` |
| `models.evaluator` | string | `opus` / `sonnet` / `haiku` | `sonnet` |
| `models.generator.code` | string | `opus` / `sonnet` / `haiku` | `sonnet` |
| `models.generator.write` | string | `opus` / `sonnet` / `haiku` | `sonnet` |
| `models.generator.research` | string | `opus` / `sonnet` / `haiku` | `sonnet` |
| `models.generator.collect` | string | `opus` / `sonnet` / `haiku` | `haiku` |

`haiku` is not recommended for `planner` or `research` — it lacks the synthesis
capacity. The wizard does not block this combination, but `/sprint` quality
will degrade if you choose it.

---

## Presets (used by `/agent-harness:init` wizard)

Wizard maps each user-facing option to a preset. Presets are not stored in the
config — they only drive the values the wizard writes.

| Preset | planner | evaluator | gen.code | gen.write | gen.research | gen.collect | Suits |
|---|---|---|---|---|---|---|---|
| `full-access` | opus | sonnet | sonnet | sonnet | sonnet | haiku | Max subscription, API keys with Opus |
| `no-opus` | sonnet | sonnet | sonnet | sonnet | sonnet | haiku | Pro / Team subscription, budget API |
| `sonnet-only` | sonnet | sonnet | sonnet | sonnet | sonnet | sonnet | Sonnet-only access |
| `custom` | wizard asks 4 follow-up questions | — |

---

## Example Configs

### `full-access` (default behavior — equivalent to no config file)
```json
{
  "version": 1,
  "models": {
    "planner": "opus",
    "evaluator": "sonnet",
    "generator": {
      "code": "sonnet",
      "write": "sonnet",
      "research": "sonnet",
      "collect": "haiku"
    }
  }
}
```

### `no-opus`
```json
{
  "version": 1,
  "models": {
    "planner": "sonnet",
    "evaluator": "sonnet",
    "generator": {
      "code": "sonnet",
      "write": "sonnet",
      "research": "sonnet",
      "collect": "haiku"
    }
  }
}
```

### `sonnet-only`
```json
{
  "version": 1,
  "models": {
    "planner": "sonnet",
    "evaluator": "sonnet",
    "generator": {
      "code": "sonnet",
      "write": "sonnet",
      "research": "sonnet",
      "collect": "sonnet"
    }
  }
}
```

---

## How `/sprint` Uses This

Phase 0 of `/sprint` reads the resolved values into:

- `{planner_model}` — substituted into the Phase 2 Planner subagent spawn
- `{evaluator_model}` — substituted into the Phase 5 Evaluator subagent spawn
- `{generator_routing_table}` — a 4-row markdown table built from
  `models.generator.{code,write,research,collect}`, injected into the Planner
  prompt under "Resolved Model Routing Table"

The Planner receives the routing table at runtime and assigns each task's
`model` field accordingly when writing `sprint-plan.md`.

---

## Migrating Configs

Bumping `version` is reserved for future schema changes. v1 readers should
ignore unknown top-level keys to stay forward-compatible.
