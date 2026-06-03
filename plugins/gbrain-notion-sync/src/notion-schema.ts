/**
 * notion-schema.ts
 * Reads a Notion database's property schema — specifically the EXISTING
 * select/status/multi_select option names.
 *
 * Phase 2 hard rule: push must never create a new Notion property or a new
 * select option. Before writing a SELECT/STATUS value back, callers validate
 * it with isValidOption(); an unknown value is skipped, not invented.
 */

import { fetchDatabase } from './notion-client.js';

/** Allowed option names + property types for one Notion database. */
export interface DbSchema {
  databaseId: string;
  /** propName -> allowed option names (select / status / multi_select only). */
  options: Record<string, string[]>;
  /** propName -> Notion property type. */
  types: Record<string, string>;
}

/** Fetch and distil a database's property schema. */
export async function fetchDbSchema(databaseId: string): Promise<DbSchema> {
  const db = await fetchDatabase(databaseId);
  const options: Record<string, string[]> = {};
  const types: Record<string, string> = {};

  for (const [name, prop] of Object.entries(db.properties ?? {})) {
    const p = prop as Record<string, unknown>;
    const type = typeof p.type === 'string' ? p.type : 'unknown';
    types[name] = type;

    const container = p[type] as { options?: Array<{ name?: string }> } | undefined;
    if (
      (type === 'select' || type === 'status' || type === 'multi_select') &&
      Array.isArray(container?.options)
    ) {
      options[name] = container.options
        .map((o) => o.name ?? '')
        .filter((n) => n !== '');
    }
  }

  return { databaseId, options, types };
}

/**
 * True if `value` is an existing option of `propName`. Property types without
 * a fixed option set (url, date, ...) always return true — only select-like
 * properties are constrained.
 */
export function isValidOption(
  schema: DbSchema,
  propName: string,
  value: string,
): boolean {
  const opts = schema.options[propName];
  if (!opts) return true;
  return opts.includes(value);
}
