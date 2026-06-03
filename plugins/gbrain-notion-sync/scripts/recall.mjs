/**
 * recall.mjs
 * Keyword-search gbrain for content relevant to a query and print a compact
 * markdown digest to stdout. Designed to be called by the Claude Code
 * UserPromptSubmit hook (.claude/hooks/gbrain-recall.ps1) to inject relevant
 * memory into context on each prompt.
 *
 * Usage:
 *   bun scripts/recall.mjs "<query>" [--limit N]
 *
 * Runs under `bun`. Loads .env from notion-sync root for GBRAIN_HTTP_URL / TOKEN.
 *
 * FAIL-OPEN CONTRACT: this script must NEVER block or noise a user prompt.
 * Any condition — no HTTP server, timeout, no hits, build missing, empty query —
 * results in exit 0 with NO stdout. Diagnostics go to stderr only.
 */

import { config } from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env from notion-sync root (GBRAIN_HTTP_URL / GBRAIN_HTTP_TOKEN).
config({ path: path.join(ROOT, '.env') });

const TIMEOUT_MS = 1800; // hard cap so a hung gbrain server never stalls a prompt
const SNIPPET_LEN = 280;
const DEFAULT_LIMIT = 3;

/**
 * Parse argv into { query, limit }. Everything that is not --limit <n> is
 * treated as part of the free-text query.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let limit = DEFAULT_LIMIT;
  const queryParts = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') {
      limit = Number(args[i + 1]) || DEFAULT_LIMIT;
      i++;
    } else {
      queryParts.push(args[i]);
    }
  }
  return { query: queryParts.join(' ').trim(), limit };
}

async function lazyImport(relPath) {
  const fullPath = path.join(ROOT, 'dist', relPath);
  return import(pathToFileURL(fullPath).href);
}

function snippet(text) {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > SNIPPET_LEN ? flat.slice(0, SNIPPET_LEN) + '…' : flat;
}

async function main() {
  const { query, limit } = parseArgs();
  if (!query) return; // nothing to recall

  const adapter = await lazyImport('gbrain-adapter.js');

  // adapter.recall throws synchronously when HTTP mode is unconfigured, and
  // rejects on network errors — both are caught by main().catch (fail-open).
  const hits = await Promise.race([
    adapter.recall(query, limit),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('recall timeout')), TIMEOUT_MS),
    ),
  ]);

  if (!Array.isArray(hits) || hits.length === 0) return;

  const lines = [`<gbrain-recall query="${query.replace(/"/g, "'")}">`];
  hits.forEach((h, i) => {
    lines.push(`${i + 1}. ${h.title} — ${snippet(h.chunk_text)}`);
  });
  lines.push('</gbrain-recall>');
  process.stdout.write(lines.join('\n') + '\n');
}

main().catch((err) => {
  // FAIL-OPEN: never block a prompt. Log to stderr, exit 0 with no stdout.
  process.stderr.write(`[recall] skipped: ${err?.message ?? err}\n`);
  process.exit(0);
});
