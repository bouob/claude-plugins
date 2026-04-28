# Cross-Host Deployment

> **Status:** vendor-neutral reference introduced in v0.3.0. Defines what
> "host" means for agent-harness, how `init` detects and deploys for each
> host, and which features degrade across environments.

This document is the contract between `commands/init.md` (the wizard) and the
host environments agent-harness supports. Every supported / degraded /
unsupported feature is enumerated here so the wizard can give honest answers
during Step 0e (final confirmation).

Sources verified **2026-04-28**. Re-check when any host CLI ships a major
release that changes its instruction-file discovery rules.

---

## Definitions

- **Host** — the CLI / runtime the user invokes when they want to *start* an
  agent-harness flow. This is the "first-class" environment for the run.
- **Backend** — the engine a single Generator task uses (set per task in
  `sprint-plan.md`). Independent of host: Claude Code orchestrator can spawn
  Codex Generator tasks; Codex orchestrator can also spawn Codex Generator
  tasks (sequentially, no Agent Teams).
- **Deployment target** — a host other than the primary that the user wants
  agent-harness to remain *callable* from. Drives which entry-point files
  init writes (`AGENTS.md`, `.codex/skills/` symlink).

---

## Supported Hosts (v0.3.0 baseline → v0.6.0 target)

| Host        | First-class? | Spawn parallelism      | Hooks supported | Cold-start mechanism                          | Status by version |
|-------------|--------------|------------------------|-----------------|-----------------------------------------------|--------------------|
| Claude Code | Yes          | Agent Teams            | Yes             | Skill `/sprint` reads SKILL.md                | v0.2.0+ stable     |
| Codex CLI   | v0.6.0       | Sequential only        | No              | `~/.codex/skills/sprint/SKILL.md` + AGENTS.md | v0.6.0 target      |
| IDE (Cursor / Copilot / Windsurf / Amp / Devin) | No (third-class) | Manual            | No              | AGENTS.md (read-only reference)                | v0.5.1 target     |

> **v0.5.0 dropped Auggie CLI support.** Reason: Auggie's main agent
> ignored `.augment/rules/*.md` constraints when calling MCP tools
> (e.g. still creating Jira / Confluence docs against deny lists), and
> the available `toolPermissions` deny mechanism in
> `~/.augment/settings.json` proved too coarse for sprint-level
> isolation. Configs with `engine: "auggie"` from v0.4.x are rejected
> at Phase 0; users must re-run `/agent-harness:init`.

A "first-class" host gets full sprint pipeline support: Planner →
parallel Generators → Evaluator → 3-iteration retry loop. Anything less is
documented as a degradation in the table below.

---

## Degradation Matrix

What works, what doesn't, in each host:

| Feature                               | Claude Code | Codex CLI | IDE (AGENTS.md) |
|---------------------------------------|:-----------:|:---------:|:---------------:|
| `/sprint` 6-phase pipeline             | ✓ | ✓ (degraded) | partial (manual) |
| Planner subagent isolation             | ✓ | ✓ (sequential) | — |
| Parallel Generators                    | ✓ Agent Teams | ✗ sequential | ✗ |
| Skeptical Evaluator (separate context) | ✓ | ✓ (new `codex exec`) | partial |
| PreToolUse hooks (block during sprint) | ✓ | ✗ | ✗ |
| AskUserQuestion (interactive wizard)   | ✓ | ✗ | ✗ |
| Cross-engine generator routing         | ✓ codex via Bash | partial | ✗ |
| `--detect-only` env probe              | ✓ | ✓ | ✓ |
| `.sprint/` artifacts produced          | ✓ | ✓ | ✓ |

**Degraded but functional** is acceptable for v0.6.0. The user gets sequential
Generators and no hook-level safeguards — they are warned of both during
Step 0e of init.

---

## Native Instruction-File Discovery (verified 2026-04-28)

Each host has its own rules for which files it auto-loads at session start.
agent-harness does not fight these rules — instead it deploys the right file
in the right place per host.

| Host        | Auto-loaded files (in priority order) | Hierarchical (cwd → parents)? | Notes |
|-------------|----------------------------------------|-------------------------------|-------|
| Claude Code | `CLAUDE.md` | Yes | Does NOT auto-load `AGENTS.md` (open feature request as of 2026-03). Use `@AGENTS.md` from CLAUDE.md to bridge. |
| Codex CLI   | `~/.codex/AGENTS.override.md` → `~/.codex/AGENTS.md` → project-walk `AGENTS.override.md` / `AGENTS.md` / `project_doc_fallback_filenames` | Yes (Git root → cwd, 1 file/dir, 32 KiB cap) | `CLAUDE.md` only loaded if added to `project_doc_fallback_filenames` |
| Cursor / Copilot / Windsurf / Amp / Devin | `AGENTS.md` | Varies | AGENTS.md is the cross-tool standard |

