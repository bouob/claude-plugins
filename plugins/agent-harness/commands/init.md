---
description: Initialize agent-harness model routing for your Claude tier (subscription or API)
allowed-tools: Read, Write, AskUserQuestion, Bash
argument-hint: ""
---

# /agent-harness:init — Configure Model Routing

Walk the user through writing `~/.claude/agent-harness.json` so `/sprint`
knows which Claude models **and reasoning effort** to assign to each role
(Planner, Evaluator, Generator). Defaults assume Opus access; this wizard
lets users on Pro/Team subscriptions, Sonnet-only API keys, or any other
access shape route around the assumption.

> **v2.3.0 added per-role effort (reasoning level).** Each role is now
> `{model, effort}` instead of a bare model string. v1 / v2 / v3 configs
> auto-lift to v4 on first read.

Schema reference: `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/config-schema.md`.

---

## Step 1 — Detect Existing Config

Try Read on `~/.claude/agent-harness.json`. If the file exists:

1. Parse the JSON. If `version` is missing or `1` / `2` / `3`, run the
   auto-lift described in `references/config-schema.md` § Migration.
   v2 configs whose any `models.<role>.engine != "claude"` ABORT here
   with:
   > "v2 config has engine=<engine> for role <role>. v0.6.0 dropped
   > multi-host support. Reconfigure?"
   and offer Reconfigure / Cancel.
2. Show the user the current `models` block in a fenced code block.
3. Use `AskUserQuestion`: "Existing config found. Reconfigure or keep?"
   - `Reconfigure` → continue to Step 2
   - `Show current and exit` → print the parsed config, stop
   - `Cancel` → stop without printing

If the file does not exist, proceed straight to Step 2.

## Step 2 — Ask Which Models the User Has Access To

Use `AskUserQuestion` to ask: "Which Claude models can you use? (works
for both Claude.ai subscriptions and direct API access)"

**Use the `preview` field on each option** to show a markdown table of
the resulting routing — this lets the user compare presets visually
without reading JSON.

Options (display text → internal preset → preview content):

### Option 1 — `Fable 5 + all models` → `frontier`
preview:
```
| Role                | Model  | Effort |
|---------------------|--------|--------|
| Planner             | Fable  | high   |
| Evaluator           | Opus   | high   |
| Generator (code)    | Sonnet | high   |
| Generator (write)   | Sonnet | high   |
| Generator (research)| Sonnet | high   |
| Generator (collect) | Haiku  | —      |

Note: Fable 5 planner costs ~2x the Opus planner. Haiku takes no effort.
```

### Option 2 — `All models — Opus, Sonnet, Haiku` → `full-access`
preview:
```
| Role                | Model  | Effort |
|---------------------|--------|--------|
| Planner             | Opus   | xhigh  |
| Evaluator           | Opus   | high   |
| Generator (code)    | Sonnet | high   |
| Generator (write)   | Sonnet | high   |
| Generator (research)| Sonnet | high   |
| Generator (collect) | Haiku  | —      |
```

### Option 3 — `Sonnet + Haiku (no Opus access)` → `no-opus`
preview:
```
| Role                | Model  | Effort |
|---------------------|--------|--------|
| Planner             | Sonnet | high   |
| Evaluator           | Sonnet | high   |
| Generator (code)    | Sonnet | high   |
| Generator (write)   | Sonnet | high   |
| Generator (research)| Sonnet | high   |
| Generator (collect) | Haiku  | —      |
```

### Option 4 — `Sonnet only` → `sonnet-only`
preview:
```
| Role                | Model  | Effort |
|---------------------|--------|--------|
| Planner             | Sonnet | high   |
| Evaluator           | Sonnet | high   |
| Generator (code)    | Sonnet | high   |
| Generator (write)   | Sonnet | high   |
| Generator (research)| Sonnet | high   |
| Generator (collect) | Sonnet | low    |
```

