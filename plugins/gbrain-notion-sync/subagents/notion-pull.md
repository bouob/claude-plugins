# notion-pull

## Responsibility

Trigger a one-shot Notion → gbrain pull for one or all configured PAI databases.

This subagent is responsible for:
1. Reading pages from Notion databases (Projects, To-Do, Inbox, 知識庫)
2. Converting Notion blocks to Markdown via the block-converter layer
3. Writing the converted pages into gbrain via the gbrain-adapter layer

## When to Use

Invoke this subagent when:
- The user asks to sync Notion to gbrain (e.g. "pull from Notion", "sync my notes", "update gbrain from Notion")
- A scheduled job needs to refresh gbrain content from Notion
- A specific database needs to be pulled individually (e.g. "pull just the inbox")

## How It Works

The subagent calls `node scripts/sync-pull.mjs` with appropriate flags:

```bash
# Pull all databases
node scripts/sync-pull.mjs

# Pull a specific database
node scripts/sync-pull.mjs --database projects

# Dry run (preview only, no writes)
node scripts/sync-pull.mjs --database inbox --dry-run
```

Supported `--database` values: `projects`, `todo`, `inbox`, `knowledge`

## Dependencies

- `NOTION_TOKEN` must be set in `.env`
- `NOTION_DB_PROJECTS`, `NOTION_DB_TODO`, `NOTION_DB_INBOX`, `NOTION_DB_KNOWLEDGE` env vars must contain the Notion database IDs
- Compiled dist/ must exist (`bun run build`)
- gbrain must be installed and accessible on PATH (see RUNBOOK.md)

## Link Extraction

After a successful pull, gbrain can extract cross-page links from the synced content.

Basic usage (verified):
```bash
gbrain extract links
```

Extended usage with source/since filtering:
```bash
# TODO: verify --source / --since flag exists in gbrain CLI
# The flags below are documented in plan.md (line 450) but have NOT been
# confirmed against the official gbrain CLI documentation.
# Until verified, use `gbrain extract links` without these flags.
#
# Unverified form (do NOT use in production until confirmed):
#   gbrain extract links --source db --since <ISO_DATE>
```

## Tools

- Bash (for running `node scripts/sync-pull.mjs`)
- Read (for inspecting `.env` and config files)

## Model

inherit (runs in the invoking conversation's model context)

## Limitations

- Pull is one-directional: Notion → gbrain only
- No conflict resolution for pages modified both locally and in Notion
- Incremental sync (only changed pages) is not yet implemented
