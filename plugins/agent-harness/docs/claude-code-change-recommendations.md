# Claude Code Change Recommendations

This file records Claude Code-side changes suggested while adding Codex support. Codex support should not silently reshape the Claude Code plugin runtime.

## Current Recommendation (v2.3.0)

Add per-role `effort` (reasoning level) to the Claude routing schema, matching
the parity Codex already has via its native `reasoning_effort` field.

Changes shipped in v2.3.0:

- Schema bumped from v3 to v4: each role becomes `{ model, effort }` instead of
  a bare model string. `effort` accepts `low` / `medium` / `high` / `xhigh` / `max`.
- `/agent-harness:init` wizard adds an effort-tier question (`fast` / `balanced` /
  `deep`) on the `custom` preset.
- `/sprint` Phase 0 reads effort per role; Phases 2 / 3 / 5 inject the
  corresponding Anthropic-recognized keyword (`Think.`, `Think hard.`,
  `Think harder.`, `Ultrathink.`) at the top of each subagent's prompt. For
  `low`, no keyword is injected.
- v1 / v2 / v3 configs auto-lift to v4 on first read with role-defaulted
  effort values.

## Upstream Ask — Native Agent-Tool Effort

The keyword-injection bridge exists because Claude Code's `Agent` tool currently
accepts `model` at invocation time but **not** `effort`. The frontmatter `effort`
field documented at https://code.claude.com/docs/en/sub-agents.md is only honored
for statically-defined `.claude/agents/*.md`, not for dynamic `Agent(...)` spawns
that orchestrators like `/sprint` rely on.

Suggested change: extend the `Agent` tool schema with an optional `effort`
parameter (`low` / `medium` / `high` / `xhigh` / `max`) that overrides the
spawned agent's session-inherited effort. When this lands, `/sprint` can drop
the keyword-injection bridge and pass `effort` natively. The config schema does
not need to change.

## Deferred Ideas

- Add a Claude Code note that Codex support now lives in `.codex-plugin/` and `codex/`.
- Consider a future shared `core/` directory if both adapters begin duplicating large sections of the sprint contract.
- Do not reintroduce schema v2 `{ engine, model }` routing unless both hosts have a stable shared configuration story.
