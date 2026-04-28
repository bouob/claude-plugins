#!/usr/bin/env bash
# detect-host.sh — agent-harness host & backend detection (v0.3.1)
#
# Output format: one `key=value` line per detected fact, on stdout.
# Exits 0 even when nothing is detected — absence is also signal.
# All stderr noise is silenced; errors degrade to `key=0`.
#
# Keys emitted (always present, value is `1` or `0` unless noted):
#   claude_installed         claude CLI on PATH
#   codex_installed          codex CLI on PATH
#   auggie_installed         auggie CLI on PATH
#   codex_authed             $CODEX_API_KEY non-empty
#   codex_configured         ~/.codex/config.toml exists
#   auggie_authed            $AUGMENT_SESSION_AUTH non-empty
#   running_host=<name>      claude-code | codex | auggie | unknown
#   plugin_root=<path>       $CLAUDE_PLUGIN_ROOT if set, else empty
#   os=<linux|darwin|win>    coarse OS classification
#
# Consumers:
#   - commands/init.md Step 0a parses these into the table shown in Step 0b
#   - --detect-only short-circuits init after Step 0b
#
# See references/cross-host-deployment.md § Detection for the contract.

set -u   # no -e: we want partial detection even when one probe fails

emit() { printf '%s=%s\n' "$1" "$2"; }

# --- CLI installed (silent which) -------------------------------------------
emit claude_installed "$(command -v claude  >/dev/null 2>&1 && echo 1 || echo 0)"
emit codex_installed  "$(command -v codex   >/dev/null 2>&1 && echo 1 || echo 0)"
emit auggie_installed "$(command -v auggie  >/dev/null 2>&1 && echo 1 || echo 0)"

# --- Auth / configuration ---------------------------------------------------
emit codex_authed     "$([ -n "${CODEX_API_KEY:-}" ] && echo 1 || echo 0)"
emit codex_configured "$([ -f "$HOME/.codex/config.toml" ] && echo 1 || echo 0)"
emit auggie_authed    "$([ -n "${AUGMENT_SESSION_AUTH:-}" ] && echo 1 || echo 0)"

# --- Running host -----------------------------------------------------------
# Order matters: CLAUDE_PLUGIN_ROOT is the strongest signal because it's only
# set when this skill is being executed BY claude code.
running_host=unknown
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  running_host=claude-code
elif [ -n "${CODEX_HOME:-}" ] && [ -n "${CODEX_API_KEY:-}" ]; then
  # Both vars set + this script running = likely a `codex exec` task
  running_host=codex
elif [ -n "${AUGMENT_SESSION_AUTH:-}" ] && [ -z "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  # Auggie session present and not inside claude code
  running_host=auggie
fi
emit running_host "$running_host"
emit plugin_root  "${CLAUDE_PLUGIN_ROOT:-}"

# --- OS classification ------------------------------------------------------
case "$(uname -s 2>/dev/null || echo unknown)" in
  Linux*)              emit os linux ;;
  Darwin*)             emit os darwin ;;
  MINGW*|MSYS*|CYGWIN*) emit os win ;;
  *)                   emit os unknown ;;
esac

exit 0
