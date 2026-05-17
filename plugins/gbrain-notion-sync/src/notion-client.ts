/**
 * notion-client.ts
 * Thin wrapper around @notionhq/client with a simple 2 req/s rate limiter.
 */

import { Client } from '@notionhq/client';
import type {
  DatabaseObjectResponse,
  PageObjectResponse,
  BlockObjectResponse,
  ListBlockChildrenResponse,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints.js';

// ---------------------------------------------------------------------------
// Rate-limit configuration
// ---------------------------------------------------------------------------

/** Maximum number of Notion API requests allowed per second. */
export const RATE_LIMIT = 2; // requests per second

const INTERVAL_MS = Math.ceil(1000 / RATE_LIMIT);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createClient(): Client {
  const token = process.env['NOTION_TOKEN'];
  if (!token) {
    throw new Error('NOTION_TOKEN environment variable is not set');
  }
  return new Client({ auth: token });
}

/** Shared singleton client – created lazily on first use. */
let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}

/** Tracks timestamp (ms) of the most recent API call. */
let _lastCallAt = 0;

/**
 * Enforce the 2 req/s rate limit by delaying if the previous call was too
 * recent.  Mutually exclusive via a simple sequential await pattern — works
 * correctly because Node.js is single-threaded.
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - _lastCallAt;
  if (elapsed < INTERVAL_MS) {
    await new Promise<void>((resolve) =>
      setTimeout(resolve, INTERVAL_MS - elapsed),
    );
  }
  _lastCallAt = Date.now();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieve a Notion database object by ID.
 * @param id - The Notion database UUID (with or without hyphens).
 */
export async function fetchDatabase(
  id: string,
): Promise<DatabaseObjectResponse> {
  await rateLimit();
  const response = await getClient().databases.retrieve({ database_id: id });
  return response as DatabaseObjectResponse;
}

/**
 * Retrieve a single Notion page by ID.
 * @param id - The Notion page UUID.
 */
export async function fetchPage(id: string): Promise<PageObjectResponse> {
  await rateLimit();
  const response = await getClient().pages.retrieve({ page_id: id });
  return response as PageObjectResponse;
}

/**
 * Retrieve the direct block children of a block (or page) by ID.
 * Returns only the first page of results (up to 100 blocks).
 * Callers that need all blocks should implement cursor-based pagination on top.
 * @param blockId - The parent block / page UUID.
 */
export async function fetchBlockChildren(
  blockId: string,
): Promise<ListBlockChildrenResponse> {
  await rateLimit();
  return getClient().blocks.children.list({ block_id: blockId });
}

/**
 * Query a Notion database for all its pages, handling pagination internally.
 * Each result page is a PageObjectResponse.
 */
export async function queryDatabase(
  databaseId: string,
): Promise<PageObjectResponse[]> {
  const all: PageObjectResponse[] = [];
  let cursor: string | undefined = undefined;
  do {
    await rateLimit();
    const resp: QueryDatabaseResponse = await getClient().databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    all.push(...(resp.results as PageObjectResponse[]));
    cursor = resp.has_more ? (resp.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return all;
}

/**
 * Type alias re-exported for consumers that need Notion block shapes without
 * importing @notionhq/client directly.
 */
export type { BlockObjectResponse };
