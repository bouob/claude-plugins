/**
 * capture.mjs
 * Capture a piece of knowledge learned during an agent session into the gbrain
 * knowledge graph as a new knowledge-base note. Body markdown is read from stdin;
 * metadata comes from flags.
 *
 * Usage:
 *   bun scripts/capture.mjs --title "標題" [--category 技術] [--status 精華] \
 *     [--tags "a,b"] [--summary "一句話"] <<'EOF'
 *   <markdown body>
 *   EOF
 *
 * Writes a gbrain page WITHOUT notion_page_id so the next `push` classifies it as
 * `created` and creates a matching page in the Notion 知識庫 (plan.md ADR 2.8, §4.4).
 * source frontmatter MUST be `knowledge` (or `inbox`) or push will skip it.
 *
 * Runs under bun. Routes through HTTP MCP when GBRAIN_HTTP_URL/TOKEN are set.
 */

import { config } from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
config({ path: path.join(ROOT, '.env') });

// Mirrors Notion 知識庫 「類別」 select options (plan.md §4.4).
const KNOWLEDGE_CATEGORIES = ['技術', '工具', '職涯', '生活', '投資'];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { title: null, category: '技術', status: '精華', tags: [], summary: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--title') opts.title = args[++i] ?? null;
    else if (a === '--category') opts.category = args[++i] ?? '技術';
    else if (a === '--status') opts.status = args[++i] ?? '精華';
    else if (a === '--tags') opts.tags = (args[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--summary') opts.summary = args[++i] ?? null;
  }
  return opts;
}

async function lazyImport(relPath) {
  const fullPath = path.join(ROOT, 'dist', relPath);
  return import(pathToFileURL(fullPath).href);
}

/** Build a filesystem-safe slug fragment from a title (CJK preserved). */
function slugify(title) {
  return title.trim().replace(/\s+/g, '-').replace(/[/\\:*?"<>|]/g, '').slice(0, 80);
}

function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').trim();
}

/** Compose verbatim markdown (frontmatter + body) for putRawPage. No notion_page_id. */
function buildContent(opts, body) {
  const fm = [
    '---',
    `title: ${JSON.stringify(opts.title)}`,
    'source: knowledge',
    `category: ${JSON.stringify(opts.category)}`,
    `status: ${JSON.stringify(opts.status)}`,
    `saved_at: ${isoDate()}`,
    'origin: claude-session',
  ];
  if (opts.tags.length) fm.push(`tags: ${JSON.stringify(opts.tags)}`);
  if (opts.summary) fm.push(`summary: ${JSON.stringify(opts.summary)}`);
  fm.push('---', '');
  return fm.join('\n') + body + '\n';
}

async function main() {
  const opts = parseArgs();
  if (!opts.title) {
    console.error('[capture] --title is required');
    process.exit(1);
  }
  if (!KNOWLEDGE_CATEGORIES.includes(opts.category)) {
    console.error(`[capture] --category must be one of: ${KNOWLEDGE_CATEGORIES.join(' / ')}`);
    process.exit(1);
  }
  if (process.stdin.isTTY) {
    console.error('[capture] pipe the note markdown via stdin (e.g. a heredoc). Nothing was written.');
    process.exit(1);
  }

  const body = await readStdin();
  if (!body) {
    console.error('[capture] empty stdin body. Nothing was written.');
    process.exit(1);
  }

  const slug = `knowledge/${opts.category}/${slugify(opts.title)}`;
  const fullContent = buildContent(opts, body);

  const adapter = await lazyImport('gbrain-adapter.js');
  const result = await adapter.putRawPage(slug, fullContent);
  console.log(
    `[capture] wrote ${result.slug} (${result.chunks ?? '?'} chunks). ` +
      'Next `bun run push` will create it in Notion 知識庫.',
  );
}

main().catch((err) => {
  console.error(`[capture] failed: ${err?.message ?? err}`);
  process.exit(1);
});
