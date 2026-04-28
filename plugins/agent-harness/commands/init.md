---
description: Initialize agent-harness model routing — host-aware wizard for Claude Code / Codex
allowed-tools: Read, Write, AskUserQuestion, Bash
argument-hint: "[--detect-only] [--host=claude-code|codex|multi-host] [--non-interactive]"
---

# /agent-harness:init — Configure Model Routing

Walk the user through writing the agent-harness config so `/sprint`
knows which engine + model to assign to each role (Planner, Evaluator,
Generator). The wizard is host-aware: presets and model choices change
based on which CLI environment the user is running in.

v0.5.0 dropped Auggie CLI support. Supported hosts are Claude Code
(first-class) and Codex CLI (generator backend, full host support
arriving v0.6.0).

Flags:
- `--detect-only` — run Step 0a/0b and exit (no questions, no writes)
- `--host=<name>` — explicit host override; skip Step 0c (auto-detect
  prompt). Valid values: `claude-code`, `codex`, `multi-host`
- `--non-interactive` — for CI; uses `--host` or detected host without
  prompting. Combine with `--host` to pin behaviour.

Schema reference: `${AGENT_HARNESS_ROOT}/skills/sprint/references/config-schema.md`.
Detection contract: `${AGENT_HARNESS_ROOT}/skills/sprint/references/cross-host-deployment.md`.
Model registry: `${AGENT_HARNESS_ROOT}/skills/sprint/references/model-registry.md`.

> Path token: `${AGENT_HARNESS_ROOT}` and `${CLAUDE_PLUGIN_ROOT}` are
> aliases under Claude Code v0.5.x. The Codex host (v0.6.0 target)
> will substitute `${AGENT_HARNESS_ROOT}` to its own install directory.

---

## Step 0 — Detect Host & Backends

### Step 0a — Run the detector script

Pick the script for the current OS and capture its stdout (each line is
`key=value`):

```bash
# POSIX (Linux / macOS / Git Bash on Windows)
bash "${AGENT_HARNESS_ROOT}/adapters/detect-host.sh"
```

Or on native Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "${AGENT_HARNESS_ROOT}/adapters/detect-host.ps1"
```

Either script always exits 0. Parse the output into the following keys
(treat missing keys as `0` / empty for safety):

```
claude_installed   codex_installed
codex_authed       codex_configured
running_host       parent_proc       plugin_root       os
```

If the detector itself errors (e.g. PowerShell blocked by execution
policy), fall back to noting "host detection unavailable" and continue
to Step 0c with `running_host=unknown`.

### Step 0b — Display detection table

Render a markdown table to the user:

```
Detected environment:

| CLI          | Installed | Authed | Configured | Running here? |
|--------------|-----------|--------|------------|---------------|
| claude-code  | <claude_installed>  | -              | -                  | <if running_host=claude-code: ✓ else blank> |
| codex        | <codex_installed>   | <codex_authed> | <codex_configured> | <if running_host=codex: ✓ else blank>       |

(✓ = yes, ✗ = no, - = not applicable)

Detection summary:
  parent_proc:    <parent_proc>
  running_host:   <running_host>
  ready engines:  <comma-separated CLIs that are installed AND authed>
```

### Step 0c — Confirm primary host (NEW in v0.4.0)

This is the critical fix from v0.3.x: never silently fall through to
`claude-code` when host is unknown. Always confirm via question.

#### Skip Step 0c if any of these apply

- `$ARGUMENTS` contains `--host=<value>` → use that value as primary host
- `$ARGUMENTS` contains `--non-interactive` AND `running_host` is
  definitive (not unknown) → use `running_host` as primary host
- `--detect-only` was passed → jump to Step 0e (just print "Detection
  complete." and exit)

#### Otherwise, ask via AskUserQuestion

```
Title: "Primary host"
Description: "Which CLI environment will be the *primary* place you run
/sprint from? This determines preset choices and config path."

