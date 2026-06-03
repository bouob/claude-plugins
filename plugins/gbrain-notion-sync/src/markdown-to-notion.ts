/**
 * markdown-to-notion.ts
 * Reverse of block-converter.ts: turns a markdown body into Notion block
 * inputs. Supports the same 8 block types block-converter emits
 * (paragraph, heading_1/2/3, bulleted/numbered list, to_do, code, quote,
 * divider).
 *
 * Parsing is line-based: one non-blank line becomes one block. Any markdown
 * construct outside the supported set degrades to a paragraph — text is
 * preserved, inline formatting is not. Use hasUnsupportedConstruct() to warn
 * before a lossy push.
 */

import type { BlockObjectRequest } from './notion-client.js';

/** Notion rich_text content limit per item. */
const NOTION_TEXT_LIMIT = 2000;

/** Code-fence languages Notion accepts; anything else falls back to plain text. */
const NOTION_CODE_LANGUAGES: ReadonlySet<string> = new Set([
  'abap', 'arduino', 'bash', 'basic', 'c', 'clojure', 'coffeescript', 'c++',
  'c#', 'css', 'dart', 'diff', 'docker', 'elixir', 'elm', 'erlang', 'flow',
  'fortran', 'f#', 'gherkin', 'glsl', 'go', 'graphql', 'groovy', 'haskell',
  'html', 'java', 'javascript', 'json', 'julia', 'kotlin', 'latex', 'less',
  'lisp', 'livescript', 'lua', 'makefile', 'markdown', 'markup', 'matlab',
  'mermaid', 'nix', 'objective-c', 'ocaml', 'pascal', 'perl', 'php',
  'plain text', 'powershell', 'prolog', 'protobuf', 'python', 'r', 'reason',
  'ruby', 'rust', 'sass', 'scala', 'scheme', 'scss', 'shell', 'sql', 'swift',
  'typescript', 'vb.net', 'verilog', 'vhdl', 'visual basic', 'webassembly',
  'xml', 'yaml',
]);

// ---------------------------------------------------------------------------
// Internal builders
// ---------------------------------------------------------------------------

/** Split text into <=2000-char chunks (Notion rich_text item limit). */
function splitText(text: string): string[] {
  if (text.length <= NOTION_TEXT_LIMIT) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += NOTION_TEXT_LIMIT) {
    chunks.push(text.slice(i, i + NOTION_TEXT_LIMIT));
  }
  return chunks;
}

/** Build a rich_text array from a plain string (empty string -> empty array). */
function richText(text: string): Array<{ type: 'text'; text: { content: string } }> {
  if (text === '') return [];
  return splitText(text).map((content) => ({
    type: 'text' as const,
    text: { content },
  }));
}

function paragraph(text: string): BlockObjectRequest {
  return {
    type: 'paragraph',
    paragraph: { rich_text: richText(text) },
  } as unknown as BlockObjectRequest;
}

function heading(level: number, text: string): BlockObjectRequest {
  const key = `heading_${level}`;
  return {
    type: key,
    [key]: { rich_text: richText(text) },
  } as unknown as BlockObjectRequest;
}

function listItem(
  kind: 'bulleted_list_item' | 'numbered_list_item',
  text: string,
): BlockObjectRequest {
  return {
    type: kind,
    [kind]: { rich_text: richText(text) },
  } as unknown as BlockObjectRequest;
}

function todoBlock(checked: boolean, text: string): BlockObjectRequest {
  return {
    type: 'to_do',
    to_do: { rich_text: richText(text), checked },
  } as unknown as BlockObjectRequest;
}

function codeBlock(code: string, language: string): BlockObjectRequest {
  return {
    type: 'code',
    code: { rich_text: richText(code), language },
  } as unknown as BlockObjectRequest;
}

function quoteBlock(text: string): BlockObjectRequest {
  return {
    type: 'quote',
    quote: { rich_text: richText(text) },
  } as unknown as BlockObjectRequest;
}

function dividerBlock(): BlockObjectRequest {
  return { type: 'divider', divider: {} } as unknown as BlockObjectRequest;
}

