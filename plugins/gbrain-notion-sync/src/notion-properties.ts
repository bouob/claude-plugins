/**
 * notion-properties.ts
 * Maps Notion page properties to gbrain frontmatter scalar keys.
 *
 * Phase 2.0 implements the READ direction (Notion property -> frontmatter).
 * The WRITE direction (frontmatter -> Notion property input) is added in
 * Phase 2.4 and reuses the same PROPERTY_MAP.
 *
 * Property names + option values were MCP-verified against the live PAI
 * databases (plan.md §4, 2026-05-16).
 *
 * Deviations from plan.md §4 frontmatter key names — all collision fixes:
 *   - Inbox 類型  -> `inbox_type`  (gbrain reserves frontmatter `type`)
 *   - 知識庫 標籤 -> `knowledge_tags` (gbrain reserves frontmatter `tags`)
 *   - Inbox 來源  -> `source_ref`   (`source` already holds the database name)
 * Body-text properties (Projects 目標/限制條件, To-Do 學習洞察) are intentionally
 * NOT mapped — they are not bidirectionally synced scalar fields.
 */

import { createHash } from 'crypto';
import { isValidOption, type DbSchema } from './notion-schema.js';

/** Notion property value kinds this module knows how to read/write. */
export type WritablePropertyType =
  | 'select'
  | 'status'
  | 'date'
  | 'url'
  | 'multi_select'
  | 'relation'
  | 'rich_text';

/** One Notion-property <-> frontmatter-key binding. */
export interface PropertyMapping {
  /** Human-readable Notion property name (the DB column header). */
  notionProp: string;
  /** Frontmatter key written into the gbrain page. */
  key: string;
  type: WritablePropertyType;
}

/** Per-database writable property maps. */
export const PROPERTY_MAP: Record<string, PropertyMapping[]> = {
  projects: [
    { notionProp: '狀態', key: 'status', type: 'select' },
    { notionProp: '優先級', key: 'priority', type: 'select' },
    { notionProp: '截止', key: 'due_date', type: 'date' },
    { notionProp: 'Tasks', key: 'task_ids', type: 'relation' },
    { notionProp: '參考資源', key: 'knowledge_ids', type: 'relation' },
  ],
  todo: [
    { notionProp: 'Status', key: 'status', type: 'status' },
    { notionProp: 'Priority', key: 'priority', type: 'select' },
    { notionProp: 'Due Date', key: 'due_date', type: 'date' },
    { notionProp: 'Project', key: 'project_page_url', type: 'relation' },
    { notionProp: '知識成熟度', key: 'maturity', type: 'select' },
    { notionProp: '網址', key: 'url', type: 'url' },
  ],
  inbox: [
    { notionProp: '類型', key: 'inbox_type', type: 'select' },
    { notionProp: 'URL', key: 'url', type: 'url' },
    { notionProp: '來源', key: 'source_ref', type: 'rich_text' },
    { notionProp: '狀態', key: 'status', type: 'select' },
  ],
  knowledge: [
    { notionProp: '類別', key: 'category', type: 'select' },
    { notionProp: '標籤', key: 'knowledge_tags', type: 'multi_select' },
    { notionProp: '狀態', key: 'status', type: 'select' },
    { notionProp: '相關連結', key: 'link', type: 'url' },
    { notionProp: '摘要', key: 'summary', type: 'rich_text' },
    { notionProp: '收藏日期', key: 'saved_at', type: 'date' },
    { notionProp: '相關 Project', key: 'project_page_url', type: 'relation' },
  ],
};

/** Loose shape of a Notion property value (the SDK union is too wide to enumerate). */
type NotionProperty = Record<string, unknown>;

/** Minimal Notion page shape used here. */
interface NotionPageLike {
  id: string;
  properties?: Record<string, NotionProperty>;
}

/**
 * Convert a single Notion property value to a frontmatter-friendly scalar.
 * Returns undefined for empty/absent values so callers can omit the key.
 */
