# Engine Flag Matrix

> **Status:** vendor-neutral reference introduced in v0.3.0. Adapter scripts
> (`adapters/run-codex.sh`, `adapters/run-auggie.sh`) and the `/sprint` Phase 3
> generator dispatcher both read from this matrix. Update here first, then the
> adapters — never hardcode flags inline.

This document is the canonical mapping between agent-harness's vendor-neutral
generator concepts (engine, model, working dir, output target, sandbox,
session) and the actual CLI flags each backend exposes.

Sources cited inline. Verified against official docs as of **2026-04-28**.
Re-verify when bumping any engine's pinned default model.

---

## At-a-glance: Concept → Flag

| Concept                | Claude Code (Agent tool) | Codex CLI (`codex exec`)     | Auggie CLI (`auggie`)            |
|------------------------|--------------------------|------------------------------|----------------------------------|
| Select model           | `subagent_type` / `model:` | `--model, -m <name>`         | `--model <name>`                 |
| Working directory      | inherited from session   | `--cd, -C <path>`            | `--workspace-root <path>`        |
| Final answer file      | (orchestrator reads result) | `--output-last-message <p>` | `--output-format json` + parse  |
| JSONL event stream     | n/a                      | `--json`                     | `--output-format json` (single envelope) |
| Structured schema      | n/a                      | `--output-schema <file>`     | n/a                              |
| Sandbox                | tool-policy enforced     | `--sandbox read-only \| workspace-write \| danger-full-access` | trust-config (no per-call flag) |
| Skip approval prompts  | n/a (orchestrator-level) | `--ask-for-approval=never` or `--full-auto` | `--print`           |
| Don't persist session  | n/a (subagent is ephemeral by definition) | `--ephemeral`                | `--dont-save-session`            |
| Resume previous run    | (re-spawn subagent)      | `codex exec resume --last`   | `--continue, -c`                 |
| Cap iterations         | n/a (subagent budget)    | n/a (effort flag)            | `--max-turns <n>`                |
| Custom rules / context | inline in prompt         | `AGENTS.md` walk             | `--rules <file>`                 |
| Auth                   | Claude Code session      | `CODEX_API_KEY` (exec only)  | `AUGMENT_SESSION_AUTH` env or `--augment-session-json <path>` |
| Image input            | embedded in prompt       | (via app-server protocol)    | `--image <file>`                 |

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

## Auggie CLI — Full Flag Reference

Authoritative source: <https://docs.augmentcode.com/cli/reference.md>,
<https://docs.augmentcode.com/cli/automation/overview.md>,
<https://docs.augmentcode.com/cli/rules>.

### Execution Modes
| Flag | Description |
|------|-------------|
| `--print, -p` | Run one instruction without UI, exit. **Required for headless.** |
| `--ask, -a` | Retrieval / non-editing mode |
| `--mcp` | Run Auggie itself as an MCP server (out of scope for agent-harness) |

### Output
| Flag | Description |
|------|-------------|
| `--quiet` | Final assistant message only (no step-by-step) |
| `--compact` | Compact streaming in print mode |
| `--output-format json` | **JSON envelope** containing final message + tool-call summary. Parsed by `normalize-auggie-output.mjs`. |
| `--show-credits` | Append credit usage summary |

### Input
| Flag | Description |
|------|-------------|
| `--instruction <text>` | Initial instruction inline |
| `--instruction-file <path>` | **Cold-start prompt from file — primary mechanism agent-harness uses.** |
| `--image <file>` | Attach images |
| `--enhance-prompt` | Run prompt enhancer before sending |

### Configuration
| Flag | Description |
|------|-------------|
| `--model <name>` | Select backend model (Auggie supports Claude, GPT, etc.) |
| `--max-turns <n>` | **Cap agentic iterations. Required for headless to prevent runaway loops.** Recommended default: 12. |
| `--rules <file>` | Append additional workspace rules |
| `--workspace-root <path>` | Workspace root (parallel-task isolation) |
| `--remove-tool <name>` | Disable a specific tool for this run |

### Session
| Flag | Description |
|------|-------------|
| `--queue` | Queue additional instructions for sequential execution |
| `--dont-save-session` | **Required for sprint isolation.** |
| `--continue, -c` | Resume most recent conversation |

### Authentication
| Method | Notes |
|--------|-------|
| `AUGMENT_SESSION_AUTH` env var | Personal session JSON. **User-bound** — does not portable across machines. Obtain via `auggie login` then `auggie token print`. |
| `--augment-session-json <path>` | Service account credentials. **Required for CI / cross-machine.** Enterprise plan only. |
| `--github-api-token <path>` or `GITHUB_API_TOKEN` env | GitHub-specific override |
| `AUGMENT_DISABLE_AUTO_UPDATE=1` | Stop CLI from auto-updating mid-CI-run |

### Required defaults for agent-harness
```
auggie \
  --print --quiet --output-format json \
  --max-turns 12 --dont-save-session \
  --workspace-root <workspace>/.work/<task-id> \
  --model <from-config> \
  --instruction-file <prompt-file> \
  > <work-dir>/raw.json
node normalize-auggie-output.mjs <work-dir>/raw.json \
  <workspace>/sprint-progress/<task-id>.md
```

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

**Differences vs Codex/Auggie:**
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

Codex / Auggie: each adapter call is a one-shot CLI invocation. Phase 3 spawns
each in `run_in_background: true` Bash, then `wait`s in a barrier before
Phase 4 starts. Each task MUST have its own `--cd` / `--workspace-root` to
avoid collisions on the shared git index.

---

## Re-verification Checklist

When bumping any engine's pinned default model, also re-verify:

- [ ] Flag name still works (e.g. Codex once renamed `--full-auto` semantics)
- [ ] Auth env var name unchanged
- [ ] JSON event types in `--json` / `--output-format json` still match the
      shape `normalize-*-output.mjs` expects
- [ ] Approval / sandbox flag values still cover the headless case
- [ ] Source of truth URLs above still resolve (Codex docs in particular have
      restructured multiple times)

Update this document and the adapter scripts together — they are tightly
coupled by design.
