/**
 * block-converter.ts
 * Converts Notion block objects to Markdown strings.
 *
 * Supported block types (Phase 1):
 *   paragraph, heading_1/2/3, bulleted_list_item, numbered_list_item,
 *   to_do, code, quote, divider
 *
 * Unsupported types produce an HTML comment so callers can identify gaps
 * without crashing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal shape of a Notion rich-text span. */
interface RichTextItem {
  plain_text: string;
}

/** Represents any Notion block with the properties we care about. */
export interface NotionBlock {
  type: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract the plain text from a rich_text array.
 * Returns an empty string when the array is absent or empty.
 */
function richTextToPlain(items: RichTextItem[]): string {
  return items.map((t) => t.plain_text).join('');
}

function getBlockContent(block: NotionBlock): Record<string, unknown> {
  const content = block[block.type];
  if (typeof content === 'object' && content !== null) {
    return content as Record<string, unknown>;
  }
  return {};
}

function getRichText(block: NotionBlock): RichTextItem[] {
  const content = getBlockContent(block);
  const rt = content['rich_text'];
  if (Array.isArray(rt)) {
    return rt as RichTextItem[];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Block-type handlers
// ---------------------------------------------------------------------------

function convertParagraph(block: NotionBlock): string {
  const text = richTextToPlain(getRichText(block));
  return text ? text : '';
}

function convertHeading(block: NotionBlock): string {
  const level = block.type === 'heading_1' ? 1 : block.type === 'heading_2' ? 2 : 3;
  const prefix = '#'.repeat(level);
  const text = richTextToPlain(getRichText(block));
  return `${prefix} ${text}`;
}

function convertBulletedListItem(block: NotionBlock): string {
  const text = richTextToPlain(getRichText(block));
  return `- ${text}`;
}

function convertNumberedListItem(block: NotionBlock): string {
  const text = richTextToPlain(getRichText(block));
  // Notion doesn't provide the sequential number; use `1.` and let renderers
  // handle ordered list numbering.
  return `1. ${text}`;
}

function convertCode(block: NotionBlock): string {
  const content = getBlockContent(block);
  const language = typeof content['language'] === 'string' ? content['language'] : '';
  const text = richTextToPlain(getRichText(block));
  return `\`\`\`${language}\n${text}\n\`\`\``;
}

function convertQuote(block: NotionBlock): string {
  const text = richTextToPlain(getRichText(block));
  return `> ${text}`;
}

function convertToDo(block: NotionBlock): string {
  const content = getBlockContent(block);
  const checked = content['checked'] === true;
  const text = richTextToPlain(getRichText(block));
  return `- [${checked ? 'x' : ' '}] ${text}`;
}

function convertDivider(): string {
  return '---';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a single Notion block to its Markdown representation.
 *
 * @param block - A Notion block object (must have a `type` field).
 * @returns A Markdown string for the block. For unknown types, returns an
 *          HTML comment describing the unsupported block type.
 */
export function blockToMarkdown(block: NotionBlock): string {
  switch (block.type) {
    case 'paragraph':
      return convertParagraph(block);
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
      return convertHeading(block);
    case 'bulleted_list_item':
      return convertBulletedListItem(block);
    case 'numbered_list_item':
      return convertNumberedListItem(block);
    case 'to_do':
      return convertToDo(block);
    case 'code':
      return convertCode(block);
    case 'quote':
      return convertQuote(block);
    case 'divider':
      return convertDivider();
    default:
      return `<!-- unsupported block: ${block.type} -->`;
  }
}

/**
 * Convert an array of Notion blocks to a Markdown document string.
 * Blocks are joined with a blank line between them.
 *
 * @param blocks - Array of Notion block objects.
 * @returns Multi-line Markdown string.
 */
export function blocksToMarkdown(blocks: NotionBlock[]): string {
  return blocks.map(blockToMarkdown).join('\n\n');
}
