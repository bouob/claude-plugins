# Model Registry

> **Status:** introduced in v0.4.0. Canonical list of model IDs accepted by
> each engine, used by `/agent-harness:init` (host-aware preset rendering)
> and `/sprint` Phase 0 (validation before subagent spawn).
>
> **Verified 2026-04-28.** Re-verify on every minor release — model lineups
> rotate frequently.

This registry is the single source of truth for valid `models.*.model`
strings in `~/.claude/agent-harness.json`. The wizard reads it to build
preset choices; Phase 0 reads it to reject typos before they cause
subagent spawn failures.

When a model is added or retired upstream, update this file and the
adapter scripts together. Do not hardcode model IDs anywhere else in the
plugin.

---

## Claude Code (engine: `claude`)

Substituted via the `Agent` tool's `model:` parameter or `subagent_type`.

| Model ID    | Lineup       | Use for                       |
|-------------|--------------|-------------------------------|
| `opus`      | Claude 4.x   | Planner, hard Evaluator       |
| `sonnet`    | Claude 4.x   | Generator (default)           |
| `haiku`     | Claude 4.x   | Generator (collect)           |

The Agent tool accepts the short alias (`opus` / `sonnet` / `haiku`); it
resolves to the latest 4.x variant the user's plan grants. Do not pin
exact IDs (`claude-opus-4-7`) in config — the alias keeps configs valid
across model bumps.

Source: Claude Code plugin docs + observable Agent tool behaviour.

---

## OpenAI Codex CLI (engine: `codex`)

Passed via `codex exec --model <id>`. Verified against
<https://developers.openai.com/codex/models> (2026-04-28).

| Model ID                  | Status        | Use for                                |
|---------------------------|---------------|----------------------------------------|
| `gpt-5.5`                 | default       | Most tasks (Codex's recommended start) |
| `gpt-5.4`                 | flagship      | Planner / Evaluator if 5.5 unavailable |
| `gpt-5.4-mini`            | lightweight   | Sub-agents, fast Generator             |
| `gpt-5.3-codex`           | original      | Compatibility / fallback               |
| `gpt-5.3-codex-spark`     | research      | Real-time iteration, cheap collect     |

**Default for agent-harness Codex backend:** `gpt-5.5` if available,
else `gpt-5.4`. Wizard preset `codex-default` maps everything to
`gpt-5.5`; `codex-budget` uses `gpt-5.4-mini` for sub-agents and
`gpt-5.3-codex-spark` for collect.

Codex `--model` rejects unknown IDs with a clear error, so typos in
config surface at the first generator spawn.

---

## Auggie CLI / Augment Code (engine: `auggie`)

Passed via `auggie --model <id>`. Verified via product page +
`auggie models list` documentation references (2026-04-28).

| Model ID         | Provider | Use for                                  |
|------------------|----------|------------------------------------------|
| `opus-4.7`       | Claude   | Planner (highest quality)                |
| `sonnet-4.6`     | Claude   | Default — Planner / Generator / Evaluator |
| `sonnet-4.5`     | Claude   | Previous-gen Sonnet (compatibility)      |
| `haiku-4.5`      | Claude   | Generator (collect)                      |
| `gpt-5.4`        | OpenAI   | Cross-vendor diversity                   |
| `gpt-5.2`        | OpenAI   | Older GPT for specific reasoning bias    |
| `gemini-3.1-pro` | Google   | Structural thinking / planning           |

**BYOM:** Auggie supports bring-your-own-model via Augment account
configuration. agent-harness does not validate BYOM strings against this
registry — Phase 0 emits a warning and proceeds. Use BYOM at your own
risk; if the underlying provider rejects the request, the Generator task
will fail at first turn.

To enumerate the live list on the host: `auggie models list`.

---

## Cross-Engine Quality Tier (advisory)

Roughly comparable tiers across engines, for users picking custom presets:

| Tier                    | Claude         | Codex          | Auggie (Claude path) | Auggie (cross-vendor) |
|-------------------------|----------------|----------------|----------------------|-----------------------|
| Top reasoning           | `opus`         | `gpt-5.5`      | `opus-4.7`           | `gemini-3.1-pro`      |
| Default workhorse       | `sonnet`       | `gpt-5.4`      | `sonnet-4.6`         | `gpt-5.4`             |
| Cheap / mechanical      | `haiku`        | `gpt-5.3-codex-spark` | `haiku-4.5`   | `gpt-5.2`             |

This is qualitative — benchmark numbers shift per release. Treat the
table as "comparable enough that swapping won't surprise you" rather
than "guaranteed equivalent quality".

---

## Update Procedure

When a new model lands or an existing one is deprecated:

1. Update the relevant table here with the new ID, status, and use-case
2. Update `~/.codex/config.toml` reference snippet in
   `templates/codex-config-patch.toml` if the default model name changed
3. Update wizard preset model strings in `commands/init.md` Step 4
4. Bump the verified-on date at the top
5. If `auggie models list` syntax changed, update the BYOM enumeration
   note above

Do **not** rename model IDs in old config files — Phase 0 lift handles
unknown IDs by warning, not by rewriting user data.