Options (preselect = detected running_host; if unknown, no preselect):
- "Claude Code (claude-code)"  → claude-code
- "OpenAI Codex CLI (codex)"   → codex
- "Multiple — I switch often"  → multi-host
```

If user picks `multi-host`, the wizard skips presets in Step 2 and
jumps straight to per-role custom selection in Step 3 (presets don't
make sense across hosts).

If `running_host=unknown` AND no `--host=` AND user is in
`--non-interactive` mode → ABORT with:
> "Cannot determine primary host. Re-run with `--host=<claude-code|codex|multi-host>`."

### Step 0d — Confirm secondary deployment targets

For each non-primary host that is **ready** (installed + authed), ask
whether to deploy entry-point files there too. v0.5.0 ships the prompts
but actual deployment (writing AGENTS.md, symlinking `.codex/skills/`)
lands in v0.5.1. v0.5.0 only records the user's intent in
`cross_tool_deployed.*` config fields.

Skip Step 0d if `--non-interactive` is set or primary host is
`multi-host` (multi-host implies all-deploys).

For codex (if installed and not the primary):

```
AskUserQuestion: "Also deploy entry-point files for <CLI>?"
- Yes → record cross_tool_deployed flag = true
- No  → flag = false
- Tell me more → print explainer + re-ask
```

#### AGENTS.md question — conditional

Only ask the AGENTS.md question when at least ONE of these is true:

- The user said Yes to deploying for `codex` in the previous prompt
  (Codex CLI auto-loads AGENTS.md, so the file is directly useful)
- Primary host is `multi-host` (all-tools coverage)
- The user explicitly passed `--deploy=agents-md`

```
AskUserQuestion: "Generate AGENTS.md so any AGENTS.md-aware tool
(Cursor, Copilot, Windsurf, Amp, Devin) can also read the sprint
procedure?"
```

If none of those are true (e.g. primary=claude-code with no codex
deploy), **skip the question entirely** and default
`cross_tool_deployed.agents_md = false`. Claude Code does not
auto-load AGENTS.md, so prompting for it without a downstream consumer
is noise — fixed in v0.7.0 after v0.6.0 user feedback.

### Step 0e — Final preview & confirmation

Render the full plan as a single block (host + models + deploys) for
final approval. The user can read the entire thing before any file is
written.

```
About to write:

Primary host: <host>
Config path:  <path-derived-from-host>
Preset:       <preset name from Step 2 — or "custom" / "deferred to Step 3">

Roles:
| Role                | Engine | Model       |
|---------------------|--------|-------------|
| Planner             | <e>    | <m>         |
| Evaluator           | <e>    | <m>         |
| Generator (default) | <e>    | <m>         |
| Generator (collect) | <e>    | <m>         |

Cross-tool deployment (v0.5.1 will execute these):
  Codex skills symlink:   <yes/no>
  AGENTS.md:              <yes/no>

Confirm?
- Confirm (write config) ← preselected
- Edit roles → return to Step 3 custom
- Cancel (no changes)
```

If user picks Confirm → continue to Step 1 onward.
If `--non-interactive` and a config preset is fully resolved → skip
this question and write directly.

---

## Step 1 — Detect Existing Config

Compute the user-level config path from `host` (Step 0c value):

| host         | path                                |
|--------------|-------------------------------------|
| claude-code  | `~/.claude/agent-harness.json`       |
| codex        | `~/.codex/agent-harness.json`        |
| multi-host   | `~/.claude/agent-harness.json` (canonical), then mirror to others |

Try Read on the host's config path. If the file exists:

1. Parse the JSON. If `version` field is missing or `1`, run the
   v1→v2 lift described in `references/config-schema.md` § Migration.
2. Show the user the current `models` block as a preview table
   (Engine | Role | Model — see Step 4 format).
3. Use `AskUserQuestion`: "Existing config found. Reconfigure or keep?"
   - `Reconfigure` → continue to Step 2
   - `Show current and exit` → print the parsed config, stop
   - `Cancel` → stop without printing

If the file does not exist, proceed straight to Step 2.

## Step 2 — Pick a Preset (host-aware)

Choices depend on `host` from Step 0c. Read full preset definitions from
`references/config-schema.md` § Presets.

### When host = `claude-code`

```
AskUserQuestion: "Which Claude models can you use?"
- All models — Opus, Sonnet, Haiku    → full-access
- Sonnet + Haiku (no Opus access)     → no-opus
- Sonnet only                         → sonnet-only
- Mixed: Claude + Codex for collect   → mixed-collect (requires CODEX_API_KEY)
- Custom — let me pick each role      → custom
```

### When host = `codex`

```
AskUserQuestion: "Which Codex preset?"
- gpt-5.5 everywhere (default)        → codex-default
- Budget: gpt-5.4-mini + spark        → codex-budget
- Custom — let me pick each role      → custom
```

### When host = `multi-host`

Skip Step 2 — multi-host always uses `custom`.

Each preset's preview field should show a markdown Engine|Role|Model
table so users can compare visually without reading JSON.

## Step 3 — Custom (per-role) follow-ups

Skip this step unless preset is `custom`.

1. Ask Planner engine + model (engine first via 2-option AskUserQuestion
   `claude` / `codex`; then model from that engine's registry list)
2. Ask Evaluator engine + model
3. Ask Generator default engine + model (applies to code, write, research)
4. Ask Generator collect engine + model

## Step 4 — Build & Preview the Config

Construct the JSON v2 object based on Step 2 preset (or Step 3 custom
answers). Show it as a table to the user (Engine column makes the
ambiguity from v0.3.x impossible):

```
Selected preset: <preset-name>
Primary host:    <host>

