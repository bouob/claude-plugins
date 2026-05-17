#!/usr/bin/env bash
# smoke.sh — Smoke test skeleton for notion-sync
#
# These are structural placeholders. Run after `bun run build` and
# after configuring .env with real credentials.
#
# Usage:
#   bash tests/smoke.sh
#
# Exit codes:
#   0  All tests passed
#   1  One or more tests failed

set -euo pipefail

PASS=0
FAIL=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

ok() {
  echo "  PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "  FAIL: $1"
  FAIL=$((FAIL + 1))
}

section() {
  echo ""
  echo "=== $1 ==="
}

# ---------------------------------------------------------------------------
# TEST: adapter round-trip (putPage / getPage)
# ---------------------------------------------------------------------------

section "adapter round-trip"

echo "TEST: adapter.putPage / getPage round-trip"
# TODO: implement once gbrain is installed
# Expected sequence:
#   1. adapter.putPage({ id: "smoke-test-001", title: "Smoke Test", content: "# Hello" })
#   2. adapter.getPage("smoke-test-001") → assert title === "Smoke Test"
#   3. adapter.deletePage("smoke-test-001") → cleanup
if false; then
  node --input-type=module <<'EOF'
    import { GbrainAdapter } from '../dist/src/gbrain-adapter.js';
    const adapter = new GbrainAdapter();
    const page = { id: 'smoke-test-001', title: 'Smoke Test', content: '# Hello', source: 'test' };
    await adapter.putPage(page);
    const fetched = await adapter.getPage('smoke-test-001');
    if (fetched.title !== 'Smoke Test') throw new Error('Title mismatch');
    await adapter.deletePage('smoke-test-001');
    console.log('adapter round-trip OK');
EOF
  ok "adapter.putPage → getPage → deletePage round-trip"
else
  echo "  SKIP: adapter round-trip (gbrain not installed — see RUNBOOK.md)"
fi

echo "TEST: adapter.listPages returns array"
if false; then
  node --input-type=module <<'EOF'
    import { GbrainAdapter } from '../dist/src/gbrain-adapter.js';
    const adapter = new GbrainAdapter();
    const pages = await adapter.listPages();
    if (!Array.isArray(pages)) throw new Error('Expected array');
    console.log(`listPages returned ${pages.length} pages`);
EOF
  ok "adapter.listPages returns array"
else
  echo "  SKIP: adapter.listPages (gbrain not installed)"
fi

# ---------------------------------------------------------------------------
# TEST: block-converter round-trip
# ---------------------------------------------------------------------------

section "block-converter round-trip"

echo "TEST: block-converter paragraph conversion"
if [ -f "$ROOT/dist/src/block-converter.js" ]; then
  result=$(node --input-type=module <<'EOF'
    import { BlockConverter } from '../dist/src/block-converter.js';
    const converter = new BlockConverter();
    const blocks = [
      { type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Hello world' }] } }
    ];
    const md = converter.convert(blocks);
    if (!md.includes('Hello world')) throw new Error('paragraph not in output');
    process.stdout.write('OK');
EOF
  )
  if [ "$result" = "OK" ]; then
    ok "block-converter paragraph → markdown"
  else
    fail "block-converter paragraph → markdown"
  fi
else
  echo "  SKIP: block-converter paragraph (dist/ not found — run bun run build)"
fi

echo "TEST: block-converter heading conversion"
if [ -f "$ROOT/dist/src/block-converter.js" ]; then
  result=$(node --input-type=module <<'EOF'
    import { BlockConverter } from '../dist/src/block-converter.js';
    const converter = new BlockConverter();
    const blocks = [
      { type: 'heading_1', heading_1: { rich_text: [{ plain_text: 'My Heading' }] } }
    ];
    const md = converter.convert(blocks);
    if (!md.includes('# My Heading')) throw new Error('heading not in output');
    process.stdout.write('OK');
EOF
  )
  if [ "$result" = "OK" ]; then
    ok "block-converter heading_1 → # markdown"
  else
    fail "block-converter heading_1 → # markdown"
  fi
else
  echo "  SKIP: block-converter heading (dist/ not found)"
fi

echo "TEST: block-converter code block conversion"
if [ -f "$ROOT/dist/src/block-converter.js" ]; then
  result=$(node --input-type=module <<'EOF'
    import { BlockConverter } from '../dist/src/block-converter.js';
    const converter = new BlockConverter();
    const blocks = [
      { type: 'code', code: { language: 'javascript', rich_text: [{ plain_text: 'console.log(1)' }] } }
    ];
    const md = converter.convert(blocks);
    if (!md.includes('```')) throw new Error('code fences not in output');
    process.stdout.write('OK');
EOF
  )
  if [ "$result" = "OK" ]; then
    ok "block-converter code → fenced markdown"
  else
    fail "block-converter code → fenced markdown"
  fi
else
  echo "  SKIP: block-converter code (dist/ not found)"
fi

# ---------------------------------------------------------------------------
# TEST: sync-pull.mjs --dry-run (no Notion token needed for arg parsing)
# ---------------------------------------------------------------------------

section "sync-pull.mjs CLI smoke"

echo "TEST: sync-pull.mjs --dry-run exits with missing NOTION_TOKEN"
NOTION_TOKEN="" node "$ROOT/scripts/sync-pull.mjs" --dry-run 2>&1 | grep -q "Missing NOTION_TOKEN" \
  && ok "sync-pull.mjs detects missing NOTION_TOKEN" \
  || fail "sync-pull.mjs should exit on missing NOTION_TOKEN"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "==============================="
echo "Results: $PASS passed, $FAIL failed"
echo "==============================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
