/**
 * sync-state.ts
 * bun:sqlite-backed store for the Notion <-> gbrain sync baseline.
 *
 * Tracks, per page, what Notion and gbrain looked like at the last successful
 * sync so the four-quadrant engine (scripts/sync.mjs) can classify changes.
 *
 * Three tables:
 *   - pages          synced pages (keyed by Notion page_id)
 *   - pending_pages  agent-created gbrain pages not yet pushed to Notion
 *   - conflicts      recorded dual-edit conflicts (Phase 2.5)
 *
 * MUST run under `bun` — see src/bun-sqlite.d.ts.
 */

import { Database } from 'bun:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS pages (
  notion_page_id          TEXT PRIMARY KEY,
  notion_database         TEXT NOT NULL,
  local_slug              TEXT NOT NULL UNIQUE,
  last_synced_at          TEXT NOT NULL,
  notion_last_edited_seen TEXT NOT NULL,
  local_content_hash_seen TEXT NOT NULL,
  notion_props_hash_seen  TEXT NOT NULL,
  last_sync_direction     TEXT NOT NULL,
  conflict_state          TEXT NOT NULL DEFAULT 'none'
);
CREATE TABLE IF NOT EXISTS pending_pages (
  local_slug      TEXT PRIMARY KEY,
  notion_database TEXT NOT NULL,
  detected_at     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conflicts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  notion_page_id TEXT NOT NULL,
  local_slug     TEXT NOT NULL,
  detected_at    TEXT NOT NULL,
  backup_path    TEXT NOT NULL,
  resolved       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(local_slug);
CREATE INDEX IF NOT EXISTS idx_pages_conflict ON pages(conflict_state);
`;

/** Direction recorded for the most recent sync of a page. */
export type SyncDirection =
  | 'to_brain'
  | 'to_notion'
  | 'conflict'
  | 'skip'
  | 'created';

/** One row of the `pages` table. */
export interface SyncStateRow {
  notion_page_id: string;
  notion_database: string;
  local_slug: string;
  last_synced_at: string;
  /** Notion last_edited_time observed at last sync. */
  notion_last_edited_seen: string;
  /** SHA-256 of the gbrain page body observed at last sync. */
  local_content_hash_seen: string;
  /** SHA-256 of the writable-property set observed at last sync. */
  notion_props_hash_seen: string;
  last_sync_direction: SyncDirection;
  /** 'none' | 'unresolved' */
  conflict_state: string;
}

/** One row of the `pending_pages` table. */
export interface PendingPageRow {
  local_slug: string;
  notion_database: string;
  detected_at: string;
}

/** One row of the `conflicts` table. */
export interface ConflictRow {
  id: number;
  notion_page_id: string;
  local_slug: string;
  detected_at: string;
  backup_path: string;
  resolved: number;
}

/** Typed wrapper around the sync-state SQLite database. */
export class SyncState {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
    this.db.exec(SCHEMA);
  }

  // -- pages ----------------------------------------------------------------

  getPage(notionPageId: string): SyncStateRow | null {
    return (
      this.db
        .query<SyncStateRow>('SELECT * FROM pages WHERE notion_page_id = ?')
        .get(notionPageId) ?? null
    );
  }

  bySlug(localSlug: string): SyncStateRow | null {
    return (
      this.db
        .query<SyncStateRow>('SELECT * FROM pages WHERE local_slug = ?')
        .get(localSlug) ?? null
    );
  }

  allPages(): SyncStateRow[] {
    return this.db.query<SyncStateRow>('SELECT * FROM pages').all();
  }

  upsertPage(row: SyncStateRow): void {
    this.db.run(
      `INSERT INTO pages (
         notion_page_id, notion_database, local_slug, last_synced_at,
         notion_last_edited_seen, local_content_hash_seen, notion_props_hash_seen,
         last_sync_direction, conflict_state
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(notion_page_id) DO UPDATE SET
         notion_database         = excluded.notion_database,
         local_slug              = excluded.local_slug,
         last_synced_at          = excluded.last_synced_at,
         notion_last_edited_seen = excluded.notion_last_edited_seen,
         local_content_hash_seen = excluded.local_content_hash_seen,
         notion_props_hash_seen  = excluded.notion_props_hash_seen,
         last_sync_direction     = excluded.last_sync_direction,
         conflict_state          = excluded.conflict_state`,
      row.notion_page_id,
      row.notion_database,
      row.local_slug,
      row.last_synced_at,
      row.notion_last_edited_seen,
      row.local_content_hash_seen,
      row.notion_props_hash_seen,
      row.last_sync_direction,
      row.conflict_state,
    );
  }

  deletePage(notionPageId: string): void {
    this.db.run('DELETE FROM pages WHERE notion_page_id = ?', notionPageId);
  }

  // -- pending pages --------------------------------------------------------

  allPending(): PendingPageRow[] {
    return this.db.query<PendingPageRow>('SELECT * FROM pending_pages').all();
  }

  upsertPending(row: PendingPageRow): void {
    this.db.run(
      `INSERT INTO pending_pages (local_slug, notion_database, detected_at)
       VALUES (?, ?, ?)
       ON CONFLICT(local_slug) DO UPDATE SET
         notion_database = excluded.notion_database,
         detected_at     = excluded.detected_at`,
      row.local_slug,
      row.notion_database,
      row.detected_at,
    );
  }

  deletePending(localSlug: string): void {
    this.db.run('DELETE FROM pending_pages WHERE local_slug = ?', localSlug);
  }

  // -- conflicts ------------------------------------------------------------

  addConflict(c: Omit<ConflictRow, 'id' | 'resolved'>): void {
    this.db.run(
      `INSERT INTO conflicts (notion_page_id, local_slug, detected_at, backup_path, resolved)
       VALUES (?, ?, ?, ?, 0)`,
      c.notion_page_id,
      c.local_slug,
      c.detected_at,
      c.backup_path,
    );
  }

  openConflicts(): ConflictRow[] {
    return this.db
      .query<ConflictRow>('SELECT * FROM conflicts WHERE resolved = 0 ORDER BY id')
      .all();
  }

  resolveConflict(id: number): void {
    this.db.run('UPDATE conflicts SET resolved = 1 WHERE id = ?', id);
  }

  // -- lifecycle ------------------------------------------------------------

  /** Run `fn` inside a single SQLite transaction (per-page atomicity). */
  transaction(fn: () => void): void {
    this.db.transaction(fn)();
  }

  close(): void {
    this.db.close();
  }
}

/** Open (creating + migrating if needed) the sync-state database at `filePath`. */
export function openSyncState(filePath: string): SyncState {
  return new SyncState(new Database(filePath));
}