### Implications for agent-harness deployment

- **AGENTS.md is the maximum common factor.** Codex requires it;
  Cursor / Copilot / Windsurf / Amp / Devin read it; Claude Code can
  be made to via `@AGENTS.md`. The `templates/AGENTS.md.tpl` (v0.5.1)
  is the linchpin of cross-host support.
- **Skills do NOT cross hosts natively.** Codex reads `~/.codex/skills/`
  and `.codex/skills/`, NOT `.claude/skills/`. To make a single
  SKILL.md available everywhere, init Step 5 deploys a symlink (or
  copy on Windows non-admin):
  - `.codex/skills/sprint` → plugin's `skills/sprint/`
- **Hooks do NOT cross hosts at all.** PreToolUse / PostToolUse / Stop
  are Claude Code-only. Codex has no equivalent. Cross-host runs rely
  on:
  - Codex `--sandbox workspace-write` to bound damage radius
  - Static reminders embedded in AGENTS.md

---

## Detection (`init` Step 0a — see `commands/init.md`)

The wizard detects three orthogonal facts before asking anything:

### CLI installed
```
which claude    → claude_installed=1
which codex     → codex_installed=1
```

### Authenticated / configured
```
[ -n "$CODEX_API_KEY" ]                 → codex_authed=1
[ -f ~/.codex/config.toml ]             → codex_configured=1
```

### Currently running here
```
[ -n "$CLAUDE_PLUGIN_ROOT" ]            → running_host=claude-code
# Codex equivalent vars: not exposed publicly (verified 2026-04-28);
# fallback to parent_proc heuristic (see detect-host.sh)
```

`detect-host.sh` (POSIX) and `detect-host.ps1` (Windows) emit these as
`key=value` lines on stdout. Step 0b parses them into a table the user sees;
Step 0c-0d uses the values as preselects in `AskUserQuestion` prompts.

---

## Deployment (init Step 5)

For each deployment target the user confirms in Step 0d:

### `agents-md`
- Render `templates/AGENTS.md.tpl` to `<workspace-root>/AGENTS.md`.
- If file already exists: ask **append agent-harness section / skip / overwrite**
  (default: append). The renderer wraps content in delimiter markers so re-runs
  can update just the agent-harness section without touching user content.
- Refuse to write if rendered template > 32 KiB (Codex's `project_doc_max_bytes`
  default cap) — print a warning and suggest splitting via `@-includes`.

### `codex-skills-symlink`
- `ln -s <plugin-root>/skills/sprint <workspace-root>/.codex/skills/sprint`
  (POSIX) or PowerShell `New-Item -ItemType SymbolicLink` (Windows admin) or
  `cp -r` fallback (Windows non-admin) with a `.copy-marker` file noting that
  next plugin update requires re-running init.

### `codex-config-patch`
- Print `templates/codex-config-patch.toml` verbatim with instructions to
  paste into `~/.codex/config.toml`. **Never auto-modify global config files.**

---

## Config Path by Host

The wizard writes its primary config to a host-aware path:

| host         | config path                          | `--detect-only` reads from |
|--------------|--------------------------------------|----------------------------|
| claude-code  | `~/.claude/agent-harness.json`        | same                       |
| codex        | `~/.codex/agent-harness.json` (v0.6.0) | same                       |
| multi-host   | All applicable paths above; same JSON content; first file written wins canonical-path note in others | first existing path |

Per-project overrides remain at `./.claude/agent-harness.local.json` regardless
of host (the `.claude/*.local.json` gitignore pattern is the most widely
honored convention).

---

## Risk Register Surfaced to Users (Step 0e)

When init reaches Step 0e and the user has selected one or more cross-host
deploys, the wizard MUST surface these in the final confirmation:

1. **Codex 32 KiB AGENTS.md cap** — if rendered template approaches it,
   suggest `project_doc_max_bytes = 65536`.
2. **Codex doesn't auto-load `.claude/skills/`** — explain symlink rationale.
3. **Hooks are Claude Code-only** — sprint runs from the Codex host
   cannot block destructive bash commands the way Claude Code can.
4. **Sequential degradation** — the Codex host runs `parallel_batch`
   sequentially; sprint duration scales linearly with task count.
6. **AGENTS.md merge conflicts** — if user already has an AGENTS.md (e.g.
   company-mandated), init defaults to append-with-markers, never overwrite.

---

## See Also

- `commands/init.md` — Step 0 detection + Step 5 deployment implementation
- `engine-flag-matrix.md` — exact CLI flags per backend
- `sprint-contract.schema.md` — artifacts every host must produce / consume
- Top-level `README.md` § Multi-Host Roadmap — user-facing version timeline
