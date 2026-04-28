#!/usr/bin/env bash
# run-auggie.sh — Auggie CLI generator backend wrapper (v0.5.x)
#
# STATUS: STUB. Full implementation lands in v0.5.0.
#
# Planned signature:
#   run-auggie.sh <task-id> <workspace> <model> <prompt-file>
# Behaviour:
#   - mkdir <workspace>/.work/<task-id>/
#   - auggie --print --quiet --output-format json \
#       --max-turns 12 --dont-save-session \
#       --workspace-root <work-dir> --model <model> \
#       --instruction-file <prompt-file> > <work-dir>/raw.json
#   - node normalize-auggie-output.mjs <work-dir>/raw.json \
#       <workspace>/sprint-progress/<task-id>.md
#
# Auth: requires AUGMENT_SESSION_AUTH or --augment-session-json.
# See references/engine-flag-matrix.md for the full Auggie flag matrix.

echo "run-auggie.sh stub — implemented in v0.5.0" >&2
exit 64
