/**
 * sync-pull.mjs
 * One-shot Notion → gbrain pull script.
 *
 * Usage:
 *   node scripts/sync-pull.mjs [--database <name>] [--dry-run]
 *
 * Flags:
 *   --database <name>   Target database: projects | todo | inbox | knowledge (default: all)
 *   --dry-run           Print what would be written without calling adapter.putPage
 *
 * Prerequisites:
 *   1. Configure .env (copy from .env.example and fill values)
 *   2. Run `bun run build` to compile TypeScript sources to dist/
 *   3. Ensure gbrain is installed globally (see RUNBOOK.md)
 */

import { config } from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env from notion-sync root
config({ path: path.join(ROOT, '.env') });

// ---------------------------------------------------------------------------
// CLI flag parsing
// ---------------------------------------------------------------------------

/**
 * Parse process.argv into a flags object.
 * Recognises --dry-run (boolean) and --database <name> (string).
 *
 * @returns {{ dryRun: boolean, database: string | null }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let database = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--database') {
      database = args[i + 1] ?? null;
      i++;
    }
  }

  return { dryRun, database };
}

// ---------------------------------------------------------------------------
// Supported databases
// ---------------------------------------------------------------------------

const SUPPORTED_DATABASES = ['projects', 'todo', 'inbox', 'knowledge'];

/**
 * Resolve which databases to sync based on the --database flag.
 *
 * @param {string | null} database
 * @returns {string[]}
 */
function resolveDatabases(database) {
  if (!database) return SUPPORTED_DATABASES;
  if (SUPPORTED_DATABASES.includes(database)) return [database];
  console.error(`[sync-pull] Unknown database "${database}". Valid: ${SUPPORTED_DATABASES.join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Lazy import of compiled TypeScript modules
// ---------------------------------------------------------------------------

/**
 * Attempt to import a compiled module from dist/.
 * If dist/ does not exist (build hasn't been run), throw a helpful error.
 * Uses pathToFileURL so Windows absolute paths work with dynamic import().
 *
 * @param {string} relPath  e.g. 'notion-client.js' (note: tsconfig flattens src/ → dist/)
 * @returns {Promise<unknown>}
 */
async function lazyImport(relPath) {
  const fullPath = path.join(ROOT, 'dist', relPath);
  try {
    return await import(pathToFileURL(fullPath).href);
  } catch {
    throw new Error(
      `Cannot import ${relPath}.\n` +
      'Run `bun run build` first to compile TypeScript sources.\n' +
      `Expected path: ${fullPath}`
    );
  }
}

// ---------------------------------------------------------------------------
// Pull logic
// ---------------------------------------------------------------------------

/**
 * Extract title plain_text from a Notion page's properties.
 * Searches for the title-type property and returns its first plain_text run.
 *
 * @param {object} page  PageObjectResponse
 * @returns {string}
 */
function extractTitle(page) {
  for (const prop of Object.values(page.properties ?? {})) {
    if (prop?.type === 'title') {
      return prop.title?.[0]?.plain_text ?? '(untitled)';
    }
  }
  return '(untitled)';
}

/**
 * Pull all pages from a single Notion database and write them to gbrain.
 *
 * @param {string}   dbName
 * @param {object}   notion     Namespace import of notion-client module
 * @param {object}   converter  Namespace import of block-converter module
 * @param {object}   adapter    Namespace import of gbrain-adapter module
 * @param {boolean}  dryRun
 * @returns {Promise<void>}
 */
async function pullDatabase(dbName, notion, converter, adapter, dryRun) {
  const dbId = process.env[`NOTION_DB_${dbName.toUpperCase()}`];
  if (!dbId) {
    console.warn(`[sync-pull] No env var NOTION_DB_${dbName.toUpperCase()} — skipping ${dbName}`);
    return;
  }

  console.log(`[sync-pull] Fetching pages from database: ${dbName}`);
  const pages = await notion.queryDatabase(dbId);
  console.log(`[sync-pull] Found ${pages.length} pages`);

  for (const page of pages) {
    const title = extractTitle(page);
    const blockResp = await notion.fetchBlockChildren(page.id);
    const markdown = converter.blocksToMarkdown(blockResp.results);

    if (dryRun) {
      const lineCount = markdown.split('\n').length;
      console.log(`[DRY-RUN] ${dbName} :: ${page.id} :: "${title}"`);
      console.log(`         markdown: ${markdown.length} chars, ${lineCount} lines`);
      const preview = markdown.split('\n').slice(0, 3).join(' / ');
      if (preview) console.log(`         preview: ${preview}`);
    } else {
      const result = await adapter.putPage({
        id: page.id,
        title,
        content: markdown,
        metadata: { source: dbName },
      });
      console.log(`[sync-pull] Wrote ${page.id}: ${result.status} (${result.chunks} chunks)`);
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const { dryRun, database } = parseArgs();
  const targets = resolveDatabases(database);

  if (dryRun) {
    console.log('[sync-pull] DRY-RUN mode — no data will be written to gbrain');
  }

  // Validate required env vars
  if (!process.env.NOTION_TOKEN) {
    console.error('[sync-pull] Missing NOTION_TOKEN in .env — see .env.example');
    process.exit(1);
  }

  // Load compiled modules (requires `bun run build` first).
  // tsconfig flattens src/ → dist/, so we import from dist/<file>.js directly.
  let notion, converter, adapter;
  try {
    [notion, converter, adapter] = await Promise.all([
      lazyImport('notion-client.js'),
      lazyImport('block-converter.js'),
      lazyImport('gbrain-adapter.js'),
    ]);
  } catch (err) {
    console.error(`[sync-pull] Module load error:\n${err.message}`);
    process.exit(1);
  }

  console.log(`[sync-pull] Starting pull for: ${targets.join(', ')}`);

  for (const dbName of targets) {
    await pullDatabase(dbName, notion, converter, adapter, dryRun);
  }

  console.log('[sync-pull] Pull complete.');
}

main().catch((err) => {
  console.error('[sync-pull] Fatal error:', err);
  process.exit(1);
});
