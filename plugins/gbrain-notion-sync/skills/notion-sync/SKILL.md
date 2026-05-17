---
name: notion-sync
description: >
  Sync Notion PAI second-brain (Projects, To-Do, Inbox, Knowledge Base) into
  the local gbrain knowledge graph for fast Claude Code retrieval. One-way
  pull only (Notion is source of truth). Includes interactive first-time
  init, Windows Task Scheduler installer, and gbrain post-processing hooks.
  Use when the user says /notion-sync, init notion sync, setup notion sync,
  sync notion, pull notion, refresh brain, schedule notion sync,
  install notion sync task, run notion postprocess, notion sync status,
  notion sync doctor, 初始化 notion, 設定 notion sync, 同步 notion,
  拉取 notion, 安裝定時同步, 跑後處理, brain 沒更新, 檢查 notion 同步.
  Sub-commands: init, setup, pull, schedule, postprocess, status, doctor.
  Do NOT use for: writing or updating Notion page content (use Notion MCP
  tools like notion-update-page), general gbrain queries (use mcp__gbrain__*
  directly), installing gbrain itself (use gbrain CLI per RUNBOOK.md Step 1),
  or pushing local changes back to Notion (not yet implemented — planned for v0.2).
allowed_tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
---

# /notion-sync

One-way Notion PAI to gbrain sync pipeline, packaged as a Claude Code plugin.

Notion is source of truth; gbrain is an agent-friendly local mirror with
hybrid search and graph traversal.

---

## Sub-commands

### `/notion-sync init`

Interactive first-time setup. Walks the user through creating `.env` with
all seven required keys, validating each as it is collected. Use this
instead of asking the user to manually copy `.env.example` and edit values.

The flow is conversational: ask one thing at a time, validate via API
call before moving on, and write `.env` only once everything checks out.

## Step 1 — Detect existing `.env` and confirm intent

```bash
test -f "$CLAUDE_PLUGIN_ROOT/.env" && echo "EXISTS" || echo "MISSING"
```

If `EXISTS`, use `AskUserQuestion` to ask whether to (a) back up to
`.env.bak.<timestamp>` then overwrite, (b) keep existing and exit, or
(c) abort. If `MISSING`, proceed.

If user picks "back up", run:

```bash
cp "$CLAUDE_PLUGIN_ROOT/.env" "$CLAUDE_PLUGIN_ROOT/.env.bak.$(date +%s)"
```

## Step 2 — Collect and validate the Notion token

Ask the user in chat (NOT via `AskUserQuestion` — token paste is long
free text, not a multiple choice):

> "Open https://notion.so/my-integrations, create or open an integration,
> and paste the Internal Integration Secret here (starts with `secret_` or
> `ntn_`):"

Wait for the user's next message. Take the pasted value as `NOTION_TOKEN`.
Validate immediately:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Notion-Version: 2022-06-28" \
  https://api.notion.com/v1/users/me
```

Expected: `200`. If `401`, the token is wrong — ask user to re-paste. If
any other code, report it and let the user decide.

## Step 3 — Collect the Anthropic API key

Ask in chat:

> "Now your Anthropic API key (from https://console.anthropic.com/, starts
> with `sk-ant-`). Press Enter on a blank line if you want to skip this
> for now (you can fill it in later)."

No validation — Anthropic doesn't expose a cheap me-endpoint. Store as
`ANTHROPIC_API_KEY`. If blank, leave the value empty in `.env`.

## Step 4 — Resolve `GBRAIN_PLUGIN_PATH`

Default: the absolute path of `$CLAUDE_PLUGIN_ROOT` (or `pwd` if running
outside Claude Code). Use `AskUserQuestion` to confirm or override.

## Step 5 — Collect the four `NOTION_DB_*` IDs

For each of the four databases (Projects, To-Do, Inbox, Knowledge Base),
ask in chat:

> "Paste the Notion page URL OR the 32-character UUID for the **Projects**
> database:"

Accept either form. Extract the UUID:

```bash
echo "<USER_INPUT>" | grep -oiE '[a-f0-9-]{32,36}' | tr -d '-' | tail -c 33 | head -c 32
```

This pulls the last 32 hex chars (whether the input is a URL with title
prefix, a UUID with dashes, or a bare UUID). Reformat with dashes at
positions 8/12/16/20:

```bash
UUID_RAW=<the 32-char output>
echo "${UUID_RAW:0:8}-${UUID_RAW:8:4}-${UUID_RAW:12:4}-${UUID_RAW:16:4}-${UUID_RAW:20:12}"
```

Validate the database is reachable AND the integration is shared with it:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Notion-Version: 2022-06-28" \
  "https://api.notion.com/v1/databases/<FORMATTED_UUID>"
```

