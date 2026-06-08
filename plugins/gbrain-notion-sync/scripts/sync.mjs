/**
 * sync.mjs
 * One-way push: gbrain -> Notion.
 *
 * Usage:
 *   bun scripts/sync.mjs [--database <name>] [--dry-run]
 *
 * Runs under `bun` (loads sync-state.js -> bun:sqlite).
 *
 * For every gbrain page it compares the current Notion and gbrain state against
 * the sync-state baseline and acts:
 *   - local changed only      -> push the edit up to Notion (to_notion)
 *   - no notion_page_id        -> create the page in Notion (created)
 *   - Notion changed           -> skip (the Notion -> gbrain direction is `pull`)
 *   - both changed (diverged)  -> skip + record a conflict; run `pull` to resolve
 *
 * It never writes gbrain (that is `pull`'s job) and never overwrites a Notion
 * page that moved ahead, so a stale local copy can't clobber newer Notion data.
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
  const stats = { skip: 0, to_notion: 0, conflict: 0, created: 0, warn: 0, error: 0 };

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
      `conflict=${stats.conflict} created=${stats.created} ` +
      `warn=${stats.warn} error=${stats.error}`,
  );
}

// ---------------------------------------------------------------------------
// New page creation (agent-authored gbrain page -> new Notion page)
// ---------------------------------------------------------------------------

async function handleNewPage(ctx, slug, detail, dbName) {
  const { notion, mdToNotion, props, syncState, schemas, dbIds, stats, dryRun } = ctx;

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

  // R1 idempotency guard. handleNewPage only runs for a gbrain page that has no
  // notion_page_id. A prior run could have created the Notion page but crashed
  // before stamping that id back into the gbrain frontmatter — leaving the page
  // id-less and re-creatable here, producing a DUPLICATE Notion page. If
  // sync-state already maps this slug to a Notion page id, the create already
  // happened: recover by re-stamping instead of creating again.
  const prior = syncState.bySlug(slug);
  if (prior && prior.notion_page_id) {
    if (dryRun) {
      console.log(`[DRY-RUN] recover (re-stamp): ${slug} -> ${prior.notion_page_id}`);
      stats.created++;
      return;
    }
    await finalizeCreatedPage(ctx, slug, detail, dbName, prior.notion_page_id);
    stats.created++;
    console.log(`[sync] recovered: re-stamped ${slug} -> ${prior.notion_page_id}`);
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

  // Persist the slug -> notion_page_id mapping IMMEDIATELY, before the
  // stamp/finalize steps that can fail. If finalize crashes, the next run's
  // guard above finds this row and recovers instead of duplicating.
  syncState.upsertPage(
    baselineRow(
      created.id, dbName, slug,
      created.last_edited_time ?? '',
      detail.contentHash,
      props.hashProps(props.pickWritableKeys(dbName, detail.frontmatter)),
      'created', 'none',
    ),
  );

  await finalizeCreatedPage(ctx, slug, detail, dbName, created.id);
  stats.created++;
  console.log(`[sync] created: ${dbName} <- "${title}" (${created.id})`);
}

/**
 * Stamp notion_page_id into the gbrain page and record the post-write baseline.
 * Shared by the create path and the R1 crash-recovery path, so a half-finished
 * create converges to the same final state on the next run.
 */
async function finalizeCreatedPage(ctx, slug, detail, dbName, notionPageId) {
  const { adapter, props, syncState } = ctx;
  // Precondition: the gbrain page has no notion_page_id yet (handleNewPage only
  // runs in that case), so frontmatterRaw carries no duplicate key.
  const stamped = `---\n${detail.frontmatterRaw}\nnotion_page_id: ${notionPageId}\n---\n\n${detail.body}`;
  await adapter.putRawPage(slug, stamped);

  const stored = await adapter.getPage(slug);
  const notionEdited = syncState.getPage(notionPageId)?.notion_last_edited_seen ?? '';
  syncState.upsertPage(
    baselineRow(
      notionPageId, dbName, slug,
      notionEdited,
      stored.contentHash,
      props.hashProps(props.pickWritableKeys(dbName, stored.frontmatter)),
      'created', 'none',
    ),
  );
  syncState.deletePending(slug);
}

// ---------------------------------------------------------------------------
// Existing page reconcile (push: gbrain -> Notion, up-only)
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

  // Pure one-way push: gbrain -> Notion only. The Notion -> gbrain direction is
  // `pull`'s job, so a page changed on the Notion side is left untouched here —
  // a stale gbrain copy must never clobber a newer Notion page.
  if (notionChanged) {
    if (localChanged) {
      // Diverged: both sides moved since last sync. Write neither way; surface it
      // so the user runs `pull` to refresh gbrain, then re-pushes.
      stats.conflict++;
      console.warn(
        `[sync] WARN diverged: "${detail.title}" — Notion and gbrain both changed ` +
          `since last sync. Skipped; run /notion-sync pull to refresh gbrain, then re-push.`,
      );
      if (!dryRun) {
        syncState.addConflict({
          notion_page_id: notionPageId,
          local_slug: slug,
          detected_at: new Date().toISOString(),
          backup_path: '(diverged — run pull, then re-push)',
        });
      }
    } else {
      stats.skip++;
    }
    return;
  }

  // localChanged only -> push the gbrain edit up to Notion.
  await actToNotion(ctx, slug, detail, dbName, notionPageId, {
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
// Push action (gbrain -> Notion)
// ---------------------------------------------------------------------------

async function actToNotion(ctx, slug, detail, dbName, notionPageId, flags) {
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

main().catch((err) => {
  console.error('[sync] Fatal error:', err);
  process.exit(1);
});
