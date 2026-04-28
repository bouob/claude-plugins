---
description: Initialize agent-harness model routing for your Claude tier (subscription or API)
allowed-tools: Read, Write, AskUserQuestion, Bash
argument-hint: "[--detect-only]"
---

# /agent-harness:init — Configure Model Routing

Walk the user through writing `~/.claude/agent-harness.json` so `/sprint`
knows which Claude models to assign to each role (Planner, Evaluator,
Generator). Defaults assume Opus access; this wizard lets users on Pro/Team
subscriptions, Sonnet-only API keys, or any other access shape route around
the assumption.

v0.3.1 introduces a Step 0 detection layer that probes which agent CLIs
are installed locally (Claude Code / Codex / Auggie) and reports back. The
wizard's interactive Step 0c–0e (host selection + cross-tool deployment)
land in v0.4.0; for v0.3.1 detection is informational only.

Flags:
- `--detect-only` — run Step 0 and exit (no questions, no writes). Useful
  for verifying the host detection layer before committing to reconfigure.

Schema reference: `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/config-schema.md`.
Detection contract: `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/cross-host-deployment.md`.

---

## Step 0 — Detect Host & Backends (v0.3.1+)

### Step 0a — Run the detector script

Pick the script for the current OS and capture its stdout (each line is
`key=value`):

```bash
# POSIX (Linux / macOS / Git Bash on Windows)
bash "${CLAUDE_PLUGIN_ROOT}/adapters/detect-host.sh"
```

Or on native Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "${CLAUDE_PLUGIN_ROOT}/adapters/detect-host.ps1"
```

Either script always exits 0. Parse the output into the following keys
(treat missing keys as `0` / empty for safety):

```
claude_installed   codex_installed   auggie_installed
codex_authed       codex_configured  auggie_authed
running_host       plugin_root       os
```

If the detector itself errors (e.g. PowerShell blocked by execution policy),
fall back to noting "host detection unavailable" and skip to Step 1 with
defaults — never abort init on detection failure.

### Step 0b — Display detection table

Render a markdown table to the user before any further questions:

```
Detected environment:

| CLI          | Installed | Authed | Configured | Running here? |
|--------------|-----------|--------|------------|---------------|
| claude-code  | <claude_installed> | -                 | -                  | <if running_host=claude-code: ✓ else blank> |
| codex        | <codex_installed>  | <codex_authed>    | <codex_configured> | <if running_host=codex:       ✓ else blank> |
| auggie       | <auggie_installed> | <auggie_authed>   | -                  | <if running_host=auggie:      ✓ else blank> |

(✓ = yes, ✗ = no, - = not applicable)

Detected primary host: <running_host>
Detected ready secondary backends: <comma-separated list of CLIs that are installed AND authed AND not the running_host>
```

When `running_host=unknown` (e.g. detector found no obvious signal), print:

> "Host could not be auto-detected. v0.3.1 will assume `claude-code` for
> Step 1 onward. v0.4.0 will ask explicitly."

### Step 0c–0e — Reserved for v0.4.0

Interactive prompts for primary-host selection, secondary-deployment toggles,
and final-action confirmation are scoped to v0.4.0. v0.3.1 prints the
detection report and proceeds to Step 1 unchanged.

### `--detect-only` short-circuit

If `$ARGUMENTS` contains the literal token `--detect-only`:

1. Run Step 0a + 0b
2. Print "Detection complete. No config changes made."
3. Exit (do NOT proceed to Step 1)

Use this for diagnostics — e.g. before opening a GitHub issue about which
backend Step 0 misidentifies.

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

Use `AskUserQuestion` to ask: "Which Claude models can you use? (works for
both Claude.ai subscriptions and direct API access)"

**Use the `preview` field on each option** to show a markdown table of the
resulting routing — this lets the user compare presets visually without
reading JSON.

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

### Show the Preview as a Table (User-Friendly)

Print this format to the user — it's clearer than raw JSON:

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

The "Generator (default)" row collapses `code`, `write`, `research` because
they always share the same value (set together in Step 3 question 3, or
identical across all 3 presets).

### Confirm via AskUserQuestion

Use `AskUserQuestion`: "Write this config to ~/.claude/agent-harness.json?"
Options:
- `Confirm` → continue to Step 5
- `Cancel` → stop without writing

Internally the file content is the JSON object below (pretty-printed with
2-space indent). You don't need to show this to the user unless they ask:

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
- Step 0 detection (v0.3.1+) is informational; it never aborts init even when the detector script fails. If `running_host=unknown`, default behaviour falls through to claude-code assumptions exactly like v0.3.0
- `--detect-only` is the only flag that short-circuits — all other paths run Step 1 onwards regardless of detection results
- The detector emits keys it knows about; v0.4.0 will add new keys (e.g. `auggie_session_kind=personal|service-account`) without removing existing ones — parsers must tolerate unknown keys