Expected: `200`. If `404`, either the UUID is wrong OR the integration is
not shared with this database — tell the user to go to Notion (DB page >
... > Connections > Add) and re-validate. Do not move on until `200`.

Repeat for Todo, Inbox, Knowledge.

## Step 6 — Optional: install the scheduled task

Use `AskUserQuestion`:

> "Install Windows Task Scheduler entry for automatic 15-minute sync?"
> Options: "Yes, every 15 min" / "Yes, every 5 min" / "No, I'll run manually"

If yes, after writing `.env` (Step 7), call `install-task.ps1` with the
chosen interval.

## Step 7 — Write `.env`

Compose the full file content from the collected values and use the
`Write` tool to save it to `$CLAUDE_PLUGIN_ROOT/.env`. Template:

```
NOTION_TOKEN=<collected>
ANTHROPIC_API_KEY=<collected or empty>
GBRAIN_PLUGIN_PATH=<resolved>
NOTION_DB_PROJECTS=<formatted UUID>
NOTION_DB_TODO=<formatted UUID>
NOTION_DB_INBOX=<formatted UUID>
NOTION_DB_KNOWLEDGE=<formatted UUID>
```

## Step 8 — Build and verify

```bash
cd "$CLAUDE_PLUGIN_ROOT" && bun install --ignore-scripts && bun run build
node scripts/doctor.mjs
```

All seven doctor checks should PASS. If anything fails, report it and
offer to re-run the relevant step.

## Step 9 — Optional first sync

Use `AskUserQuestion`:

> "Run the first sync now? (one-way pull, all four databases)"

If yes:

```bash
node scripts/sync-pull.mjs
```

