---
description: Initialize agent-harness model routing for your Claude tier (subscription or API)
allowed-tools: Read, Write, AskUserQuestion, Bash
argument-hint: ""
---

# /agent-harness:init — Configure Model Routing

Walk the user through writing `~/.claude/agent-harness.json` so `/sprint`
knows which Claude models to assign to each role (Planner, Evaluator,
Generator). Defaults assume Opus access; this wizard lets users on
Pro/Team subscriptions, Sonnet-only API keys, or any other access shape
route around the assumption.

> **v0.6.0 simplified back to Claude Code-only.** The v0.4.x – v0.5.x
> multi-host wizard (Codex / Auggie host options, schema v2 with
> engine namespacing) was rolled back. v1 / v2 configs auto-lift to
> v3 plain-model-string format on first read; v2 configs with
> non-claude engines are rejected with a re-init message.

Schema reference: `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/config-schema.md`.

---

## Step 1 — Detect Existing Config

Try Read on `~/.claude/agent-harness.json`. If the file exists:

1. Parse the JSON. If `version` is missing or `1` or `2`, run the
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

### Option 1 — `All models — Opus, Sonnet, Haiku` → `full-access`
preview:
```
| Role                | Model  |
|---------------------|--------|
| Planner             | Opus   |
| Evaluator           | Sonnet |
| Generator (default) | Sonnet |
| Generator (collect) | Haiku  |
```

### Option 2 — `Sonnet + Haiku (no Opus access)` → `no-opus`
preview:
```
| Role                | Model  |
|---------------------|--------|
| Planner             | Sonnet |
| Evaluator           | Sonnet |
| Generator (default) | Sonnet |
| Generator (collect) | Haiku  |
```

### Option 3 — `Sonnet only` → `sonnet-only`
preview:
```
| Role                | Model  |
|---------------------|--------|
| Planner             | Sonnet |
| Evaluator           | Sonnet |
| Generator (default) | Sonnet |
| Generator (collect) | Sonnet |
```

### Option 4 — `Custom — let me pick each role` → `custom`
preview:
```
You'll be asked 4 follow-up questions
to assign a model for each role:
- Planner
- Evaluator
- Generator (default)
- Generator (collect)
```

## Step 3 — If Preset is `custom`: 4 Follow-Up Questions

Skip this step unless the user picked `custom`. Otherwise ask each in
order via `AskUserQuestion`. Options for every question are `opus`,
`sonnet`, `haiku`.

1. "Which model for the Planner role?" → `models.planner`
2. "Which model for the Evaluator role?" → `models.evaluator`
3. "Which model for Generator default tasks (code / write / research)?"
   → sets `models.generator.code`, `models.generator.write`, and
   `models.generator.research` to the same value
4. "Which model for Generator collect tasks (data fetching, transforms)?"
   → `models.generator.collect`

## Step 4 — Build and Preview the Config

Construct the JSON v3 object based on the preset (or custom answers
from Step 3).

### Preset Mappings

| Preset | planner | evaluator | gen.code | gen.write | gen.research | gen.collect |
|---|---|---|---|---|---|---|
| `full-access` | opus | sonnet | sonnet | sonnet | sonnet | haiku |
| `no-opus` | sonnet | sonnet | sonnet | sonnet | sonnet | haiku |
| `sonnet-only` | sonnet | sonnet | sonnet | sonnet | sonnet | sonnet |

### Show the Preview as a Table (User-Friendly)

Print this format to the user — clearer than raw JSON:

```
Selected preset: <preset-name>

| Role                | Model    |
|---------------------|----------|
| Planner             | <value>  |
| Evaluator           | <value>  |
| Generator (default) | <value>  |
| Generator (collect) | <value>  |

Will be written to: ~/.claude/agent-harness.json
```

The "Generator (default)" row collapses `code`, `write`, `research`
because they always share the same value (set together in Step 3
question 3, or identical across all 3 presets).

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
  "version": 3,
  "models": {
    "planner": "<value>",
    "evaluator": "<value>",
    "generator": {
      "code": "<value>",
      "write": "<value>",
      "research": "<value>",
      "collect": "<value>"
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
- v0.6.0 dropped multi-host support. v2 configs (v0.4.x – v0.5.x) auto-lift
  by extracting `model` from `{engine: "claude", model: "..."}`. Non-claude
  engines abort the lift and force re-init — Step 1 handles this gracefully
  by offering Reconfigure
