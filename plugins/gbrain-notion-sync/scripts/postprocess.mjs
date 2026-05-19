/**
 * postprocess.mjs
 * Run gbrain maintenance after a sync (or batch of syncs).
 *
 * Steps (in order, each step's failure does not block the next):
 *   1. gbrain extract links --source db      — rebuild backlink graph
 *   2. gbrain dream --dry-run --dir <brain>  — doc consolidation + timeline
 *   3. (only if OPENAI_API_KEY set)
 *      gbrain embed --stale                  — refresh vector index
 *
 * Brain dir resolution: GBRAIN_DIR env var > ~/.gbrain (gbrain default).
 *
 * Exit codes:
 *   0 — all attempted steps succeeded
 *   1 — at least one step failed (partial success)
 *   2 — fatal error (e.g. gbrain binary not in PATH)
 */

import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

config({ path: path.join(ROOT, '.env') });

const BRAIN_DIR = process.env.GBRAIN_DIR || path.join(os.homedir(), '.gbrain');

/**
 * Run a gbrain sub-command synchronously and report outcome.
 *
 * @param {string}   label  Human label for log output
 * @param {string[]} args   Arguments after the `gbrain` binary name
 * @returns {{ ok: boolean, code: number | null, signal: string | null }}
 */
function runGbrain(label, args) {
  console.log(`\n[postprocess] ${label}`);
  console.log(`[postprocess] $ gbrain ${args.join(' ')}`);

  const result = spawnSync('gbrain', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(`[postprocess] FATAL: cannot invoke gbrain — ${result.error.message}`);
    console.error('[postprocess] Is gbrain installed and on PATH? See RUNBOOK.md Step 1.');
    process.exit(2);
  }

  const ok = result.status === 0;
  console.log(`[postprocess] ${label} ${ok ? 'OK' : 'FAILED (exit ' + result.status + ')'}`);
  return { ok, code: result.status, signal: result.signal };
}

function main() {
  console.log('[postprocess] gbrain post-sync maintenance');

  const summary = [];

  summary.push({
    step: 'extract links',
    ...runGbrain('Step 1 — Rebuild backlink graph', ['extract', 'links', '--source', 'db']),
  });

  summary.push({
    step: 'dream',
    ...runGbrain('Step 2 — Doc consolidation + timeline (dry-run)', ['dream', '--dry-run', '--dir', BRAIN_DIR]),
  });

  if (process.env.OPENAI_API_KEY) {
    summary.push({
      step: 'embed',
      ...runGbrain('Step 3 — Refresh stale embeddings', ['embed', '--stale']),
    });
  } else {
    console.log('\n[postprocess] Step 3 — Skipped (OPENAI_API_KEY not set).');
    console.log('[postprocess] Set OPENAI_API_KEY in .env to enable vector search.');
  }

  console.log('\n[postprocess] Summary:');
  for (const s of summary) {
    console.log(`  ${s.ok ? 'OK    ' : 'FAILED'}  ${s.step}`);
  }

  const failed = summary.filter((s) => !s.ok).length;
  process.exit(failed === 0 ? 0 : 1);
}

main();