Then suggest the user run `/notion-sync postprocess` once the pull
completes (to refresh gbrain's backlink graph).

---

### `/notion-sync setup`

First-time environment verification.

## Step 1 — Confirm env vars present

Check that `${CLAUDE_PLUGIN_ROOT}/.env` exists and contains the seven required
keys. If `.env` is missing, copy from `.env.example` first.

```powershell
# Windows PowerShell
Get-Content "$env:CLAUDE_PLUGIN_ROOT\.env" | Select-String "NOTION_TOKEN|ANTHROPIC_API_KEY|GBRAIN_PLUGIN_PATH|NOTION_DB_"
```

Expected: seven lines printed (one per required key). Empty values are allowed
during setup but must be filled before `/notion-sync pull`.

## Step 2 — Install dependencies

```powershell
cd "$env:CLAUDE_PLUGIN_ROOT"
bun install --ignore-scripts
bun run build
```

`--ignore-scripts` is required on Windows (see Gotchas).

## Step 3 — Run gbrain health check

```bash
gbrain doctor
```

Expected: all checks PASS. If `engine` shows `not initialised`, run
`gbrain apply-migrations --yes` once (gbrain 0.35.x lazy-init normally
handles this on first command).

## Step 4 — Verify Notion connection (dry-run)

```bash
node "$env:CLAUDE_PLUGIN_ROOT/scripts/sync-pull.mjs" --database projects --dry-run
```

Expected: lists page titles from Projects database without writing to gbrain.
If `401 Unauthorized`, the integration is not shared with the database
(see RUNBOOK.md Step 4).

---

### `/notion-sync pull`

One-shot sync from Notion into gbrain.

## Step 1 — Dry-run first

```bash
node "$env:CLAUDE_PLUGIN_ROOT/scripts/sync-pull.mjs" --database <db-name> --dry-run
```

`<db-name>` is one of: `projects`, `todo`, `inbox`, `knowledge`.

Review the listed pages. Stop here if the count looks wrong (token expired,
wrong DB ID, or integration not shared).

## Step 2 — Execute pull

```bash
node "$env:CLAUDE_PLUGIN_ROOT/scripts/sync-pull.mjs" --database <db-name>
```

The script fetches all pages, converts Notion blocks to Markdown
(`src/block-converter.ts`), and upserts to gbrain via `gbrain put`
(`src/gbrain-adapter.ts`).

## Step 3 — Confirm

```bash
gbrain list pages | wc -l
```

Compare against Step 1's dry-run count.

---

### `/notion-sync schedule`

Install or remove a Windows Task Scheduler entry that runs `/notion-sync pull`
on a fixed interval (default 15 minutes).

## Step 1 — Install

```powershell
powershell -ExecutionPolicy Bypass -File "$env:CLAUDE_PLUGIN_ROOT\scripts\install-task.ps1" -Interval 15m
```

Creates Task Scheduler entry `gbrain-notion-sync` running as the current user.

## Step 2 — Check status

```powershell
powershell -ExecutionPolicy Bypass -File "$env:CLAUDE_PLUGIN_ROOT\scripts\install-task.ps1" -Status
```

Reports next run time and last result code.

## Step 3 — Uninstall

```powershell
powershell -ExecutionPolicy Bypass -File "$env:CLAUDE_PLUGIN_ROOT\scripts\install-task.ps1" -Uninstall
```

Windows only. macOS/Linux scheduler support is planned for v0.2.

---

### `/notion-sync postprocess`

Run gbrain maintenance after a sync (or batch of syncs). Decoupled from
`pull` so sync stays fast and predictable.

## Step 1 — Execute

```bash
node "$env:CLAUDE_PLUGIN_ROOT/scripts/postprocess.mjs"
```

Runs in order, each step's failure does not block the next:

1. `gbrain extract links --source notion` — rebuild backlink graph
2. `gbrain dream --dry-run` — doc consolidation, timeline extraction
3. (Only if `OPENAI_API_KEY` is set) `gbrain embed --stale` — refresh vector index

## Step 2 — Verify

```bash
gbrain query "<a known PAI keyword>"
```

Backlink count and chunk count should both be higher than before.

---

### `/notion-sync status`

Show current sync state.

## Step 1 — Brain contents

```bash
gbrain list pages
```

## Step 2 — Scheduled task state

```powershell
schtasks /Query /TN gbrain-notion-sync /V /FO LIST
```

Reports `Next Run Time`, `Last Run Time`, `Last Result` (0 = success).

## Step 3 — Conflict markers (v0.3+)

Currently empty (Phase 3 not implemented). Will list `.conflict/` entries when
v0.3 ships.

---

### `/notion-sync doctor`

Comprehensive health check.

## Step 1 — Run

```bash
node "$env:CLAUDE_PLUGIN_ROOT/scripts/doctor.mjs"
```

Checks (in order):

1. `gbrain doctor` exit code is 0
2. `.env` exists and all seven keys are non-empty
3. Notion API reachable: GET each of the four `NOTION_DB_*` IDs
4. `gbrain put --help` succeeds (CLI alignment)
5. `${CLAUDE_PLUGIN_ROOT}/dist/` exists (build artifact present)

Exit code 0 if all pass, 1 if any check fails.

---

## Gotchas

- `GBRAIN_PLUGIN_PATH` must be an **absolute path**. Relative paths cause
  gbrain to silently skip the plugin.
- Windows `bun install` against gbrain dependencies fails without
  `--ignore-scripts` (gbrain issue #218 — bash-only postinstall scripts).
- The old `gbrain jobs submit gbrain_sync` syntax is **outdated**. Use the
  Task Scheduler entry installed by `/notion-sync schedule` instead.
- PGLite mode has no daemon supervisor. `gbrain jobs work` long-running
  worker is not supported; periodic execution must come from Task Scheduler.
- Notion API rate limit is 3 req/sec. `src/notion-client.ts` caps at 2 req/s
  to leave headroom — do not raise without testing.
- `.env` and `sync-state.db` are in `.gitignore`. Never commit them.
- `gbrain put` is the correct CLI command, **not** `gbrain page put`
  (alignment fix shipped in commit `c814887`).
- Pages with > 100 blocks are silently truncated. `fetchBlockChildren` does
  not paginate yet (planned for v0.4).

## Roadmap (not yet shipped)

- **v0.2** — Bidirectional sync (`/notion-sync push`), `sync-state.db`
- **v0.3** — Conflict detection (`/notion-sync conflicts`), `.conflict/` backup
- **v0.4** — Block type expansion (callout, toggle, database mention, file, image)
- **v0.5** — Auto embedding after sync (opt-in, requires `OPENAI_API_KEY`)

## Reference

- Setup guide: [RUNBOOK.md](../../RUNBOOK.md)
- Compatibility log: [docs/compat-matrix.md](../../docs/compat-matrix.md)
- gbrain repo: https://github.com/garrytan/gbrain
