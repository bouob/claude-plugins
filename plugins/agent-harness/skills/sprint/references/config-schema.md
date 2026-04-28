# agent-harness Configuration Schema

Canonical reference for the model routing config consumed by `/sprint` Phase 0
and written by `/agent-harness:init`.

**Schema version:** v2 (current, since v0.4.0). v1 (pre-v0.4.0) is auto-lifted
to v2 on first read. See "Migration" at the bottom.

---

## Lookup Order

When `/sprint` resolves model routing, it reads files in this order. The first
existing file wins for any given field; later sources only fill in missing
fields. Built-in defaults backfill any field that nobody set.

**Path depends on the host the wizard ran in** (see `cross-host-deployment.md`):

| Host         | User-level path                       | Project override                       |
|--------------|---------------------------------------|----------------------------------------|
| claude-code  | `~/.claude/agent-harness.json`         | `./.claude/agent-harness.local.json`   |
| codex        | `~/.codex/agent-harness.json`          | `./.codex/agent-harness.local.json`    |
| multi-host   | All applicable user-level paths above (same content); first existing path is canonical | first existing project path |

For each Read attempt, treat ENOENT (file not found) as `{}` — never error on
missing config.

The `.local.json` suffix on the project file matches the documented
`.claude/*.local.json` gitignore pattern (per Claude Code plugin-settings
guidance), so the override stays out of git by default.

---

## Schema (v2)

```json
{
  "version": 2,
  "host": "claude-code",
  "engines": {
    "claude": { "available": true },
    "codex":  { "available": false, "auth_env": "CODEX_API_KEY",
                "default_model": "gpt-5.5" }
  },
  "models": {
    "planner":   { "engine": "claude", "model": "opus" },
    "evaluator": { "engine": "claude", "model": "sonnet" },
    "generator": {
      "code":     { "engine": "claude", "model": "sonnet" },
      "write":    { "engine": "claude", "model": "sonnet" },
      "research": { "engine": "claude", "model": "sonnet" },
      "collect":  { "engine": "claude", "model": "haiku" }
    }
  },
  "cross_tool_deployed": {
    "agents_md": false,
    "codex_skills_symlink": false,
    "codex_config_patch_printed": false
  }
}
```

### Field Reference (v2)

| Field | Type | Valid Values | Default (no config) |
|---|---|---|---|
| `version` | integer | `2` | `2` |
| `host` | string | `claude-code` / `codex` / `multi-host` | `claude-code` |
| `engines.<name>.available` | boolean | true / false | claude=true, codex=false |
| `engines.<name>.auth_env` | string | env var name to probe | per-engine default |
| `engines.<name>.default_model` | string | model ID from `model-registry.md` | per-engine default |
| `models.<role>.engine` | string | `claude` / `codex` | `claude` |
| `models.<role>.model` | string | per-engine model ID, see `model-registry.md` | per-engine default |
| `cross_tool_deployed.<key>` | boolean / string | tracking last init's deployments | all false |

Phase 0 of `/sprint` validates each `models.<role>.engine` is in
`{claude, codex}` and each `models.<role>.model` is in the registry
for that engine. Unknown engine → ABORT. Unknown model → ABORT,
suggest re-running init.

> **v0.5.0 dropped Auggie support.** Configs from v0.4.x containing
> `engine: "auggie"` are rejected at Phase 0; users must re-run
> `/agent-harness:init` to regenerate the config.

**Defaults are conservative on purpose**: with no config file, `/sprint`
uses Claude Sonnet for every role so the harness works for any subscription
tier or API plan without surprise model-access errors.

---

## Presets (used by `/agent-harness:init` wizard)

Presets are host-aware in v0.4.0+. Wizard reads detected `host` from Step 0
and shows only presets that make sense in that environment.

### Host = `claude-code`

| Preset | planner | evaluator | gen.code | gen.write | gen.research | gen.collect | Suits |
|---|---|---|---|---|---|---|---|
| `full-access`   | claude/opus   | claude/sonnet | claude/sonnet | claude/sonnet | claude/sonnet | claude/haiku | Opus access |
| `no-opus`       | claude/sonnet | claude/sonnet | claude/sonnet | claude/sonnet | claude/sonnet | claude/haiku | Pro / Team / budget API |
| `sonnet-only`   | claude/sonnet | claude/sonnet | claude/sonnet | claude/sonnet | claude/sonnet | claude/sonnet | Sonnet-only access |
| `mixed-collect` | claude/opus   | claude/sonnet | claude/sonnet | claude/sonnet | claude/sonnet | **codex/gpt-5.4** | Codex API key for cheap collect tasks |
| `custom`        | wizard asks per-role | — |

### Host = `codex`

