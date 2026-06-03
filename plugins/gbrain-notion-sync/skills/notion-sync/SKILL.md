---
name: notion-sync
description: >
  Sync the Notion PAI second-brain (Projects, To-Do, Inbox, Knowledge Base)
  with the local gbrain knowledge graph. Pull mirrors Notion into gbrain;
  push reconciles local gbrain edits back to Notion (bidirectional — Notion
  wins on conflict). Includes interactive first-time init and gbrain
  post-processing hooks.
  Use when the user says /notion-sync, init notion sync, setup notion sync,
  sync notion, pull notion, push notion, refresh brain, notion sync status,
  notion sync conflicts, run notion postprocess, notion sync doctor,
  初始化 notion, 設定 notion sync, 同步 notion, 拉取 notion, 推回 notion,
  雙向同步, 跑後處理, brain 沒更新, 檢查 notion 同步, notion 衝突,
  capture, 記進腦, 存到 brain, 把這次學到的記下來.
  Sub-commands: init, setup, pull, push, conflicts, schedule, postprocess,
  status, doctor, capture.
  Do NOT use for: ad-hoc Notion page edits (use Notion MCP tools like
  notion-update-page), general gbrain queries (use mcp__gbrain__* directly),
  or installing gbrain itself (use gbrain CLI per RUNBOOK.md Step 1).
argument-hint: "[init|setup|pull|push|conflicts|schedule|postprocess|status|doctor|capture]"
allowed_tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
---

# /notion-sync

Bidirectional Notion PAI ↔ gbrain sync pipeline, packaged as a Claude Code plugin.