function calloutBlock(icon: string, text: string): BlockObjectRequest {
  return {
    type: 'callout',
    callout: {
      rich_text: richText(text),
      ...(icon ? { icon: { type: 'emoji', emoji: icon } } : {}),
    },
  } as unknown as BlockObjectRequest;
}

function imageBlock(url: string): BlockObjectRequest {
  return {
    type: 'image',
    image: { type: 'external', external: { url } },
  } as unknown as BlockObjectRequest;
}

/** Return true if the string's first character is a Unicode emoji. */
function startsWithEmoji(s: string): boolean {
  // \p{Emoji} matches emoji characters; the 'u' flag enables Unicode property escapes.
  return /^\p{Emoji}/u.test(s) && !/^[0-9#*]/u.test(s);
}

/** Split "💡 some text" into ["💡", "some text"]. Works for multi-codepoint emoji. */
function splitEmojiPrefix(s: string): [string, string] {
  const m = s.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
  if (!m) return ['', s];
  return [m[0].trim(), s.slice(m[0].length)];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a markdown body string into an array of Notion block inputs.
 *
 * @param md - Markdown body (frontmatter must already be stripped).
 */
export function markdownToBlocks(md: string): BlockObjectRequest[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: BlockObjectRequest[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].replace(/\s+$/, '');
    const trimmed = line.trim();

    if (trimmed === '') {
      i++;
      continue;
    }

    // Fenced code block: ```lang ... ```
    const fence = trimmed.match(/^```(.*)$/);
    if (fence) {
      const langRaw = fence[1].trim().toLowerCase();
      const language = NOTION_CODE_LANGUAGES.has(langRaw) ? langRaw : 'plain text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '```') {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume the closing fence
      blocks.push(codeBlock(codeLines.join('\n'), language));
      continue;
    }

    // Divider
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(dividerBlock());
      i++;
      continue;
    }

    // Heading (1-3)
    const h = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      blocks.push(heading(h[1].length, h[2]));
      i++;
      continue;
    }

    // To-do (check before bulleted — both start with `- `)
    const todo = trimmed.match(/^[-*]\s+\[([ xX])\]\s*(.*)$/);
    if (todo) {
      blocks.push(todoBlock(todo[1].toLowerCase() === 'x', todo[2]));
      i++;
      continue;
    }

    // Bulleted list item
    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      blocks.push(listItem('bulleted_list_item', bullet[1]));
      i++;
      continue;
    }

    // Numbered list item
    const num = trimmed.match(/^\d+\.\s+(.*)$/);
    if (num) {
      blocks.push(listItem('numbered_list_item', num[1]));
      i++;
      continue;
    }

    // Image: ![alt](url)  — must come before paragraph fallback
    const img = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      blocks.push(imageBlock(img[2]));
      i++;
      continue;
    }

    // Blockquote / callout — both start with `>`
    // Distinguish by checking whether the content starts with an emoji:
    //   > 💡 text  →  callout
    //   > plain    →  quote
    const q = trimmed.match(/^>\s?(.*)$/);
    if (q) {
      const content = q[1];
      if (startsWithEmoji(content)) {
        const [icon, text] = splitEmojiPrefix(content);
        blocks.push(calloutBlock(icon, text));
      } else {
        blocks.push(quoteBlock(content));
      }
      i++;
      continue;
    }

    // Fallback: paragraph
    blocks.push(paragraph(trimmed));
    i++;
  }

  return blocks;
}

/**
 * Scan markdown for constructs the line-based converter cannot faithfully
 * represent as Notion blocks (tables, images, inline links, nested lists).
 * Advisory — pushing such markdown loses formatting, not data.
 *
 * @returns Distinct construct names found; empty array means a clean convert.
 */
export function hasUnsupportedConstruct(md: string): string[] {
  const found = new Set<string>();
  let inCode = false;
  for (const rawLine of md.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (/^\|.*\|/.test(trimmed)) found.add('table');
    // image is now supported (external URLs); skip detection
    if (/(^|[^!])\[[^\]]+\]\([^)]+\)/.test(trimmed)) found.add('link');
    if (/^\s+[-*]\s+/.test(rawLine) || /^\s+\d+\.\s+/.test(rawLine)) {
      found.add('nested-list');
    }
  }
  return [...found];
}
