/**
 * notion-client.ts
 * Thin wrapper around @notionhq/client with a simple 2 req/s rate limiter.
 */

import { Client } from '@notionhq/client';
import type {
  DatabaseObjectResponse,
  PageObjectResponse,
  BlockObjectResponse,
  BlockObjectRequest,
  ListBlockChildrenResponse,
  QueryDatabaseResponse,
  CreatePageParameters,
  UpdatePageParameters,
} from '@notionhq/client/build/src/api-endpoints.js';

/** Notion property-input map (the `properties` payload of create/update). */
export type NotionPropertyInput = Record<string, unknown>;
/** Notion block-input shape (one entry of a `children` array). */
export type { BlockObjectRequest };

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
 * Retrieve ALL direct block children of a block (or page) by ID, following
 * cursor pagination internally. The returned response carries the aggregated
 * `results` with `has_more: false`.
 * @param blockId - The parent block / page UUID.
 */
export async function fetchBlockChildren(
  blockId: string,
): Promise<ListBlockChildrenResponse> {
  const all: ListBlockChildrenResponse['results'] = [];
  let cursor: string | undefined = undefined;
  let last: ListBlockChildrenResponse | null = null;
  do {
    await rateLimit();
    const resp: ListBlockChildrenResponse = await getClient().blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    all.push(...resp.results);
    last = resp;
    cursor = resp.has_more ? (resp.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return {
    ...(last as ListBlockChildrenResponse),
    results: all,
    has_more: false,
    next_cursor: null,
  };
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

// ---------------------------------------------------------------------------
// Write API (Phase 2 — push direction)
// ---------------------------------------------------------------------------

/**
 * Patch a Notion page's properties. Non-destructive: only the supplied
 * properties change; page body blocks are untouched.
 * @param pageId - The Notion page UUID.
 * @param properties - Notion property-input map (see notion-properties.ts).
 */
export async function updatePageProperties(
  pageId: string,
  properties: NotionPropertyInput,
): Promise<PageObjectResponse> {
  await rateLimit();
  const response = await getClient().pages.update({
    page_id: pageId,
    properties: properties as UpdatePageParameters['properties'],
  });
  return response as PageObjectResponse;
}

/**
 * Create a new page inside a Notion database.
 * @param parentDatabaseId - Target database UUID.
 * @param properties - Notion property-input map (must include the title).
 * @param children - Optional body blocks.
 */
export async function createPage(
  parentDatabaseId: string,
  properties: NotionPropertyInput,
  children?: BlockObjectRequest[],
): Promise<PageObjectResponse> {
  await rateLimit();
  const params: CreatePageParameters = {
    parent: { database_id: parentDatabaseId },
    properties: properties as CreatePageParameters['properties'],
  };
  if (children && children.length > 0) {
    params.children = children;
  }
  const response = await getClient().pages.create(params);
  return response as PageObjectResponse;
}

/**
 * Replace a page's body: delete every existing child block, then append the
 * supplied blocks. NOT atomic — Notion has no set-body call. Callers should
 * snapshot the current body before invoking this.
 * @param pageId - The Notion page UUID.
 * @param blocks - New body blocks.
 */
export async function replacePageBody(
  pageId: string,
  blocks: BlockObjectRequest[],
): Promise<void> {
  const existing = await fetchBlockChildren(pageId);
  for (const block of existing.results) {
    await rateLimit();
    await getClient().blocks.delete({ block_id: block.id });
  }
  for (let i = 0; i < blocks.length; i += 100) {
    await rateLimit();
    await getClient().blocks.children.append({
      block_id: pageId,
      children: blocks.slice(i, i + 100),
    });
  }
}

/**
 * Post a comment on a Notion page. Requires the integration's
 * "insert content" capability — if absent the API returns 403, which is
 * caught and logged rather than thrown (conflict handling must not abort).
 * @returns true if the comment was posted, false if it was rejected.
 */
export async function createComment(
  pageId: string,
  text: string,
): Promise<boolean> {
  try {
    await rateLimit();
    await getClient().comments.create({
      parent: { page_id: pageId },
      rich_text: [{ text: { content: text } }],
    });
    return true;
  } catch (err) {
    console.warn(
      `[notion-client] createComment failed for ${pageId} ` +
        `(integration likely lacks insert-content capability): ${(err as Error).message}`,
    );
    return false;
  }
}

/**
 * Type alias re-exported for consumers that need Notion block shapes without
 * importing @notionhq/client directly.
 */
export type { BlockObjectResponse };
