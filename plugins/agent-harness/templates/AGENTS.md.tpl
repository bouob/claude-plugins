# AGENTS.md.tpl — Cross-tool sprint entry point template (v0.5.x)
#
# STATUS: STUB. Full template lands in v0.5.1.
#
# Purpose:
#   Self-contained sprint procedure that any AGENTS.md-aware tool
#   (Codex CLI, Cursor, GitHub Copilot, Windsurf, Amp, Devin) can read
#   without depending on `.claude/` or plugin-internal paths.
#
# Why self-contained:
#   - Codex caps AGENTS.md at 32 KiB by default (project_doc_max_bytes)
#   - Tools other than Claude Code do not see ${CLAUDE_PLUGIN_ROOT}
#   - Template MUST embed the sprint contract schema verbatim, not @-link to it
#
# Rendering rule (init Step 4):
#   Substitute ${AGENT_HARNESS_VERSION}, ${AGENT_HARNESS_REPO}, ${HOST}
#   then write to <workspace-root>/AGENTS.md (or merge with existing).

# stub — see commands/init.md Step 5 (v0.5.1) for renderer