| Preset | planner | evaluator | gen.code | gen.write | gen.research | gen.collect | Suits |
|---|---|---|---|---|---|---|---|
| `codex-default` | codex/gpt-5.5 | codex/gpt-5.5 | codex/gpt-5.5 | codex/gpt-5.5 | codex/gpt-5.5 | codex/gpt-5.4-mini | Codex CLI users with gpt-5.5 access |
| `codex-budget`  | codex/gpt-5.4 | codex/gpt-5.4 | codex/gpt-5.4-mini | codex/gpt-5.4-mini | codex/gpt-5.4-mini | codex/gpt-5.3-codex-spark | Cost-sensitive |
| `custom`        | wizard asks per-role | — |

### Host = `multi-host`

Wizard forces `custom` — cross-host configs always need explicit per-role
decisions. There is no "one-size-fits-all" preset that works for both
Claude Code spawning and standalone Codex execution.

---

## Example Configs

### `full-access` on `claude-code`
```json
{
  "version": 2,
  "host": "claude-code",
  "engines": { "claude": { "available": true } },
  "models": {
    "planner":   { "engine": "claude", "model": "opus" },
    "evaluator": { "engine": "claude", "model": "sonnet" },
    "generator": {
      "code":     { "engine": "claude", "model": "sonnet" },
      "write":    { "engine": "claude", "model": "sonnet" },
      "research": { "engine": "claude", "model": "sonnet" },
      "collect":  { "engine": "claude", "model": "haiku" }
    }
  }
}
```

### `mixed-collect` on `claude-code` (Codex for cheap collect tasks)
```json
{
  "version": 2,
  "host": "claude-code",
  "engines": {
    "claude": { "available": true },
    "codex":  { "available": true, "auth_env": "CODEX_API_KEY", "default_model": "gpt-5.4" }
  },
  "models": {
    "planner":   { "engine": "claude", "model": "opus" },
    "evaluator": { "engine": "claude", "model": "sonnet" },
    "generator": {
      "code":     { "engine": "claude", "model": "sonnet" },
      "write":    { "engine": "claude", "model": "sonnet" },
      "research": { "engine": "claude", "model": "sonnet" },
      "collect":  { "engine": "codex",  "model": "gpt-5.4" }
    }
  }
}
```

### `codex-default` on `codex`
```json
{
  "version": 2,
  "host": "codex",
  "engines": {
    "codex": { "available": true, "auth_env": "CODEX_API_KEY", "default_model": "gpt-5.5" }
  },
  "models": {
    "planner":   { "engine": "codex", "model": "gpt-5.5" },
    "evaluator": { "engine": "codex", "model": "gpt-5.5" },
    "generator": {
      "code":     { "engine": "codex", "model": "gpt-5.5" },
      "write":    { "engine": "codex", "model": "gpt-5.5" },
      "research": { "engine": "codex", "model": "gpt-5.5" },
      "collect":  { "engine": "codex", "model": "gpt-5.4-mini" }
    }
  }
}
```

---

## Migration: v1 → v2 Auto-Lift

v1 schema lacked the `engine` field — `models.planner = "opus"` is just a
string. Phase 0 lifts to v2 by inferring the engine from the host context:

```
Read config:
  if no config file at all:
    use built-in defaults (host=claude-code, all engines=claude)
  elif config.version == 2:
    validate against current registry, use as-is
  elif config.version == 1 OR no version field:
    if config has top-level "host" field:
      lift_engine = config.host
    else:
      lift_engine = run detect-host.sh and read running_host
      if running_host == "unknown":
        ABORT — print "v1 config without host field cannot be auto-lifted
        in an ambiguous environment. Re-run /agent-harness:init to
        regenerate with explicit host."

    For each role in config.models:
      if value is a string:
        new_value = { engine: lift_engine, model: value }
      else:
        new_value = value (already shaped as v2)

    Write the lifted v2 back to the config path. Do NOT delete the v1
    file — Phase 0 just reads the new structure on the next run.
```

Lift is destructive (overwrites the file with v2 shape). Backup is the
user's responsibility — but the lift only adds structure; the model
strings are preserved verbatim.

---

## How `/sprint` Uses This

Phase 0 of `/sprint`:

1. Resolves config from project → user → defaults
2. Auto-lifts v1 to v2 if needed
3. Validates each `models.<role>.{engine, model}` against
   `model-registry.md`
4. Holds resolved values:
   - `{planner_engine}` + `{planner_model}` → Phase 2 spawn
   - `{evaluator_engine}` + `{evaluator_model}` → Phase 5 spawn
   - `{generator_routing_table}` — 4-row markdown table built from
     `models.generator.{code,write,research,collect}` with columns
     `type | engine | model | when to use`, injected into the Planner
     prompt under "Resolved Model Routing Table"

The Planner receives the routing table at runtime and assigns each
task's `engine` + `model` fields accordingly when writing
`sprint-plan.md`.

For engine=codex, Phase 3 dispatches via `run-codex.sh` instead of the
`Agent` tool. The adapter contract is documented in `engine-flag-matrix.md`.
