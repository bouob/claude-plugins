# agent-harness Configuration Schema

Canonical reference for the model routing config consumed by `/sprint`
Phase 0 and written by `/agent-harness:init`.

**Schema version:** v3 (current, since v0.6.0). v0.6.0 simplifies back to
plain string models after the v0.4.x – v0.5.x multi-host experiments
(Codex / Auggie support) were rolled back. v1 (≤ v0.3.x) and v2
(v0.4.x – v0.5.x) configs are auto-lifted to v3 on first read. See
"Migration" at the bottom.

---

## Lookup Order

When `/sprint` resolves model routing, it reads files in this order. The
first existing file wins for any given field; later sources only fill in
missing fields. Built-in defaults backfill any field that nobody set.

1. `./.claude/agent-harness.local.json` — project-level override
2. `~/.claude/agent-harness.json` — user-level
3. Built-in defaults (no file required)

For each Read attempt, treat ENOENT (file not found) as `{}` — never
error on missing config.

The `.local.json` suffix on the project file matches the documented
`.claude/*.local.json` gitignore pattern (per Claude Code plugin-settings
guidance), so the override stays out of git by default.

---

## Schema (v3)

```json
{
  "version": 3,
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

| Field | Type | Valid Values | Default (no config) |
|---|---|---|---|
| `version` | integer | `3` | `3` |
| `models.planner` | string | `opus` / `sonnet` / `haiku` | `sonnet` |
| `models.evaluator` | string | `opus` / `sonnet` / `haiku` | `sonnet` |
| `models.generator.code` | string | `opus` / `sonnet` / `haiku` | `sonnet` |
| `models.generator.write` | string | `opus` / `sonnet` / `haiku` | `sonnet` |
| `models.generator.research` | string | `opus` / `sonnet` / `haiku` | `sonnet` |
| `models.generator.collect` | string | `opus` / `sonnet` / `haiku` | `sonnet` |

**Defaults are conservative on purpose**: with no config file, `/sprint`
uses Claude Sonnet for every role so the harness works for any
subscription tier or API plan without surprise model-access errors.

**Recommended upgrade for Opus users**: run `/agent-harness:init` and
pick the `full-access` preset — Planner quality is meaningfully better
on Opus.

`haiku` is not recommended for `planner` or `research` — it lacks the
synthesis capacity. The wizard does not block this combination, but
`/sprint` quality will degrade if you choose it.

---

## Presets (used by `/agent-harness:init` wizard)

Wizard maps each user-facing option to a preset. Presets are not stored
in the config — they only drive the values the wizard writes.

| Preset | planner | evaluator | gen.code | gen.write | gen.research | gen.collect | Suits |
|---|---|---|---|---|---|---|---|
| `full-access` | opus | sonnet | sonnet | sonnet | sonnet | haiku | Max subscription, API keys with Opus |
| `no-opus` | sonnet | sonnet | sonnet | sonnet | sonnet | haiku | Pro / Team subscription, budget API |
| `sonnet-only` | sonnet | sonnet | sonnet | sonnet | sonnet | sonnet | Sonnet-only access |
| `custom` | wizard asks 4 follow-up questions | — |

---

## Example Configs

### `full-access` (recommended for users with Opus access)

```json
{
  "version": 3,
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
  "version": 3,
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
  "version": 3,
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

## Migration

### v1 (≤ v0.3.x) → v3

v1 already used plain string models. Phase 0 just bumps `version` to
`3` and writes back. No content changes.

### v2 (v0.4.x – v0.5.x) → v3

v2 wrapped each model in `{engine, model}` for multi-host routing.
v0.6.0 dropped multi-host. Lift rule:

```
For each role under models.*:
  if value is an object with shape {engine, model}:
    if value.engine == "claude":
      replace with value.model (string)
    else (engine in {codex, auggie}):
      ABORT and report:
        "Config role <role> uses engine={engine}, which v0.6.0 no
         longer supports. Re-run /agent-harness:init to regenerate
         the config."
  if value is already a string:
    keep as-is
```

Set `version: 3` and write back. Do NOT silently coerce non-claude
engines to claude — that would mask the user's prior intent.

### Forward compatibility

v3 readers should ignore unknown top-level keys (e.g. `host` or
`engines` left over from v2). They are stripped on the next write.

---

## How `/sprint` Uses This

Phase 0 of `/sprint` reads the resolved values into:

- `{planner_model}` — substituted into the Phase 2 Planner subagent spawn
- `{evaluator_model}` — substituted into the Phase 5 Evaluator subagent
  spawn
- `{generator_routing_table}` — a 4-row markdown table built from
  `models.generator.{code,write,research,collect}`, injected into the
  Planner prompt under "Resolved Model Routing Table"

The Planner receives the routing table at runtime and assigns each
task's `model` field accordingly when writing `sprint-plan.md`.

All Generator subagents spawn via Claude Code's `Agent` tool. v0.6.0
removed the cross-engine adapter scripts (`run-codex.sh`,
`run-auggie.sh`) along with the multi-host experiment.
