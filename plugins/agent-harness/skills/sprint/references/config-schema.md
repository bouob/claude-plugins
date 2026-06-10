# agent-harness Configuration Schema

Canonical reference for the model routing config consumed by `/sprint`
Phase 0 and written by `/agent-harness:init`.

**Schema version:** v4 (current, since v0.7.0). v0.7.0 adds per-role
`effort` (reasoning level). v1 (≤ v0.3.x), v2 (v0.4.x – v0.5.x), and v3
(v0.6.x) configs auto-lift to v4 on first read. See "Migration" at the
bottom.

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

## Schema (v4)

```json
{
  "version": 4,
  "models": {
    "planner":   { "model": "opus",   "effort": "high" },
    "evaluator": { "model": "sonnet", "effort": "medium" },
    "generator": {
      "code":     { "model": "sonnet", "effort": "medium" },
      "write":    { "model": "sonnet", "effort": "low" },
      "research": { "model": "sonnet", "effort": "high" },
      "collect":  { "model": "haiku",  "effort": "low" }
    }
  }
}
```

Each role is `{ model, effort }`. `model` is required; `effort` defaults
to `medium` when omitted.

### Field Reference

| Field | Type | Valid Values | Default (no config) |
|---|---|---|---|
| `version` | integer | `4` | `4` |
| `models.planner.model` | string | `fable` / `opus` / `sonnet` / `haiku` | `sonnet` |
| `models.planner.effort` | string | `low` / `medium` / `high` / `xhigh` / `max` | `medium` |
| `models.evaluator.model` | string | `fable` / `opus` / `sonnet` / `haiku` | `sonnet` |
| `models.evaluator.effort` | string | same as above | `medium` |
| `models.generator.<type>.model` | string | `fable` / `opus` / `sonnet` / `haiku` | `sonnet` |
| `models.generator.<type>.effort` | string | same as above | `medium` (`low` for `collect`) |

**`fable` added in v2.5.0** as a pure value-set extension — the schema
stays v4, no migration needed. Older plugin versions reading a `fable`
config pass the string through to the Agent / Workflow model argument
unchanged, which is harmless. `fable` maps to Claude Fable 5
(`claude-fable-5`): 1M context, adaptive thinking, ~2× Opus 4.8 pricing
($10/$50 per Mtok). It requires Fable access on the account — without
it, the subagent spawn fails the same way an inaccessible `opus` does.

`<type>` is `code`, `write`, `research`, or `collect`.

**Defaults are conservative on purpose**: with no config file, `/sprint`
uses Claude Sonnet at `medium` effort for every reasoning role so the
harness works for any subscription tier or API plan without surprise
model-access errors. `collect` defaults to `low` because it's
mechanical work.

**Recommended upgrade for Opus users**: run `/agent-harness:init` and
pick the `full-access` preset — Planner quality on Opus + `high` effort
is meaningfully better than Sonnet default.

`haiku` is not recommended for `planner` or `research` — it lacks the
synthesis capacity. The wizard does not block this combination, but
`/sprint` quality will degrade if you choose it.

**Scope note — this config routes subagents only.** The orchestrator
(the main session running `/sprint`) keeps whatever model the user
selected via `/model`; nothing in this file changes it. Pairing a
Fable 5 main session (1M context) with cheaper routed subagents is the
intended cost shape — the orchestrator holds the whole sprint state
while Sonnet/Haiku do the volume work.

### Effort Levels — What They Map To

| Level | Prompt keyword injected | When to use |
|---|---|---|
| `low` | _(none)_ | Mechanical work: data fetch, format conversion, file enumeration |
| `medium` | `Think.` | Default reasoning depth; most code / write / eval tasks |
| `high` | `Think hard.` | Plan decomposition, multi-source synthesis, judgment calls |
| `xhigh` | `Think harder.` | High-stakes design decisions, security-sensitive logic |
| `max` | `Ultrathink.` | Reserve for the hardest problems — costs the most compute |