Notion is the human interface and wins on conflict; gbrain is an agent-friendly
local mirror with hybrid search and graph traversal. Pull mirrors Notion into
gbrain; push reconciles local gbrain edits back to Notion.

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
bun scripts/sync-pull.mjs
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
bun "$env:CLAUDE_PLUGIN_ROOT/scripts/sync-pull.mjs" --database projects --dry-run
```

Expected: lists page titles from Projects database without writing to gbrain.
If `401 Unauthorized`, the integration is not shared with the database
(see RUNBOOK.md Step 4).

---

### `/notion-sync pull`

One-shot sync from Notion into gbrain. Also seeds `sync-state.db` so a later
`/notion-sync push` has a baseline.

## Step 1 — Dry-run first

```bash
bun "$env:CLAUDE_PLUGIN_ROOT/scripts/sync-pull.mjs" --database <db-name> --dry-run
```

`<db-name>` is one of: `projects`, `todo`, `inbox`, `knowledge`.

Review the listed pages. Stop here if the count looks wrong (token expired,
wrong DB ID, or integration not shared).

## Step 2 — Execute pull

```bash
bun "$env:CLAUDE_PLUGIN_ROOT/scripts/sync-pull.mjs" --database <db-name>
```

The script fetches all pages, extracts writable properties into frontmatter
(`src/notion-properties.ts`), converts Notion blocks to Markdown
(`src/block-converter.ts`), upserts to gbrain (`src/gbrain-adapter.ts`), and
records the post-write baseline in `sync-state.db`.

## Step 3 — Confirm

```bash
gbrain list --limit 1000 | wc -l
```

Compare against Step 1's dry-run count.

---

### `/notion-sync push`

Bidirectional reconcile: classify every gbrain page against Notion and act.
Notion wins on a dual-edit conflict (local version backed up to `.conflict/`).

## Step 1 — Dry-run first

```bash
cd "$CLAUDE_PLUGIN_ROOT" && bun run push:dry
```

Prints the four-quadrant classification for every page (skip / to_notion /
to_brain / conflict / created) without writing anything. Review before
executing.

## Step 2 — Execute push

```bash
cd "$CLAUDE_PLUGIN_ROOT" && bun run push
```

For each page `scripts/sync.mjs` compares the live Notion state and the gbrain
page against the `sync-state.db` baseline:

- **to_notion** — local edit pushed to Notion (properties via `pages.update`;
  body only if the Notion page has no converter-unsupported blocks).
- **to_brain** — Notion is newer; the gbrain page is refreshed.
- **conflict** — both sides changed; Notion wins, local backed up to `.conflict/`.
- **created** — a gbrain page with no `notion_page_id` is created in Notion
  (allowed only into Inbox or Knowledge Base).

## Step 3 — Review conflicts

If the summary reports `conflict > 0`, run `/notion-sync conflicts`.

Requires a prior `/notion-sync pull` to seed the baseline.

---

### `/notion-sync capture`

Capture a reusable insight learned during this session as a new gbrain
knowledge note — immediately searchable, and created in the Notion 知識庫 on
the next push. Use when the user says capture / 記進腦 / 存到 brain /
把這次學到的記下來.

The body markdown is read from **stdin**; metadata comes from flags. Compose
the note from the session yourself, then pipe it in.

## Step 1 — Assemble the note

Pick a short `--title`, a `--category` (技術 / 工具 / 職涯 / 生活 / 投資,
default 技術), and write the insight as self-contained markdown — it will live
on its own, not inside this conversation's context.

## Step 2 — Write it into gbrain

```bash
cd "$CLAUDE_PLUGIN_ROOT" && bun scripts/capture.mjs --title "標題" --category 技術 <<'EOF'
<markdown body of the insight>
EOF
```

Optional flags: `--status`（default 精華）、`--tags "a,b"`、`--summary "一句話"`.

On success it prints the gbrain slug and chunk count. The note is written
**without** `notion_page_id`, so the next `/notion-sync push` classifies it as
`created` and adds it to the Notion 知識庫.

## Step 3 — Verify (optional)

```bash
cd "$CLAUDE_PLUGIN_ROOT" && bun scripts/recall.mjs "<title keyword>"
```

## Gotchas

- Body MUST arrive via stdin (heredoc). Running with no pipe exits 1 with
  `pipe the note markdown via stdin`.
- `--category` MUST be one of 技術 / 工具 / 職涯 / 生活 / 投資 (the Notion 知識庫
  「類別」 options); any other value exits 1.
- Needs `GBRAIN_HTTP_URL` + `GBRAIN_HTTP_TOKEN` in `.env` (HTTP mode); otherwise
  the CLI fallback contends with the running `gbrain serve` PGLite lock.
- `source: knowledge` is hardcoded — push only ever creates Inbox/Knowledge
  pages, never Projects/To-Do.

---

### `/notion-sync conflicts`

List unresolved sync conflicts recorded in `sync-state.db`.

## Step 1 — List

```bash
cd "$CLAUDE_PLUGIN_ROOT" && bun scripts/sync.mjs --conflicts
```

Each entry shows the gbrain slug, detection time, and the `.conflict/` backup
path holding the local version that lost to Notion.

## Step 2 — Resolve manually

Open the backup file, compare with the current Notion page, and merge by hand
if the local version had wanted changes. The full audit trail is appended to
`~/.notion-sync/conflicts.jsonl`.

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

1. `gbrain extract links --source db` — rebuild backlink graph
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

## Step 3 — Unresolved conflicts

```bash
cd "$CLAUDE_PLUGIN_ROOT" && bun scripts/sync.mjs --conflicts
```

Lists dual-edit conflicts pending manual resolution (empty if none).

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
- `.env`, `sync-state.db`, and `.conflict/` are in `.gitignore`. Never commit them.
- `gbrain put` is the correct CLI command, **not** `gbrain page put`
  (alignment fix shipped in commit `c814887`).
- `pull` and `push` run under **`bun`**, not `node` — they load
  `sync-state.js`, which imports `bun:sqlite`. `postprocess` / `doctor`
  stay on `node`.
- Push never creates a Notion property or select option. A frontmatter value
  not present in the live Notion schema is skipped with a warning.
- Body push is blocked when the Notion page contains converter-unsupported
  blocks (callout, table, toggle, ...) — properties still sync, and the
  divergence is recorded as a conflict.
- `gbrain get` / `gbrain list` print human-readable text, not JSON — there is
  no `--json` flag (see docs/gbrain-cli-signatures.md).

## Roadmap (not yet shipped)

- **v0.4** — Block type expansion (callout, toggle, database mention, file, image)
- **v0.5** — Auto embedding after sync (opt-in, requires `OPENAI_API_KEY`)

## Reference

- Setup guide: [RUNBOOK.md](../../RUNBOOK.md)
- Compatibility log: [docs/compat-matrix.md](../../docs/compat-matrix.md)
- gbrain repo: https://github.com/garrytan/gbrain

## 2026-05-25 HTTP/OAuth 實測備註（給代理）

當使用者改走 `gbrain serve --http` 時，先套用以下規則：

- Admin UI 用 `http://localhost:7432/admin/`，不是 `/admin`
- 不要硬猜 token endpoint；先看 `/.well-known/oauth-authorization-server`
- 目前實測 token endpoint 是 `http://localhost:7432/token`
- `GBRAIN_HTTP_URL` 應填主機根位址，例如 `http://localhost:7432`，不要加 `/mcp`
- `GBRAIN_HTTP_TOKEN` 必須是 OAuth `access_token`
- 若 `.env` 內是 `gbrain_cs_...`，那是 `client_secret`，不是 token；同步會回 `401 invalid_token`
- 若同步停在第一頁且最後一行是 `Wrote ... created_or_updated`，優先檢查 adapter 是否又回退到本機 CLI 讀頁面

2026-05-25 已修正 `src/gbrain-adapter.ts`，讓 HTTP 模式下的 `getPage()` 也走 MCP `get_page`，避免 PGLite lock / 等待卡住。
