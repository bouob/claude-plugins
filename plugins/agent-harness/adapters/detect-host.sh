#!/usr/bin/env bash
# detect-host.sh — agent-harness host & backend detection (v0.4.0)
#
# Output format: one `key=value` line per detected fact, on stdout.
# Exits 0 unconditionally — absence is itself signal.
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
#   parent_proc=<name>       parent process name (used by host inference)
#   plugin_root=<path>       $CLAUDE_PLUGIN_ROOT if set, else empty
#   os=<linux|darwin|win>    coarse OS classification
#
# Heuristic for running_host (v0.4.0):
#   1. CLAUDE_PLUGIN_ROOT set         → claude-code (definitive)
#   2. parent process name matches    → codex / auggie
#   3. else                           → unknown (init Step 0b stops to ask)
#
# Consumers:
#   - commands/init.md Step 0a parses these into the table shown in Step 0b
#   - --detect-only short-circuits init after Step 0b
#
# See references/cross-host-deployment.md § Detection for the contract.

set -u

emit() { printf '%s=%s\n' "$1" "$2"; }

# --- CLI installed (silent which) -------------------------------------------
emit claude_installed "$(command -v claude  >/dev/null 2>&1 && echo 1 || echo 0)"
emit codex_installed  "$(command -v codex   >/dev/null 2>&1 && echo 1 || echo 0)"
emit auggie_installed "$(command -v auggie  >/dev/null 2>&1 && echo 1 || echo 0)"

# --- Auth / configuration ---------------------------------------------------
emit codex_authed     "$([ -n "${CODEX_API_KEY:-}" ] && echo 1 || echo 0)"
emit codex_configured "$([ -f "$HOME/.codex/config.toml" ] && echo 1 || echo 0)"
emit auggie_authed    "$([ -n "${AUGMENT_SESSION_AUTH:-}" ] && echo 1 || echo 0)"

# --- Parent process name (host inference heuristic) -------------------------
parent_proc=""
if [ -n "${PPID:-}" ]; then
  # `ps -o comm=` prints just the command name without args. Works on
  # Linux/macOS/Git Bash. Trim whitespace.
  parent_proc=$(ps -o comm= -p "$PPID" 2>/dev/null | tr -d ' \n\r' | head -c 64)
fi
emit parent_proc "${parent_proc:-unknown}"

# --- Running host -----------------------------------------------------------
running_host=unknown
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  running_host=claude-code
else
  # Match parent process name against known CLIs. Substring match because
  # parent_proc may be `node` or full path on some shells.
  case "$parent_proc" in
    *codex*)  running_host=codex ;;
    *auggie*) running_host=auggie ;;
    *claude*) running_host=claude-code ;;
  esac
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