These are the Anthropic-recognized escalation keywords for Claude Code's
extended-thinking budget. `/sprint` injects them at the top of every
subagent prompt based on the resolved `effort` value.

**Fable 5 caveat**: Fable 5 uses adaptive thinking — it budgets its own
reasoning depth per request, so the escalation keywords have limited
effect on `fable`-routed roles. `/sprint` still injects the keyword for
consistency, but expect the model to self-budget; the `effort` field on
a `fable` role is best treated as advisory.

### Implementation Note — Why Prompt-Level Injection

Claude Code's `Agent` tool currently accepts `model` at invocation time
but **not** `effort` — the frontmatter `effort` field on subagents is
only honored for statically-defined agents (`.claude/agents/*.md`), not
for dynamic `Agent(...)` spawns used by `/sprint`. The same holds for
the dynamic-workflow backend: the workflow runtime's `agent()` hook
accepts `model` (`sonnet` / `opus` / `haiku` / `fable`) but no effort
parameter either.

v0.7.0 bridges this gap by injecting the escalation keyword at the top
of each subagent's prompt — on both backends. When/if Anthropic extends
either surface to accept `effort` directly, `/sprint` will switch to
native effort transparently — the config schema stays the same.

---

## Presets (used by `/agent-harness:init` wizard)

Wizard maps each user-facing option to a preset. Presets are not stored
in the config — they only drive the values the wizard writes.

| Preset | planner | evaluator | gen.code | gen.write | gen.research | gen.collect | Suits |
|---|---|---|---|---|---|---|---|
| `frontier` | fable/high | sonnet/medium | sonnet/medium | sonnet/low | sonnet/high | haiku/low | Max subscription or API with Fable 5 access |
| `full-access` | opus/high | sonnet/medium | sonnet/medium | sonnet/low | sonnet/high | haiku/low | Max subscription, API keys with Opus |
| `no-opus` | sonnet/high | sonnet/medium | sonnet/medium | sonnet/low | sonnet/high | haiku/low | Pro / Team subscription, budget API |
| `sonnet-only` | sonnet/high | sonnet/medium | sonnet/medium | sonnet/low | sonnet/high | sonnet/low | Sonnet-only access |
| `custom` | wizard asks 4 follow-up questions for model + 1 for effort tier | — |

Effort tier `balanced` (preset default) gives `high` to planner/research,
`medium` to evaluator/code, `low` to write/collect. The `custom` preset
lets the user pick a single effort tier (`fast` / `balanced` / `deep`)
that scales every role up or down.

| Effort tier | planner | evaluator | gen.code | gen.write | gen.research | gen.collect |
|---|---|---|---|---|---|---|
| `fast` | medium | low | low | low | medium | low |
| `balanced` (default) | high | medium | medium | low | high | low |
| `deep` | xhigh | high | high | medium | xhigh | low |

---

## Example Configs

### `frontier` (for users with Fable 5 access)

```json
{
  "version": 4,
  "models": {
    "planner":   { "model": "fable",  "effort": "high" },
    "evaluator": { "model": "sonnet", "effort": "medium" },
    "generator": {
      "code":     { "model": "sonnet", "effort": "medium" },
      "write":    { "model": "sonnet", "effort": "low" },
      "research": { "model": "sonnet", "effort": "high" },
      "collect":  { "model": "haiku",  "effort": "low" }
    }
  }
}
```

Planner on Fable 5 costs ~2× the `full-access` planner (Opus). Reserve
it for sprints where decomposition quality dominates — large multi-domain
specs, heavy dependency reasoning. Note Fable 5 silently falls back to
Opus 4.8 on restricted topics (cybersecurity, bio/chem), which changes
cost and behavior without an error.

### `full-access` (recommended for users with Opus access)

