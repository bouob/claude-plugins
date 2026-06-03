/**
 * sync.mjs
 * Bidirectional Notion <-> gbrain reconcile engine (Phase 2).
 *
 * Usage:
 *   bun scripts/sync.mjs [--database <name>] [--dry-run]
 *
 * Runs under `bun` (loads sync-state.js -> bun:sqlite).
 *
 * For every gbrain page it classifies the change into one of four quadrants
 * (skip / to_notion / to_brain / conflict) by comparing the current Notion
 * and gbrain state against the sync-state baseline, then acts. Agent-created
 * gbrain pages (no notion_page_id) are created in Notion.
 *
 * Conflict policy: Notion wins. The local version is backed up to .conflict/
 * and a comment is posted on the Notion page. See plan.md §2.4.
 */

import { config } from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
config({ path: path.join(ROOT, '.env') });

const SUPPORTED_DATABASES = ['projects', 'todo', 'inbox', 'knowledge'];
/** Databases an agent-created page is allowed to be routed into. */
const CREATABLE_DATABASES = ['inbox', 'knowledge'];

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let database = null;
  let conflicts = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--conflicts') conflicts = true;
    else if (args[i] === '--database') {
      database = args[i + 1] ?? null;
      i++;
    }
  }
  return { dryRun, database, conflicts };
}

/** Append-only conflict audit trail, shared across runs/machines. */
function appendAuditLog(entry) {
  const dir = path.join(os.homedir(), '.notion-sync');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(
    path.join(dir, 'conflicts.jsonl'),
    JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n',
    'utf8',
  );
}

/** `--conflicts`: list unresolved conflicts from sync-state and exit. */
async function listConflicts() {
  const syncStateMod = await lazyImport('sync-state.js');
  const syncState = syncStateMod.openSyncState(path.join(ROOT, 'sync-state.db'));
  const open = syncState.openConflicts();
  syncState.close();
  if (open.length === 0) {
    console.log('[sync] No unresolved conflicts.');
    return;
  }
  console.log(`[sync] ${open.length} unresolved conflict(s):`);
  for (const c of open) {
    console.log(`  #${c.id}  ${c.local_slug}`);
    console.log(`      detected: ${c.detected_at}`);
    console.log(`      backup:   ${c.backup_path}`);
  }
}

function resolveDatabases(database) {
  if (!database) return SUPPORTED_DATABASES;
  if (SUPPORTED_DATABASES.includes(database)) return [database];
  console.error(`[sync] Unknown database "${database}". Valid: ${SUPPORTED_DATABASES.join(', ')}`);
  process.exit(1);
}