### Option 5 — `Custom — let me pick each role` → `custom`
preview:
```
You'll be asked 5 follow-up questions:
1. Planner model
2. Evaluator model
3. Generator (code/write/research) model
4. Generator (collect) model
5. Effort tier: fast / balanced / deep
```

## Step 3 — If Preset is `custom`: 5 Follow-Up Questions

Skip this step unless the user picked `custom`. Otherwise ask each in
order via `AskUserQuestion`.

Questions 1-4 — model selection. Options for every question are `fable`,
`opus`, `sonnet`, `haiku` (offer `mythos` only if the user states they
have Project Glasswing access — it fails to spawn otherwise):

1. "Which model for the Planner role?" → `models.planner.model`
2. "Which model for the Evaluator role?" → `models.evaluator.model`
3. "Which model for Generator default tasks (code / write / research)?"
   → sets `models.generator.code.model`, `models.generator.write.model`,
   and `models.generator.research.model` to the same value
4. "Which model for Generator collect tasks (data fetching, transforms)?"
   → `models.generator.collect.model`

Question 5 — effort tier:

Use `AskUserQuestion`: "Reasoning effort level — controls how hard each
role thinks. Higher = better quality, slower, more compute."

Options:

### Option a — `fast — minimum thinking, cheapest` → `fast`
preview:
```
| Role                | Effort |
|---------------------|--------|
| Planner             | medium |
| Evaluator           | low    |
| Generator (code)    | low    |
| Generator (write)   | low    |
| Generator (research)| medium |
| Generator (collect) | low    |
```

### Option b — `balanced — recommended default` → `balanced` (Recommended)
preview:
```
| Role                | Effort |
|---------------------|--------|
| Planner             | high   |
| Evaluator           | medium |
| Generator (code)    | medium |
| Generator (write)   | low    |
| Generator (research)| high   |
| Generator (collect) | low    |
```

### Option c — `deep — maximum quality, slowest` → `deep`
preview:
```
| Role                | Effort |
|---------------------|--------|
| Planner             | xhigh  |
| Evaluator           | high   |
| Generator (code)    | high   |
| Generator (write)   | medium |
| Generator (research)| xhigh  |
| Generator (collect) | low    |
```
Note: `xhigh` only applies if the role's model is `opus` / `fable` /
`mythos`. On a `sonnet`-routed role it clamps to `high` (Sonnet has no
`xhigh`); on `haiku` all effort is ignored.

## Step 4 — Build and Preview the Config

Construct the JSON v4 object based on the preset (or custom answers
from Step 3).

### Preset Mappings (model + effort combined)

| Preset | planner | evaluator | gen.code | gen.write | gen.research | gen.collect |
|---|---|---|---|---|---|---|
| `frontier` | fable/high | opus/high | sonnet/high | sonnet/high | sonnet/high | haiku/— |
| `full-access` | opus/xhigh | opus/high | sonnet/high | sonnet/high | sonnet/high | haiku/— |
| `no-opus` | sonnet/high | sonnet/high | sonnet/high | sonnet/high | sonnet/high | haiku/— |
| `sonnet-only` | sonnet/high | sonnet/high | sonnet/high | sonnet/high | sonnet/high | sonnet/low |

`haiku/—`: `collect` routes to Haiku, which takes no effort (omit the field).
When writing the JSON, `collect` may still carry `"effort": "low"` for Haiku
— it is ignored — so existing configs need no edit.

For `custom`, combine Step 3 questions 1-4 (models) with question 5
(effort tier from the tier table in config-schema.md § Presets).

### Show the Preview as a Table (User-Friendly)

Print this format to the user — clearer than raw JSON:

```
Selected preset: <preset-name>

| Role                | Model    | Effort |
|---------------------|----------|--------|
| Planner             | <model>  | <eff>  |
| Evaluator           | <model>  | <eff>  |
| Generator (code)    | <model>  | <eff>  |
| Generator (write)   | <model>  | <eff>  |
| Generator (research)| <model>  | <eff>  |
| Generator (collect) | <model>  | <eff>  |

Will be written to: ~/.claude/agent-harness.json
```

