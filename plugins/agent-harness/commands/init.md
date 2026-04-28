---
description: Initialize agent-harness model routing for your Claude tier (subscription or API)
allowed-tools: Read, Write, AskUserQuestion, Bash
argument-hint: ""
---

# /agent-harness:init — Configure Model Routing

Walk the user through writing `~/.claude/agent-harness.json` so `/sprint`
knows which Claude models to assign to each role (Planner, Evaluator,
Generator). Defaults assume Opus access; this wizard lets users on Pro/Team
subscriptions, Sonnet-only API keys, or any other access shape route around
the assumption.

Schema reference: `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/config-schema.md`.

---

## Step 1 — Detect Existing Config

Try Read on `~/.claude/agent-harness.json`. If the file exists:

1. Parse the JSON and show the user the current `models` block in a fenced
   code block.
2. Use `AskUserQuestion` to ask: "Existing config found. Reconfigure or keep?"
   Options:
   - `Reconfigure` → continue to Step 2
   - `Show current and exit` → print the parsed config, stop
   - `Cancel` → stop without printing

If the file does not exist, proceed straight to Step 2.

## Step 2 — Ask Which Models the User Has Access To

Use `AskUserQuestion` to ask:

> "Which Claude models can you use? (works for both Claude.ai subscriptions
> and direct API access)"

Options (display text → internal preset):
- `All models — Opus, Sonnet, Haiku` → preset `full-access`
- `Sonnet + Haiku (no Opus access)` → preset `no-opus`
- `Sonnet only` → preset `sonnet-only`
- `Custom — let me pick each role` → preset `custom`

## Step 3 — If Preset is `custom`: 4 Follow-Up Questions

Skip this step unless the user picked `custom`. Otherwise ask each in order
via `AskUserQuestion`. Options for every question are `opus`, `sonnet`,
`haiku`.

1. "Which model for the Planner role?" → `models.planner`
2. "Which model for the Evaluator role?" → `models.evaluator`
3. "Which model for Generator default tasks (code / write / research)?" →
   sets `models.generator.code`, `models.generator.write`, and
   `models.generator.research` to the same value
4. "Which model for Generator collect tasks (data fetching, transforms)?" →
   `models.generator.collect`

## Step 4 — Build and Preview the Config

Construct the JSON object based on the preset (or custom answers from Step 3).

### Preset Mappings

| Preset | planner | evaluator | gen.code | gen.write | gen.research | gen.collect |
|---|---|---|---|---|---|---|
| `full-access` | opus | sonnet | sonnet | sonnet | sonnet | haiku |
| `no-opus` | sonnet | sonnet | sonnet | sonnet | sonnet | haiku |
| `sonnet-only` | sonnet | sonnet | sonnet | sonnet | sonnet | sonnet |

Wrap the values in this structure:

```json
{
  "version": 1,
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

Pretty-print with 2-space indent. Show the result in a fenced code block, then
use `AskUserQuestion`: "Write this config to ~/.claude/agent-harness.json?"
Options:
- `Confirm` → continue to Step 5
- `Cancel` → stop without writing

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
> suffix matches the documented `.claude/*.local.json` gitignore pattern,
> so the override stays out of git by default. `/sprint` reads project
> first, then user-level, then built-in defaults."

---

## Gotchas

- Run `mkdir -p ~/.claude` before Write — the directory may not exist on a fresh user profile
- The wizard never validates whether the chosen models are actually available to the user; if they pick a model their access level doesn't include, `/sprint` will fail at the relevant subagent spawn
- Pretty-print JSON with 2-space indent (matches statusline convention) so the file remains hand-editable
- Do not rename the existing config silently if the user picks Cancel; only Step 5 writes the file
