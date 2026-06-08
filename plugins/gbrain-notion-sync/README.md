# gbrain-notion-sync

[![secret-scan](https://github.com/bouob/gbrain-notion-sync/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/bouob/gbrain-notion-sync/actions/workflows/secret-scan.yml)
[![typecheck](https://github.com/bouob/gbrain-notion-sync/actions/workflows/typecheck.yml/badge.svg)](https://github.com/bouob/gbrain-notion-sync/actions/workflows/typecheck.yml)
[![release](https://img.shields.io/github/v/release/bouob/gbrain-notion-sync)](https://github.com/bouob/gbrain-notion-sync/releases)

One-way Notion PAI second-brain to local [gbrain](https://github.com/garrytan/gbrain)
knowledge graph sync, packaged as a Claude Code plugin.

Notion is the source of truth; gbrain is an agent-friendly local mirror.

---

## What this gives you

The official Notion MCP server lets Claude Code read individual Notion pages
one at a time. That works for "open this page", but breaks down when you ask
things like "find me everything across my second brain related to X" — Notion's
API has no vector search, no graph traversal, and a 3 req/sec rate limit.

This plugin mirrors your four PAI databases (Projects, To-Do, Inbox, Knowledge
Base) into a local [gbrain](https://github.com/garrytan/gbrain) so Claude Code
can use gbrain's MCP tools instead:

- **Hybrid search** — keyword + (optional) vector + reciprocal rank fusion
- **Graph traversal** — backlinks, entities, timeline, salience
- **No rate limit** — local PostgreSQL (PGLite); query as fast as you want

You keep editing Notion normally; the plugin keeps the local mirror fresh.

---

## Quick start

> **Skip-able if you already have gbrain set up and a Notion integration
> sharing your PAI databases.** Otherwise [RUNBOOK.md](./RUNBOOK.md) has the
> full ten-minute walk-through with screenshots and copy-pasteable commands.

### 1. Install the plugin in Claude Code

```text
/plugin marketplace add bouob/gbrain-notion-sync
/plugin install gbrain-notion-sync@bouob
```

### 2. Install dependencies in the plugin directory

```bash
cd ~/.claude/plugins/marketplace/bouob/gbrain-notion-sync
bun install --ignore-scripts   # --ignore-scripts is required on Windows
bun run build
```

### 3. Interactive setup (recommended)

In Claude Code:

```text
/notion-sync init
```

Walks you through `.env` creation step by step:

- Pastes your Notion Integration Secret, **validated immediately** against `/v1/users/me`
- Pastes your Anthropic API key (optional — can leave blank)
- For each of the four PAI databases: paste **either** the Notion page URL **or** the 32-character UUID; the script extracts and formats the UUID for you, then validates the database is reachable with your integration
- Asks whether to install the Windows Task Scheduler entry now
- Writes `.env` for you, runs `doctor`, and offers to fire the first sync

If anything fails validation, init re-prompts the failing step without
restarting from scratch.

> **Prefer the terminal?** `cp .env.example .env && $EDITOR .env` still
> works — `init` is a convenience, not a requirement. See [RUNBOOK.md](./RUNBOOK.md)
> for the manual key-by-key walkthrough.

### 4. First sync

```text
/notion-sync pull
```

Watch the log. gbrain embeds each page on write, so the pull lands fully
vectorized and queryable.

Done. Your PAI is now mirrored into gbrain and ready to query.

---

## Daily workflow

### Automatic sync (recommended)

Install once, forget about it:

```text
/notion-sync schedule
```

This registers a Windows Task Scheduler entry that runs `bun run sync` every
15 minutes (configurable: `/notion-sync schedule --interval 5m`). Your local
brain stays within 15 minutes of Notion without any effort.

To check status, manually trigger, or uninstall:

```text
/notion-sync status      # next/last run + last exit code
/notion-sync schedule    # re-installs with current interval
schtasks /Run /TN gbrain-notion-sync   # run once now from any terminal
```

### Manual sync (when you want full control)

```text
/notion-sync pull        # one-shot Notion to gbrain (down)
/notion-sync push        # send local gbrain edits up to Notion
```

### Health check when something feels off

```text
/notion-sync doctor
```

Tells you exactly which prerequisite (env vars, build, gbrain CLI,
Notion token, four DB reachabilities) is broken.

---

## Example: what Claude can do after sync

Once the brain has your PAI content, ask Claude Code natural-language
questions that span multiple Notion pages and databases. Examples that
plain Notion MCP cannot answer well:

| Ask Claude... | What happens under the hood |
|---|---|
| "What inbox items relate to my Fintech project?" | `mcp__gbrain__search` across all DBs with reciprocal rank fusion |
| "Show everything I've written about Anthropic since March." | `mcp__gbrain__get_timeline` filtered by entity and date |
| "Who shows up most across my Knowledge Base?" | `mcp__gbrain__find_experts` over the people graph |
| "Are any of my to-dos contradicting each other?" | `mcp__gbrain__find_contradictions` |
| "What knowledge-base pages link to project X?" | `mcp__gbrain__get_backlinks` |

Claude Code picks the right gbrain tool automatically because the gbrain MCP
server is registered (see RUNBOOK.md Step 8).

---

## Sub-commands

| Sub-command | Purpose |
|---|---|
| `/notion-sync init` | Interactive first-time setup — collects keys + DB IDs, validates each, writes `.env` |
| `/notion-sync pull` | One-shot Notion → gbrain (down) |
| `/notion-sync push` | Send local gbrain edits → Notion (up-only) |
| `/notion-sync conflicts` | List diverged / body-unsupported pages |
| `/notion-sync schedule` | Install Windows Task Scheduler entry (default 15 min) |
| `/notion-sync status` | Show brain contents and scheduled task state |
| `/notion-sync doctor` | Full health probe (env keys + gbrain + Notion) |

See [skills/notion-sync/SKILL.md](./skills/notion-sync/SKILL.md) for the
full sub-command spec including expected output and exit codes.

---

## Prerequisites

- [Bun](https://bun.sh/) 1.2+ (for `bun install` and `bun run`)
- Node.js 20+ (the scripts run under `node`, not `bun`, for compatibility)
- [gbrain](https://github.com/garrytan/gbrain) 0.34.0+ globally linked
  (`bun link` inside the gbrain repo)
- Windows 10/11 — Task Scheduler integration is Windows-only in v0.1
  (macOS launchd and Linux systemd planned for v0.2)
- A Notion integration with read access to the four PAI databases

The full first-time setup (gbrain install, Notion integration creation,
sharing databases with the integration, MCP wiring for Claude Code) is in
[RUNBOOK.md](./RUNBOOK.md).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/notion-sync pull` exits with `Cannot import notion-client.js` | Build artifact missing | `bun run build` in plugin dir |
| `401 Unauthorized` from Notion | Token invalid or integration not shared with this DB | Re-copy token from Notion integration page, or share DB with the integration |
| `gbrain: command not found` | gbrain not globally linked | `cd ~/dev/gbrain && bun link` |
| Scheduled task never runs | `bun` not on Windows PATH when Task Scheduler invokes | Add bun to system PATH (not just user PATH) |
| Vector search returns nothing | gbrain's OpenAI key missing/invalid in `~/.gbrain/config.json` (gbrain embeds on write using it) | Fix the key in `~/.gbrain/config.json`, restart `gbrain serve`, then re-pull to re-embed |
| Pages with > 100 blocks truncated | Known v0.1 limitation; `fetchBlockChildren` doesn't paginate | Wait for v0.4 or PR a fix |
| HTTP sync stops after first page | `getPage()` falling back to local CLI after HTTP write | Run `bun run build` to get the latest adapter; ensure both `GBRAIN_HTTP_URL` and `GBRAIN_HTTP_TOKEN` are set |
| `{"error":"invalid_token"}` from gbrain HTTP | `GBRAIN_HTTP_TOKEN` is set to a `client_secret` (`gbrain_cs_...`) instead of an `access_token` | Re-run Step 3 in RUNBOOK.md to exchange credentials for an `access_token` |
| `Cannot GET /admin` | Admin URL missing trailing slash | Use `http://localhost:7432/admin/` (trailing slash required) |

For everything else: `/notion-sync doctor` is the first stop. It tells you
which prerequisite is failing.

---

## Project layout

```
.
|-- .claude-plugin/         Plugin manifest (plugin.json, marketplace.json)
|-- skills/notion-sync/     SKILL.md - the /notion-sync slash command
|-- src/                    TypeScript source (Notion client, block converter, gbrain adapter)
|-- scripts/                Executable scripts (sync-pull, sync, doctor, install-task)
|-- subagents/              gbrain plugin subagent definition
|-- docs/compat-matrix.md   gbrain version compatibility log
|-- tests/                  Smoke test scaffold
|-- gbrain.plugin.json      gbrain plugin manifest (separate from Claude plugin)
|-- RUNBOOK.md              Setup guide
|-- CHANGELOG.md            Release history (managed by release-please)
`-- .env.example            Template - copy to .env and fill in
```

---

## Architecture

```
[Notion PAI DB]
       |
       | (1) Task Scheduler triggers every N minutes
       v
[scripts/sync-pull.mjs] --- (2) NOTION_DB_* -> fetch blocks -> markdown
       |
       | (3) `gbrain put <slug> --content <md>` per page
       v
[gbrain -> Supabase Postgres + pgvector]   (embeds on write)
       |
       | (4) Claude Code queries via gbrain MCP
       v
[gbrain query / mcp__gbrain__*]
```

gbrain embeds each page on write (key in `~/.gbrain/config.json`), so a pull
lands fully vectorized — no separate post-processing step. `push` sends local
gbrain edits back up to Notion (up-only).

---

## Status

v0.1 ships Phase 1 (one-way Notion to gbrain pull) only.

| Phase | Status |
|---|---|
| Phase 1 - One-way pull | Shipped in v0.1 |
| Phase 2 - Bidirectional sync, `sync-state.db` | Planned v0.2 |
| Phase 3 - Conflict detection, `.conflict/` backup | Planned v0.3 |
| Phase 4 - Extended block types (callout, toggle, ...) | Planned v0.4 |
| Phase 5 - Auto embedding after sync | Planned v0.5 |

See [CHANGELOG.md](./CHANGELOG.md) for release history.

---

## Contributing

This is primarily a personal plugin, but issues and PRs are welcome.
The repo is mirrored from a monorepo via the `/publicpr` tool; for substantial
changes, please open an issue first so we can coordinate.

---

## License

MIT. See [LICENSE](./LICENSE).