### Confirm via AskUserQuestion

Use `AskUserQuestion`: "Write this config to ~/.claude/agent-harness.json?"
Options:
- `Confirm` → continue to Step 5
- `Cancel` → stop without writing

Internally the file content is the JSON object below (pretty-printed
with 2-space indent). You don't need to show this to the user unless
they ask:

```json
{
  "version": 4,
  "models": {
    "planner":   { "model": "<value>", "effort": "<value>" },
    "evaluator": { "model": "<value>", "effort": "<value>" },
    "generator": {
      "code":     { "model": "<value>", "effort": "<value>" },
      "write":    { "model": "<value>", "effort": "<value>" },
      "research": { "model": "<value>", "effort": "<value>" },
      "collect":  { "model": "<value>", "effort": "<value>" }
    }
  }
}
```

## Step 5 — Write the Config File

1. Ensure the parent directory exists. Run via Bash:
   ```bash
   mkdir -p ~/.claude
   ```
2. Use the `Write` tool to write the JSON to `~/.claude/agent-harness.json`.
3. Print confirmation:
   > "Config written to ~/.claude/agent-harness.json. Run /sprint to use these settings."

## Step 6 — Mention Project-Level Override

After writing, tell the user:

> "For project-specific overrides, copy this file to
> `./.claude/agent-harness.local.json` in your repo. The `.local.json`
> suffix matches the documented `.claude/*.local.json` gitignore
> pattern, so the override stays out of git by default. `/sprint` reads
> project first, then user-level, then built-in defaults."

---

## Gotchas

- Run `mkdir -p ~/.claude` before Write — the directory may not exist
  on a fresh user profile
- The wizard never validates whether the chosen models are actually
  available to the user; if they pick a model their access level
  doesn't include, `/sprint` will fail at the relevant subagent spawn
  with a useful error
- Pretty-print JSON with 2-space indent (matches statusline convention)
  so the file remains hand-editable
- Do not rename the existing config silently if the user picks Cancel;
  only Step 5 writes the file
- v0.6.0 dropped multi-host support (engine=codex/auggie). v2.3.0
  added per-role `effort`. v1 / v2 / v3 configs auto-lift to v4 on
  first read; v2 configs with engine != "claude" abort the lift and
  force re-init — Step 1 handles this gracefully by offering Reconfigure
- The `effort` field is currently injected as a prompt-level keyword
  (`Think.`, `Think hard.`, etc.) because Claude Code's Agent tool does
  not yet accept effort at invocation time. When the tool gains native
  effort support, /sprint will switch transparently — the config schema
  stays the same
- `max` effort is intentionally not in any preset — reserve it for one-off
  hand-edits when you genuinely need ultrathink on a specific role
- **Effort is per-model.** `haiku` takes no effort (the field is ignored —
  never injected). `sonnet` has no `xhigh` (it clamps to `high`). Only
  `opus` / `fable` / `mythos` accept `xhigh`. `/sprint` rounds an
  out-of-range effort DOWN to the model's nearest valid level, so a config
  is never rejected for this — but do not promise the user `xhigh` on a
  Sonnet role. `ultracode` is not an effort level
- `fable` (Claude Fable 5) uses adaptive thinking — the injected effort
  keyword has limited effect on fable-routed roles; the `effort` field
  there is advisory. Fable also costs ~2× Opus 4.8 ($10/$50 per Mtok)
  and silently falls back to Opus 4.8 on restricted topics
  (cybersecurity, bio/chem) — behavior and cost change without an error
- `mythos` (Mythos 5) is restricted to Project Glasswing accounts and is
  not on the general API. Only offer/write it if the user states they have
  access; otherwise its subagent spawn fails like an inaccessible `opus`.
  Never put it in a default/shared preset
- This config routes **subagents only** — the orchestrator (main
  session) model is whatever the user picked via `/model`. Suggest
  Fable 5 there for big sprints (1M context), not in this config