async function lazyImport(relPath) {
  const fullPath = path.join(ROOT, 'dist', relPath);
  try {
    return await import(pathToFileURL(fullPath).href);
  } catch {
    throw new Error(
      `Cannot import ${relPath}. Run \`bun run build\` first.\nExpected: ${fullPath}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Extract the title plain_text from a Notion page's properties. */
function extractTitle(page) {
  for (const prop of Object.values(page.properties ?? {})) {
    if (prop?.type === 'title') {
      return prop.title?.[0]?.plain_text ?? '(untitled)';
    }
  }
  return '(untitled)';
}

/** First markdown H1 of a body, or null. */
function firstH1(body) {
  for (const line of body.split('\n')) {
    const m = line.match(/^#\s+(.+)$/);
    if (m) return m[1].trim();
  }
  return null;
}

/** Timestamp safe for filenames. */
function fileStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/** Write a .conflict/ backup file and return its path. */
function backupLocal(detail, slug, kind) {
  const dir = path.join(ROOT, '.conflict');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slug}--${kind}-${fileStamp()}.md`);
  const full = `---\n${detail.frontmatterRaw}\n---\n\n${detail.body}`;
  fs.writeFileSync(file, full, 'utf8');
  return file;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { dryRun, database, conflicts } = parseArgs();

  if (conflicts) {
    await listConflicts();
    return;
  }

  const targets = resolveDatabases(database);

  if (!process.env.NOTION_TOKEN) {
    console.error('[sync] Missing NOTION_TOKEN in .env');
    process.exit(1);
  }

  let notion, adapter, converter, mdToNotion, props, schemaMod, syncStateMod;
  try {
    [notion, adapter, converter, mdToNotion, props, schemaMod, syncStateMod] =
      await Promise.all([
        lazyImport('notion-client.js'),
        lazyImport('gbrain-adapter.js'),
        lazyImport('block-converter.js'),
        lazyImport('markdown-to-notion.js'),
        lazyImport('notion-properties.js'),
        lazyImport('notion-schema.js'),
        lazyImport('sync-state.js'),
      ]);
  } catch (err) {
    console.error(`[sync] Module load error:\n${err.message}`);
    process.exit(1);
  }

  console.log(
    `[sync] ${dryRun ? 'DRY-RUN — ' : ''}reconciling: ${targets.join(', ')}`,
  );

  // 1. Fetch live Notion state + schemas for target databases.
  const notionById = new Map(); // page_id -> { dbName, page }
  const schemas = {}; // dbName -> DbSchema
  const dbIds = {}; // dbName -> database UUID
  for (const dbName of targets) {
    const dbId = process.env[`NOTION_DB_${dbName.toUpperCase()}`];
    if (!dbId) {
      console.warn(`[sync] No NOTION_DB_${dbName.toUpperCase()} — skipping ${dbName}`);
      continue;
    }
    dbIds[dbName] = dbId;
    schemas[dbName] = await schemaMod.fetchDbSchema(dbId);
    const pages = await notion.queryDatabase(dbId);
    for (const p of pages) notionById.set(p.id, { dbName, page: p });
    console.log(`[sync] Notion ${dbName}: ${pages.length} pages`);
  }

  // 2. List gbrain pages.
  const gbrainPages = await adapter.listPages();
  console.log(`[sync] gbrain: ${gbrainPages.length} pages`);

  const syncState = syncStateMod.openSyncState(path.join(ROOT, 'sync-state.db'));
  const stats = { skip: 0, to_notion: 0, to_brain: 0, conflict: 0, created: 0, warn: 0, error: 0 };

  const ctx = { notion, adapter, converter, mdToNotion, props, syncState, schemas, dbIds, notionById, stats, dryRun };

  // 3. Reconcile each gbrain page.
  for (const gp of gbrainPages) {
    try {
      const detail = await adapter.getPage(gp.slug);
      const fm = detail.frontmatter;
      const dbName = typeof fm.source === 'string' ? fm.source : null;
      if (!dbName || !targets.includes(dbName)) continue; // not a target PAI page

      const notionPageId =
        typeof fm.notion_page_id === 'string' ? fm.notion_page_id : null;

      if (!notionPageId) {
        await handleNewPage(ctx, gp.slug, detail, dbName);
      } else {
        await reconcilePage(ctx, gp.slug, detail, dbName, notionPageId);
      }
    } catch (err) {
      stats.error++;
      console.error(`[sync] ERROR on ${gp.slug}: ${err.message}`);
    }
  }

  syncState.close();
  console.log(
    `[sync] Done. skip=${stats.skip} to_notion=${stats.to_notion} ` +
      `to_brain=${stats.to_brain} conflict=${stats.conflict} created=${stats.created} ` +
      `warn=${stats.warn} error=${stats.error}`,
  );
}

// ---------------------------------------------------------------------------
// New page creation (agent-authored gbrain page -> new Notion page)
// ---------------------------------------------------------------------------

async function handleNewPage(ctx, slug, detail, dbName) {
  const { notion, adapter, mdToNotion, props, syncState, schemas, dbIds, stats, dryRun } = ctx;

  if (!CREATABLE_DATABASES.includes(dbName)) {
    stats.warn++;
    console.warn(
      `[sync] WARN new page ${slug} skipped — notion_database must be ` +
        `inbox|knowledge, got "${dbName}"`,
    );
    return;
  }
  const title =
    (typeof detail.frontmatter.title === 'string' && detail.frontmatter.title) ||
    firstH1(detail.body);
  if (!title) {
    stats.error++;
    console.error(`[sync] ERROR new page ${slug} skipped — no title (frontmatter or H1)`);
    return;
  }

  const schema = schemas[dbName];
  const { properties, skipped } = props.toNotionProperties(
    dbName,
    { ...detail.frontmatter, title },
    schema,
  );
  for (const s of skipped) console.warn(`[sync] WARN ${slug}: ${s}`);
  const blocks = mdToNotion.markdownToBlocks(detail.body);

  if (dryRun) {
    console.log(`[DRY-RUN] created: ${dbName} <- "${title}" (${blocks.length} blocks)`);
    stats.created++;
    return;
  }

  const created = await notion.createPage(dbIds[dbName], properties, blocks);
  // Stamp the new page_id back into the gbrain page frontmatter.
  const stamped = `---\n${detail.frontmatterRaw}\nnotion_page_id: ${created.id}\n---\n\n${detail.body}`;
  await adapter.putRawPage(slug, stamped);

  const stored = await adapter.getPage(slug);
  syncState.upsertPage({
    notion_page_id: created.id,
    notion_database: dbName,
    local_slug: slug,
    last_synced_at: new Date().toISOString(),
    notion_last_edited_seen: created.last_edited_time ?? '',
    local_content_hash_seen: stored.contentHash,
    notion_props_hash_seen: props.hashProps(props.pickWritableKeys(dbName, stored.frontmatter)),
    last_sync_direction: 'created',
    conflict_state: 'none',
  });
  syncState.deletePending(slug);
  stats.created++;
  console.log(`[sync] created: ${dbName} <- "${title}" (${created.id})`);
}

// ---------------------------------------------------------------------------
// Existing page reconcile (four-quadrant)
// ---------------------------------------------------------------------------

async function reconcilePage(ctx, slug, detail, dbName, notionPageId) {
  const { props, syncState, stats, dryRun } = ctx;

  const notionEntry = ctx.notionById.get(notionPageId);
  if (!notionEntry) {
    stats.warn++;
    console.warn(
      `[sync] WARN ${slug}: Notion page ${notionPageId} not found ` +
        `(deleted/archived?) — skipping`,
    );
    return;
  }
  const notionPage = notionEntry.page;

  const localBodyHash = detail.contentHash;
  const localPropsHash = props.hashProps(props.pickWritableKeys(dbName, detail.frontmatter));
  const notionLastEdited = notionPage.last_edited_time ?? '';
  const baseline = syncState.getPage(notionPageId);

  if (!baseline) {
    // First contact — record baseline only, take no action.
    console.log(`[sync] seed: "${detail.title}"`);
    if (!dryRun) {
      syncState.upsertPage(baselineRow(notionPageId, dbName, slug, notionLastEdited, localBodyHash, localPropsHash, 'skip', 'none'));
    }
    stats.skip++;
    return;
  }

  const notionChanged = notionLastEdited !== baseline.notion_last_edited_seen;
  const bodyChanged = localBodyHash !== baseline.local_content_hash_seen;
  const propsChanged = localPropsHash !== baseline.notion_props_hash_seen;
  const localChanged = bodyChanged || propsChanged;

  if (!notionChanged && !localChanged) {
    stats.skip++;
    if (!dryRun) {
      syncState.upsertPage({ ...baseline, last_synced_at: new Date().toISOString(), last_sync_direction: 'skip' });
    }
    return;
  }

  if (notionChanged && localChanged) {
    await actConflict(ctx, slug, detail, dbName, notionPageId, notionPage);
    return;
  }
  if (notionChanged) {
    await actToBrain(ctx, slug, dbName, notionPageId, notionPage);
    return;
  }
  // localChanged only
  await actToNotion(ctx, slug, detail, dbName, notionPageId, notionPage, {
    bodyChanged,
    propsChanged,
    localBodyHash,
    localPropsHash,
  });
}

/** Build a sync-state row. */
function baselineRow(id, dbName, slug, notionEdited, bodyHash, propsHash, direction, conflict) {
  return {
    notion_page_id: id,
    notion_database: dbName,
    local_slug: slug,
    last_synced_at: new Date().toISOString(),
    notion_last_edited_seen: notionEdited,
    local_content_hash_seen: bodyHash,
    notion_props_hash_seen: propsHash,
    last_sync_direction: direction,
    conflict_state: conflict,
  };
}

// ---------------------------------------------------------------------------
// Quadrant actions
// ---------------------------------------------------------------------------

async function actToNotion(ctx, slug, detail, dbName, notionPageId, notionPage, flags) {
  const { notion, converter, mdToNotion, props, syncState, schemas, stats, dryRun } = ctx;
  const { bodyChanged, propsChanged, localBodyHash, localPropsHash } = flags;

  console.log(`[sync] to_notion: "${detail.title}" (${propsChanged ? 'props' : ''}${propsChanged && bodyChanged ? '+' : ''}${bodyChanged ? 'body' : ''})`);
  if (dryRun) {
    stats.to_notion++;
    return;
  }

  const { properties, skipped } = props.toNotionProperties(dbName, detail.frontmatter, schemas[dbName]);
  for (const s of skipped) {
    stats.warn++;
    console.warn(`[sync] WARN ${slug}: ${s}`);
  }
  if (propsChanged && Object.keys(properties).length > 0) {
    await notion.updatePageProperties(notionPageId, properties);
  }

  let bodyConflict = null;
  if (bodyChanged) {
    const blocks = (await notion.fetchBlockChildren(notionPageId)).results;
    const unsupported = converter.containsUnsupportedBlock(blocks);
    if (unsupported.length > 0) {
      // Data-loss guard: do not overwrite a body with unsupported blocks.
      const backup = backupLocal(detail, slug, 'local');
      bodyConflict = backup;
      stats.warn++;
      console.warn(
        `[sync] WARN ${slug}: body NOT pushed — Notion page has unsupported ` +
          `blocks [${unsupported.join(', ')}]. Local body backed up: ${backup}`,
      );
    } else {
      // Snapshot Notion's current body before the non-atomic replace.
      const notionMd = converter.blocksToMarkdown(blocks);
      const dir = path.join(ROOT, '.conflict');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${slug}--notion-${fileStamp()}.md`), notionMd, 'utf8');
      await notion.replacePageBody(notionPageId, mdToNotion.markdownToBlocks(detail.body));
    }
  }

  // Re-fetch to capture the post-write last_edited_time.
  const updated = await notion.fetchPage(notionPageId);
  syncState.transaction(() => {
    syncState.upsertPage(
      baselineRow(
        notionPageId, dbName, slug,
        updated.last_edited_time ?? '',
        localBodyHash, localPropsHash,
        'to_notion',
        bodyConflict ? 'unresolved' : 'none',
      ),
    );
    if (bodyConflict) {
      syncState.addConflict({
        notion_page_id: notionPageId,
        local_slug: slug,
        detected_at: new Date().toISOString(),
        backup_path: bodyConflict,
      });
    }
  });
  if (bodyConflict) {
    appendAuditLog({
      type: 'body-unsupported',
      notion_page_id: notionPageId,
      local_slug: slug,
      backup_path: bodyConflict,
    });
    stats.conflict++;
  }
  stats.to_notion++;
}

async function actToBrain(ctx, slug, dbName, notionPageId, notionPage) {
  const { stats, dryRun } = ctx;
  console.log(`[sync] to_brain: "${extractTitle(notionPage)}"`);
  if (dryRun) {
    stats.to_brain++;
    return;
  }
  await refreshGbrainFromNotion(ctx, slug, dbName, notionPageId, notionPage, 'to_brain', 'none');
  stats.to_brain++;
}

async function actConflict(ctx, slug, detail, dbName, notionPageId, notionPage) {
  const { notion, syncState, stats, dryRun } = ctx;
  console.log(`[sync] conflict: "${detail.title}" — Notion wins`);
  if (dryRun) {
    stats.conflict++;
    return;
  }
  const backup = backupLocal(detail, slug, 'local');
  await refreshGbrainFromNotion(ctx, slug, dbName, notionPageId, notionPage, 'conflict', 'unresolved');
  syncState.transaction(() => {
    syncState.addConflict({
      notion_page_id: notionPageId,
      local_slug: slug,
      detected_at: new Date().toISOString(),
      backup_path: backup,
    });
  });
  appendAuditLog({
    type: 'dual-edit',
    notion_page_id: notionPageId,
    local_slug: slug,
    backup_path: backup,
  });
  await notion.createComment(
    notionPageId,
    `[notion-sync] 偵測到雙向衝突，已採用 Notion 版本。本地版本已備份：${path.basename(backup)}`,
  );
  stats.conflict++;
}

/** Overwrite a gbrain page with the current Notion content + update baseline. */
async function refreshGbrainFromNotion(ctx, slug, dbName, notionPageId, notionPage, direction, conflictState) {
  const { notion, adapter, converter, props, syncState } = ctx;
  const blocks = (await notion.fetchBlockChildren(notionPageId)).results;
  const md = converter.blocksToMarkdown(blocks);
  const writableProps = props.extractWritableProperties(dbName, notionPage);
  await adapter.putPage({
    id: slug,
    title: extractTitle(notionPage),
    content: md,
    metadata: { source: dbName, notion_page_id: notionPageId, ...writableProps },
  });
  const stored = await adapter.getPage(slug);
  syncState.upsertPage(
    baselineRow(
      notionPageId, dbName, slug,
      notionPage.last_edited_time ?? '',
      stored.contentHash,
      props.hashProps(props.pickWritableKeys(dbName, stored.frontmatter)),
      direction, conflictState,
    ),
  );
}

main().catch((err) => {
  console.error('[sync] Fatal error:', err);
  process.exit(1);
});