function convertProperty(
  prop: NotionProperty | undefined,
  type: WritablePropertyType,
): unknown {
  if (!prop) return undefined;
  switch (type) {
    case 'select': {
      const sel = prop.select as { name?: string } | null | undefined;
      return sel?.name ?? undefined;
    }
    case 'status': {
      const st = prop.status as { name?: string } | null | undefined;
      return st?.name ?? undefined;
    }
    case 'date': {
      const d = prop.date as { start?: string } | null | undefined;
      return d?.start ?? undefined;
    }
    case 'url': {
      const u = prop.url as string | null | undefined;
      return u || undefined;
    }
    case 'multi_select': {
      const arr = prop.multi_select as Array<{ name?: string }> | undefined;
      if (!Array.isArray(arr) || arr.length === 0) return undefined;
      return arr.map((o) => o.name ?? '').filter((n) => n !== '');
    }
    case 'relation': {
      const arr = prop.relation as Array<{ id?: string }> | undefined;
      if (!Array.isArray(arr) || arr.length === 0) return undefined;
      return arr.map((r) => r.id ?? '').filter((id) => id !== '');
    }
    case 'rich_text': {
      const arr = prop.rich_text as Array<{ plain_text?: string }> | undefined;
      if (!Array.isArray(arr)) return undefined;
      const txt = arr.map((t) => t.plain_text ?? '').join('').trim();
      return txt || undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Extract all mapped writable properties from a Notion page as a frontmatter
 * metadata object. Empty/absent properties are omitted entirely.
 *
 * @param dbName - One of: projects | todo | inbox | knowledge.
 * @param page   - A Notion PageObjectResponse.
 */
export function extractWritableProperties(
  dbName: string,
  page: NotionPageLike,
): Record<string, unknown> {
  const mappings = PROPERTY_MAP[dbName] ?? [];
  const props = page.properties ?? {};
  const out: Record<string, unknown> = {};
  for (const m of mappings) {
    const value = convertProperty(props[m.notionProp], m.type);
    if (value !== undefined) out[m.key] = value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Title property names + change-detection helpers
// ---------------------------------------------------------------------------

/** Per-database TITLE property name (the title column is db-specific). */
export const TITLE_PROP: Record<string, string> = {
  projects: '專案名稱',
  todo: 'Name',
  inbox: '標題',
  knowledge: '主題',
};

/** Frontmatter keys that map to writable Notion properties, per database. */
export const WRITABLE_KEYS: Record<string, string[]> = Object.fromEntries(
  Object.entries(PROPERTY_MAP).map(([db, maps]) => [db, maps.map((m) => m.key)]),
);

/**
 * Pick the subset of a frontmatter object that corresponds to writable Notion
 * properties (plus `title`). Used to fingerprint the property set apart from
 * the page body.
 */
export function pickWritableKeys(
  dbName: string,
  frontmatter: Record<string, unknown>,
): Record<string, unknown> {
  const keys = ['title', ...(WRITABLE_KEYS[dbName] ?? [])];
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (frontmatter[k] !== undefined) out[k] = frontmatter[k];
  }
  return out;
}

/** Stable SHA-256 of a property object (keys sorted) — a change fingerprint. */
export function hashProps(obj: Record<string, unknown>): string {
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) sorted[k] = obj[k];
  return createHash('sha256').update(JSON.stringify(sorted), 'utf8').digest('hex');
}

/** Result of building a Notion property-input payload. */
export interface BuildPropertiesResult {
  /** Notion property-input map, keyed by Notion property name. */
  properties: Record<string, unknown>;
  /** Human-readable notes for properties/values that were skipped. */
  skipped: string[];
}

/**
 * Build a Notion property-input payload from a gbrain page's frontmatter.
 *
 * Hard rule: never invent a select option. A SELECT/STATUS value not present
 * in the live schema is skipped (recorded in `skipped`), not created.
 * Relation properties are push-read-only and are always skipped.
 *
 * @param dbName     - projects | todo | inbox | knowledge.
 * @param frontmatter - The gbrain page frontmatter.
 * @param schema     - Live DB schema (for option validation).
 */
export function toNotionProperties(
  dbName: string,
  frontmatter: Record<string, unknown>,
  schema: DbSchema,
): BuildPropertiesResult {
  const out: Record<string, unknown> = {};
  const skipped: string[] = [];

  const titleVal = frontmatter['title'];
  if (typeof titleVal === 'string' && titleVal !== '' && TITLE_PROP[dbName]) {
    out[TITLE_PROP[dbName]] = { title: [{ text: { content: titleVal } }] };
  }

  for (const m of PROPERTY_MAP[dbName] ?? []) {
    const value = frontmatter[m.key];
    if (value === undefined || value === null) continue;

    switch (m.type) {
      case 'relation':
        // Relations are push-read-only (see plan.md §四象限).
        break;
      case 'select':
      case 'status': {
        const v = String(value);
        if (isValidOption(schema, m.notionProp, v)) {
          out[m.notionProp] = { [m.type]: { name: v } };
        } else {
          skipped.push(`${m.notionProp}: option "${v}" not in Notion schema`);
        }
        break;
      }
      case 'multi_select': {
        const arr = Array.isArray(value) ? value.map((x) => String(x)) : [];
        const valid = arr.filter((v) => isValidOption(schema, m.notionProp, v));
        const invalid = arr.filter((v) => !isValidOption(schema, m.notionProp, v));
        if (invalid.length > 0) {
          skipped.push(`${m.notionProp}: options [${invalid.join(', ')}] not in schema`);
        }
        out[m.notionProp] = { multi_select: valid.map((name) => ({ name })) };
        break;
      }
      case 'date':
        out[m.notionProp] = { date: { start: String(value) } };
        break;
      case 'url':
        out[m.notionProp] = { url: String(value) };
        break;
      case 'rich_text':
        out[m.notionProp] = {
          rich_text: [{ text: { content: String(value) } }],
        };
        break;
    }
  }

  return { properties: out, skipped };
}