```json
{
  "version": 4,
  "models": {
    "planner":   { "model": "opus",   "effort": "high" },
    "evaluator": { "model": "sonnet", "effort": "medium" },
    "generator": {
      "code":     { "model": "sonnet", "effort": "medium" },
      "write":    { "model": "sonnet", "effort": "low" },
      "research": { "model": "sonnet", "effort": "high" },
      "collect":  { "model": "haiku",  "effort": "low" }
    }
  }
}
```

### `no-opus`

```json
{
  "version": 4,
  "models": {
    "planner":   { "model": "sonnet", "effort": "high" },
    "evaluator": { "model": "sonnet", "effort": "medium" },
    "generator": {
      "code":     { "model": "sonnet", "effort": "medium" },
      "write":    { "model": "sonnet", "effort": "low" },
      "research": { "model": "sonnet", "effort": "high" },
      "collect":  { "model": "haiku",  "effort": "low" }
    }
  }
}
```

### `sonnet-only`

```json
{
  "version": 4,
  "models": {
    "planner":   { "model": "sonnet", "effort": "high" },
    "evaluator": { "model": "sonnet", "effort": "medium" },
    "generator": {
      "code":     { "model": "sonnet", "effort": "medium" },
      "write":    { "model": "sonnet", "effort": "low" },
      "research": { "model": "sonnet", "effort": "high" },
      "collect":  { "model": "sonnet", "effort": "low" }
    }
  }
}
```

---

## Migration

### v1 (≤ v0.3.x) → v4

v1 used plain string models without effort.

```
For each role under models.*:
  if value is a string:
    replace with { model: <value>, effort: <default-for-role> }
```

Defaults during lift:
- `planner` / `generator.research` → `high`
- `evaluator` / `generator.code` → `medium`
- `generator.write` / `generator.collect` → `low`

Set `version: 4` and write back.

### v2 (v0.4.x – v0.5.x) → v4

v2 wrapped each model in `{engine, model}` for multi-host routing.
v0.6.0 dropped multi-host. Lift rule:

```
For each role under models.*:
  if value is an object with shape {engine, model}:
    if value.engine == "claude":
      replace with { model: value.model, effort: <default-for-role> }
    else (engine in {codex, auggie}):
      ABORT and report:
        "Config role <role> uses engine={engine}, which v0.7.0 no
         longer supports. Re-run /agent-harness:init to regenerate
         the config."
  if value is a plain string:
    replace with { model: <value>, effort: <default-for-role> }
```

Set `version: 4` and write back. Do NOT silently coerce non-claude
engines to claude — that would mask the user's prior intent.

### v3 (v0.6.x) → v4

v3 used plain string models. Lift each value into `{model, effort}` with
the role-defaulted effort listed above.

```
For each role under models.*:
  if value is a string:
    replace with { model: <value>, effort: <default-for-role> }
  if value is already an object with {model, effort}:
    keep as-is (already v4-shaped)
```

Set `version: 4` and write back.

### Forward compatibility

v4 readers should ignore unknown top-level keys (e.g. `host` or
`engines` left over from v2). They are stripped on the next write.
v4 readers also tolerate `effort` being absent on a role object —
treat it as the role's default.

---

## How `/sprint` Uses This

Phase 0 of `/sprint` reads the resolved values into:

- `{planner_model}`, `{planner_effort}` — substituted into the Phase 2
  Planner subagent spawn (model arg) and prompt header (effort keyword)
- `{evaluator_model}`, `{evaluator_effort}` — same for Phase 5
- `{generator_routing_table}` — a 4-row markdown table built from
  `models.generator.{code,write,research,collect}` with columns
  `type | model | effort | when to use`, injected into the Planner
  prompt under "Resolved Model Routing Table"

The Planner receives the routing table at runtime and assigns each
task's `model` and `effort` fields accordingly when writing
`sprint-plan.md`.

All Generator subagents spawn via Claude Code's `Agent` tool with the
resolved `model`. Effort is injected as a prompt-level keyword at the
top of each subagent's prompt (see "Implementation Note" above).
