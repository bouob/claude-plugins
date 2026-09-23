# gbrain-notion-sync

[English](./README.md)

[![secret-scan](https://github.com/bouob/gbrain-notion-sync/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/bouob/gbrain-notion-sync/actions/workflows/secret-scan.yml)
[![typecheck](https://github.com/bouob/gbrain-notion-sync/actions/workflows/typecheck.yml/badge.svg)](https://github.com/bouob/gbrain-notion-sync/actions/workflows/typecheck.yml)
[![release](https://img.shields.io/github/v/release/bouob/gbrain-notion-sync)](https://github.com/bouob/gbrain-notion-sync/releases)

將 Notion PAI 第二大腦單向同步到本地 [gbrain](https://github.com/garrytan/gbrain)
知識圖譜，打包成 Claude Code plugin。

Notion 是真相源；gbrain 是對 agent 友善的本地鏡像。

---

## 這個 plugin 給你什麼

官方 Notion MCP server 讓 Claude Code 一次讀取一個 Notion 頁面。「打開這一頁」
沒問題，但問到「幫我找出第二大腦裡所有跟 X 有關的內容」就不行了 —— Notion API
沒有向量搜尋、沒有圖譜遍歷，還有 3 req/sec 的速率限制。

這個 plugin 把你承載知識的 PAI 資料庫（Projects、Inbox、Knowledge Base）
鏡像到本地 [gbrain](https://github.com/garrytan/gbrain)，讓 Claude Code 改用
gbrain 的 MCP 工具：（To-Do 不同步——已完成的任務沒有可檢索的 body）

- **混合搜尋** —— 關鍵字 +（可選）向量 + reciprocal rank fusion
- **圖譜遍歷** —— 反向連結、實體、時間軸、salience
- **沒有速率限制** —— 本地 PostgreSQL（PGLite），想查多快就查多快

你照常在 Notion 編輯；plugin 負責讓本地鏡像保持新鮮。

---

## Quick start

> **如果你已經裝好 gbrain、也建好共用 PAI 資料庫的 Notion integration，可以跳過
> 前置步驟。** 否則 [RUNBOOK.md](./RUNBOOK.md) 有完整十分鐘導覽，含截圖與可直接
> 複製的指令。

### 1. 在 Claude Code 安裝 plugin

```text
# 透過 bouob-plugins marketplace（推薦）
/plugin marketplace add bouob/claude-plugins
/plugin install gbrain-notion-sync@bouob-plugins

# 或直接從本 repo 安裝
/plugin marketplace add bouob/gbrain-notion-sync
/plugin install gbrain-notion-sync@gbrain-notion-sync
```

### 2. 在 plugin 目錄安裝依賴

```bash
cd ~/.claude/plugins/marketplace/bouob/gbrain-notion-sync
bun install --ignore-scripts   # Windows 上必須加 --ignore-scripts
bun run build
```

### 3. 互動式設定（推薦）

在 Claude Code 內：

```text
/notion-sync init
```

逐步引導你建立 `.env`：

- 貼上 Notion Integration Secret，**立即**用 `/v1/users/me` 驗證
- 貼上 Anthropic API key（選填 —— 可留空）
- 三個 PAI 資料庫逐一設定：貼 Notion 頁面 URL **或** 32 字元 UUID 皆可；
  腳本會自動抽取並格式化 UUID，再驗證你的 integration 能否存取該資料庫
- 詢問是否現在安裝 Windows 工作排程器項目
- 自動寫入 `.env`、執行 `doctor`，並詢問是否立刻跑第一次同步

任一步驗證失敗時，init 只會重問失敗的那一步，不必從頭來過。

> **偏好終端機？** `cp .env.example .env && $EDITOR .env` 一樣可行 ——
> `init` 是便利功能，不是必要條件。手動逐鍵設定流程見 [RUNBOOK.md](./RUNBOOK.md)。

### 4. 第一次同步

```text
/notion-sync pull
```

看著 log 跑完即可。gbrain 在寫入時就會嵌入每一頁，所以 pull 完成時內容已
完整向量化、可直接查詢。

完成。你的 PAI 已鏡像進 gbrain，隨時可查。

---

## 日常工作流程

### 自動同步（推薦）

裝一次就不用管：

```text
/notion-sync schedule
```

這會註冊一個 Windows 工作排程器項目，每 15 分鐘跑一次 `bun run sync`
（可調整：`/notion-sync schedule --interval 5m`）。本地大腦與 Notion 的差距
不超過 15 分鐘，零維護成本。

查狀態、手動觸發、或解除安裝：

```text
/notion-sync status      # 下次/上次執行時間 + 最後 exit code
/notion-sync schedule    # 以目前的 interval 重新安裝
schtasks /Run /TN gbrain-notion-sync   # 在任何終端機立刻跑一次
```

### 手動同步（想要完全控制時）

```text
/notion-sync pull        # 單次 Notion → gbrain（下行）
/notion-sync push        # 將本地 gbrain 編輯上行到 Notion
```

### 覺得怪怪的時候做健康檢查

```text
/notion-sync doctor
```

明確告訴你是哪個前置條件壞了（環境變數、build、gbrain CLI、
Notion token、三個資料庫的可達性）。

---

## 範例：同步後 Claude 能做什麼

大腦有了你的 PAI 內容後，就能問 Claude Code 跨多個 Notion 頁面與資料庫的
自然語言問題。以下是純 Notion MCP 答不好的例子：

| 問 Claude… | 底層發生什麼 |
|---|---|
| 「哪些 inbox 項目跟我的 Fintech 專案有關？」 | `mcp__gbrain__search` 以 reciprocal rank fusion 跨所有資料庫搜尋 |
| 「列出我三月以來寫過所有關於 Anthropic 的內容。」 | `mcp__gbrain__get_timeline` 依實體與日期過濾 |
| 「我的 Knowledge Base 裡誰出現最多次？」 | `mcp__gbrain__find_experts` 掃 people graph |
| 「我的待辦有沒有互相矛盾的？」 | `mcp__gbrain__find_contradictions` |
| 「哪些知識庫頁面連到專案 X？」 | `mcp__gbrain__get_backlinks` |

因為 gbrain MCP server 已註冊（見 RUNBOOK.md Step 8），Claude Code 會自動
挑對的 gbrain 工具。

---

## 子命令

| 子命令 | 用途 |
|---|---|
| `/notion-sync init` | 互動式首次設定 —— 收集金鑰 + 資料庫 ID、逐一驗證、寫入 `.env` |
| `/notion-sync pull` | 單次 Notion → gbrain（下行） |
| `/notion-sync push` | 將本地 gbrain 編輯上行 → Notion（僅上行） |
| `/notion-sync conflicts` | 列出分歧 / body 不支援的頁面 |
| `/notion-sync schedule` | 安裝 Windows 工作排程器項目（預設 15 分鐘） |
| `/notion-sync status` | 顯示大腦內容與排程任務狀態 |
| `/notion-sync doctor` | 完整健康探測（環境金鑰 + gbrain + Notion） |

完整子命令規格（含預期輸出與 exit codes）見
[skills/notion-sync/SKILL.md](./skills/notion-sync/SKILL.md)。

---

## 前置需求

- [Bun](https://bun.sh/) 1.2+（供 `bun install` 與 `bun run`）
- Node.js 20+（腳本為相容性以 `node` 執行，不是 `bun`）
- [gbrain](https://github.com/garrytan/gbrain) 0.34.0+ 全域連結
  （在 gbrain repo 內 `bun link`）
- Windows 10/11 —— v0.1 的工作排程器整合僅支援 Windows
  （macOS launchd 與 Linux systemd 排在 v0.2）
- 一個對三個 PAI 資料庫有讀取權限的 Notion integration

完整首次設定（gbrain 安裝、建立 Notion integration、把資料庫分享給
integration、Claude Code 的 MCP 接線）見 [RUNBOOK.md](./RUNBOOK.md)。

---

## 疑難排解

| 症狀 | 可能原因 | 解法 |
|---|---|---|
| `/notion-sync pull` 出現 `Cannot import notion-client.js` | 缺 build 產物 | 在 plugin 目錄 `bun run build` |
| Notion 回 `401 Unauthorized` | Token 無效，或 integration 沒被分享這個資料庫 | 從 Notion integration 頁重新複製 token，或把資料庫分享給 integration |
| `gbrain: command not found` | gbrain 沒有全域連結 | `cd ~/dev/gbrain && bun link` |
| 排程任務從不執行 | 工作排程器呼叫時 `bun` 不在 Windows PATH | 把 bun 加進系統 PATH（不是只加使用者 PATH） |
| 向量搜尋查不到東西 | gbrain 的 OpenAI key 在 `~/.gbrain/config.json` 缺漏/無效（gbrain 寫入時用它做嵌入） | 修正 `~/.gbrain/config.json` 的 key，重啟 `gbrain serve`，再重新 pull 重嵌入 |
| 超過 100 個區塊的頁面被截斷 | v0.1 已知限制；`fetchBlockChildren` 未分頁 | 等 v0.4 或發 PR 修 |
| HTTP 同步在第一頁後停住 | `getPage()` 在 HTTP 寫入後 fallback 到本地 CLI | `bun run build` 取得最新 adapter；確認 `GBRAIN_HTTP_URL` 與 `GBRAIN_HTTP_TOKEN` 都有設 |
| gbrain HTTP 回 `{"error":"invalid_token"}` | `GBRAIN_HTTP_TOKEN` 填成 `client_secret`（`gbrain_cs_...`）而非 `access_token` | 重跑 RUNBOOK.md Step 3 交換 credentials 取得 `access_token` |
| `Cannot GET /admin` | Admin URL 少了結尾斜線 | 用 `http://localhost:7432/admin/`（結尾斜線必要） |

其他問題：先跑 `/notion-sync doctor`，它會告訴你是哪個前置條件失敗。

---

## 專案結構

```
.
|-- .claude-plugin/         Plugin manifest（plugin.json、marketplace.json）
|-- skills/notion-sync/     SKILL.md —— /notion-sync slash command
|-- src/                    TypeScript 原始碼（Notion client、block converter、gbrain adapter）
|-- scripts/                可執行腳本（sync-pull、sync、doctor、install-task）
|-- subagents/              gbrain plugin 的 subagent 定義
|-- docs/compat-matrix.md   gbrain 版本相容性紀錄
|-- tests/                  Smoke test 骨架
|-- gbrain.plugin.json      gbrain plugin manifest（與 Claude plugin 分開）
|-- RUNBOOK.md              設定指南
|-- CHANGELOG.md            版本歷史（由 release-please 管理）
`-- .env.example            範本 —— 複製為 .env 後填值
```

---

## 架構

```
[Notion PAI DB]
       |
       | (1) 工作排程器每 N 分鐘觸發
       v
[scripts/sync-pull.mjs] --- (2) NOTION_DB_* -> 抓取區塊 -> markdown
       |
       | (3) 每頁執行 `gbrain put <slug> --content <md>`
       v
[gbrain -> Supabase Postgres + pgvector]   （寫入時嵌入）
       |
       | (4) Claude Code 經 gbrain MCP 查詢
       v
[gbrain query / mcp__gbrain__*]
```

gbrain 在寫入時就嵌入每一頁（key 在 `~/.gbrain/config.json`），所以 pull
完成即完整向量化 —— 不需要另外的後處理步驟。`push` 把本地 gbrain 編輯
上行回 Notion（僅上行）。

---

## 狀態

v0.1 只出貨 Phase 1（單向 Notion → gbrain pull）。

| Phase | 狀態 |
|---|---|
| Phase 1 —— 單向 pull | v0.1 已出貨 |
| Phase 2 —— 雙向同步、`sync-state.db` | 規劃 v0.2 |
| Phase 3 —— 衝突偵測、`.conflict/` 備份 | 規劃 v0.3 |
| Phase 4 —— 擴充區塊類型（callout、toggle …） | 規劃 v0.4 |
| Phase 5 —— 同步後自動嵌入 | 規劃 v0.5 |

版本歷史見 [CHANGELOG.md](./CHANGELOG.md)。

---

## 貢獻

這主要是個人用 plugin，但歡迎 issue 與 PR。
本 repo 由 monorepo 經 `/publicpr` 工具鏡像；重大變更請先開 issue 協調。

---

## License

MIT。見 [LICENSE](./LICENSE)。
