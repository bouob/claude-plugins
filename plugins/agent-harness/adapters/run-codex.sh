#!/usr/bin/env bash
# run-codex.sh — Codex CLI generator backend wrapper (v0.4.x)
#
# STATUS: STUB. Full implementation lands in v0.4.1.
#
# Planned signature:
#   run-codex.sh <task-id> <workspace> <model> <prompt-file>
# Behaviour:
#   - mkdir <workspace>/.work/<task-id>/
#   - codex exec --model <model> --cd <work-dir> \
#       --full-auto --ephemeral --ask-for-approval=never \
#       --output-last-message <workspace>/sprint-progress/<task-id>.md \
#       - < <prompt-file>
#
# Auth: requires CODEX_API_KEY env var. Validated by Step 0a.
# See references/engine-flag-matrix.md for the full Codex flag matrix.

echo "run-codex.sh stub — implemented in v0.4.1" >&2
exit 64
