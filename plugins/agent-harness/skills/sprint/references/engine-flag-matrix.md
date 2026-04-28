# Engine Flag Matrix

> **Status:** vendor-neutral reference introduced in v0.3.0. Adapter scripts
> (`adapters/run-codex.sh`) and the `/sprint` Phase 3
> generator dispatcher both read from this matrix. Update here first, then the
> adapters — never hardcode flags inline.

This document is the canonical mapping between agent-harness's vendor-neutral
generator concepts (engine, model, working dir, output target, sandbox,
session) and the actual CLI flags each backend exposes.

Sources cited inline. Verified against official docs as of **2026-04-28**.
Re-verify when bumping any engine's pinned default model.

---

## At-a-glance: Concept → Flag

| Concept                | Claude Code (Agent tool) | Codex CLI (`codex exec`)     |
|------------------------|--------------------------|------------------------------|
| Select model           | `subagent_type` / `model:` | `--model, -m <name>`         |
| Working directory      | inherited from session   | `--cd, -C <path>`            |
| Final answer file      | (orchestrator reads result) | `--output-last-message <p>` |
| JSONL event stream     | n/a                      | `--json`                     |
| Structured schema      | n/a                      | `--output-schema <file>`     |
| Sandbox                | tool-policy enforced     | `--sandbox read-only \| workspace-write \| danger-full-access` |
| Skip approval prompts  | n/a (orchestrator-level) | `--ask-for-approval=never` or `--full-auto` |
| Don't persist session  | n/a (subagent is ephemeral by definition) | `--ephemeral`                |
| Resume previous run    | (re-spawn subagent)      | `codex exec resume --last`   |
| Custom rules / context | inline in prompt         | `AGENTS.md` walk             |
| Auth                   | Claude Code session      | `CODEX_API_KEY` (exec only)  |
| Image input            | embedded in prompt       | (via app-server protocol)    |

---

## Codex CLI — Full Flag Reference

Authoritative source: <https://developers.openai.com/codex/cli/reference>,
<https://developers.openai.com/codex/noninteractive>,
<https://github.com/openai/codex/blob/main/docs/exec.md>.

### Subcommand
- `codex exec [SUBCOMMAND]` — non-interactive run; emits events to stdout/stderr
- `codex exec resume --last` — continue most recent session
- `codex exec resume <SESSION_ID>` — continue specific session

### Model & Configuration
| Flag | Description |
|------|-------------|
| `--model, -m <name>` | Override configured model (e.g. `gpt-5.4`, `gpt-5.3-codex-spark`). Pin via config; **do not hardcode the model name in adapters or SKILL.md** — names rotate with releases. |
| `--profile, -p <name>` | Select profile from `~/.codex/config.toml` |
| `--config, -c key=value` | Inline config override (repeatable) |
| `--cd, -C <path>` | Working directory before execution |

### Output
| Flag | Description |
|------|-------------|
| `--json` | Newline-delimited JSON event stream (`thread.started`, `turn.*`, `item.*`, `error`) |
| `--output-last-message, -o <path>` | Write final assistant message to file. **Primary mechanism agent-harness uses to extract Generator output.** |
| `--output-schema <path>` | Enforce structured JSON response via JSON Schema. Useful for Evaluator phase if cross-engine eval is enabled in v0.5+. |
| `--color always\|never\|auto` | ANSI control |

### Approval & Sandbox
| Flag | Description |
|------|-------------|
| `--ask-for-approval, -a untrusted\|on-request\|never` | Headless runs MUST set `never`. |
| `--sandbox, -s read-only\|workspace-write\|danger-full-access` | Generator tasks default to `workspace-write`. |
| `--full-auto` | Preset = `workspace-write` + `on-request` approval. **Avoid in agent-harness** — `on-request` still pauses for some tools. Prefer explicit `--sandbox workspace-write --ask-for-approval=never`. |

### Session
| Flag | Description |
|------|-------------|
| `--ephemeral` | Don't persist session files. **Required for sprint isolation.** |
| `--skip-git-repo-check` | Allow runs outside a git repo |

### Authentication
- `CODEX_API_KEY` env var — **only `codex exec` accepts it**, interactive TUI does not.
- `~/.codex/auth.json` — managed by `codex login` for interactive sessions.

### Required defaults for agent-harness
```
codex exec \
  --model <from-config> \
  --cd <workspace>/.work/<task-id> \
  --sandbox workspace-write \
  --ask-for-approval=never \
  --ephemeral \
  --output-last-message <workspace>/sprint-progress/<task-id>.md \
  - < <prompt-file>
```

---

## Auggie CLI — Removed in v0.5.0

Auggie support was dropped in v0.5.0. The previous matrix entries are
preserved in git history if you need to revive them. Configs with
`engine: "auggie"` are rejected at Phase 0.

---

## Claude Code (Agent tool) — for completeness

agent-harness on Claude Code uses the built-in `Agent` tool, not a CLI. The
relevant orchestrator-level concepts:

| Concept | Mechanism |
|---------|-----------|
| Spawn subagent | `Agent(subagent_type=..., model=..., prompt=...)` |
| Parallel teammates | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` + multiple Agent calls in one turn |
| Context budget | Subagent gets fresh context, ~200k tokens |
| Output | Returned as tool result string to orchestrator |

**Differences vs Codex:**
- No working directory flag — Agent inherits the orchestrator's cwd. Sprint
  Phase 3 already cold-starts subagents with explicit instructions about
  which workspace path to use, so this is fine.
- No file-based output — the result is text in the tool result. Phase 3
  generators are instructed to write `sprint-progress/<task-id>.md` from
  inside the subagent.

---

## Concurrency Model

Claude Code: parallelism via Agent Teams (1 turn = N subagents). Adapters do
not need to manage parallelism themselves.

Codex: each adapter call is a one-shot CLI invocation. Phase 3 spawns
each in `run_in_background: true` Bash, then `wait`s in a barrier
before Phase 4 starts. Each task MUST have its own `--cd` to avoid
collisions on the shared git index.

---

## Re-verification Checklist

When bumping any engine's pinned default model, also re-verify:

- [ ] Flag name still works (e.g. Codex once renamed `--full-auto` semantics)
- [ ] Auth env var name unchanged
- [ ] JSON event types in `--json` still match the shape
      `normalize-codex-output.mjs` expects
- [ ] Approval / sandbox flag values still cover the headless case
- [ ] Source of truth URLs above still resolve (Codex docs in particular have
      restructured multiple times)

Update this document and the adapter scripts together — they are tightly
coupled by design.
