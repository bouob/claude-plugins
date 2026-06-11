# Claude Code Change Recommendations

This file records Claude Code-side changes suggested while adding Codex support. Codex support should not silently reshape the Claude Code plugin runtime.

## Current Recommendation (per-model effort + mythos)

Make effort model-aware and add `mythos` to the routing value set; upgrade the
recommended presets toward quality on the highest-leverage roles.

Changes shipped:

- Effort is no longer a uniform enum. Each model has its own valid ladder —
  `haiku` takes none, `sonnet` has no `xhigh`, `opus` / `fable` / `mythos`
  accept the full `low`–`max` range. `/sprint` clamps an out-of-range effort
  DOWN to the model's nearest valid level (`normalizeEffort(model, effort)` in
  the workflow script; the same rule by hand on the fallback). Schema stays v4.
- `mythos` (Mythos 5) joins the model enum as a pure value-set extension. It is
  restricted to Project Glasswing accounts; documented as such, with the same
  spawn-failure handling as an inaccessible `opus`. Never in a default preset.
- `ultracode` is deliberately NOT an effort value — it collides with the Claude
  Code Workflow multi-agent opt-in keyword. `max` remains the ceiling.
- Recommended presets upgraded: Planner takes the strongest model+effort
  (`frontier`: fable/high, `full-access`: opus/xhigh), Evaluator opus/high, and
  every reasoning Generator moves to sonnet/high (`collect` stays haiku, no
  effort). The zero-config safe default is unchanged (all sonnet/medium).
- Harness debt fixed in the same pass: role-prompt `{WORKSPACE}` tokens were
  never substituted on either backend (the Assignment's concrete `WORKSPACE:`
  line is now the single source of truth), and `sprint-progress-summary.md`
  generation is now guarded (fallback Phase 4 marked mandatory; the Evaluator
  tolerates a missing summary by reading `sprint-progress/` directly).

## Previous Recommendation (v2.5.0)

Move `/sprint` Phase 2–6 orchestration onto Claude Code dynamic workflows
(v2.1.154+) so intermediate sprint artifacts stay out of the main session's
context; add `fable` (Claude Fable 5) to the model value set.

Changes shipped in v2.5.0:

- `/sprint` assembles and launches a workflow script (Planner → parallel
  Generators → Aggregate → Evaluator → retry loop). The Agent-tool path,
  including the `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` check, survives only
  as a fallback in `skills/sprint/references/agent-fallback.md`.
- Planner and Evaluator additionally return structured output (workflow
  `schema` option) so the script can drive scheduling; the `.sprint/` files
  remain the canonical record.
- `fable` joins the model enum (schema stays v4 — pure value-set extension);
  new `frontier` preset routes the Planner to `fable`/`high`.
- Effort keyword injection now documented for both spawn surfaces.

## Previous Recommendation (v2.3.0)

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

## Upstream Ask — Native Effort on Both Spawn Surfaces

The keyword-injection bridge exists because **neither** dynamic spawn surface
accepts `effort` at invocation time:

- Claude Code's `Agent` tool accepts `model` but not `effort`. The frontmatter
  `effort` field documented at https://code.claude.com/docs/en/sub-agents.md is
  only honored for statically-defined `.claude/agents/*.md`.
- The dynamic-workflow runtime's `agent(prompt, opts)` hook likewise accepts
  `opts.model` (`sonnet` / `opus` / `haiku` / `fable`) but no effort option.

Suggested change: extend both surfaces with an optional `effort` parameter
(`low` / `medium` / `high` / `xhigh` / `max`) that overrides the spawned
agent's session-inherited effort. The need has grown with Claude Fable 5:
its adaptive thinking further dilutes prompt-keyword escalation, so an
explicit parameter is the only reliable lever. When this lands, `/sprint`
can drop the keyword-injection bridge on both backends. The config schema
does not need to change.

A native `effort` parameter should also encode the **per-model valid range**
(or clamp server-side): today `haiku` accepts no effort, `sonnet` has no
`xhigh`, and only `opus` / `fable` / `mythos` reach `xhigh`. `/sprint`
currently mirrors this by rounding down per model before injecting the
keyword; a native parameter that rejected or silently mis-applied an
out-of-range value would reintroduce the bug the clamp removes.

## Deferred Ideas

- Add a Claude Code note that Codex support now lives in `.codex-plugin/` and `codex/`.
- Consider a future shared `core/` directory if both adapters begin duplicating large sections of the sprint contract.
- Do not reintroduce schema v2 `{ engine, model }` routing unless both hosts have a stable shared configuration story.