| Role                | Engine   | Model         |
|---------------------|----------|---------------|
| Planner             | <e>      | <m>           |
| Evaluator           | <e>      | <m>           |
| Generator (default) | <e>      | <m>           |
| Generator (collect) | <e>      | <m>           |

Cross-tool deploys (deferred to v0.5.1):
  Codex symlink:  <bool>
  AGENTS.md:      <bool>

Will be written to: <config_path>
```

The "Generator (default)" row collapses `code`, `write`, `research`
because they share the same value across all presets and the custom
flow.

This table replaces the v0.3.x Step 4 preview that omitted Engine. The
omission was the root cause of the "what does sonnet mean here?"
ambiguity reported by users in v0.3.1.

## Step 5 — Write the Config File

1. Ensure the parent directory exists. Run via Bash:
   ```bash
   mkdir -p "$(dirname <config_path>)"
   ```
2. Use the `Write` tool to write the JSON v2 to `<config_path>`.
   Pretty-print with 2-space indent.
3. Print confirmation:
   > "Config written to <config_path>. Run /sprint to use these settings."

## Step 6 — Mention Project-Level Override

After writing, tell the user:

> "For project-specific overrides, copy this file to
> `./<host-prefix>/agent-harness.local.json` in your repo
> (e.g. `./.claude/agent-harness.local.json` for claude-code host).
> The `.local.json` suffix matches the documented `*.local.json`
> gitignore pattern, so the override stays out of git by default.
> `/sprint` reads project first, then user-level, then built-in defaults."

---

## Gotchas

- v0.4.0 fixed the v0.3.x silent-fallback bug: `running_host=unknown`
  no longer assumes claude-code. It either asks (Step 0c) or aborts
  with a clear `--host=` instruction in `--non-interactive` mode.
- The detector heuristic uses parent process name, not env vars —
  Codex doesn't expose runtime env vars yet (verified 2026-04-28).
  When parent is `node` (common for npx-launched CLIs), `running_host`
  may stay `unknown` and Step 0c will ask.
- v1→v2 lift requires a known host. If the user has a v1 config AND
  detection returns unknown AND no `--host=` flag → abort with
  instructions to re-run with explicit host.
- The `mixed-collect` preset writes `engines.codex.available=true` AND
  requires `CODEX_API_KEY` to be set. Phase 0 of `/sprint` will warn
  but still attempt — failure surfaces at first Codex generator spawn.
- Cross-tool deployment (Step 0d output) is **recorded but not executed**
  in v0.5.0 — `cross_tool_deployed.*` flags are stored in config so
  v0.5.1 can act on them.
- Run `mkdir -p` before Write — config directories may not exist on
  fresh user profiles (especially `~/.codex/`).
- The wizard never validates whether the chosen models are actually
  available to the user; if they pick an entitled-only model, `/sprint`
  fails at the relevant subagent spawn with a useful error.
- Pretty-print JSON with 2-space indent (matches statusline convention)
  so the file remains hand-editable.
- Do not rename the existing config silently if the user picks Cancel;
  only Step 5 writes the file.
- `--detect-only` is the only flag that short-circuits before Step 1.
- The detector emits keys it knows about; future versions will add new
  keys without removing existing ones — parsers must tolerate unknown
  keys.
