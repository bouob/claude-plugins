# notion-sync RUNBOOK

> **對象**：執行環境準備的使用者（Generator 不會代勞這些步驟）
>
> **前置條件**：已完成 `gbrain` v0.34.0+ 安裝；`bun` 1.2+ 與 `node` v20+ 已在 PATH

---

## 警告：plan.md 第 418-420 行指令已過時

plan.md 中原本的排程指令如下（**錯誤，請勿使用**）：

```bash
# 錯誤（outdated）— gbrain_sync 不是合法的 job 類型
gbrain jobs submit gbrain_sync --params ...
```

`gbrain_sync` 作為 job 類型是**不正確/過時的**（incorrect / outdated）。正確格式見下方「定期同步」章節。

---

## 推薦：互動式 setup（v0.1.1+）

完成 gbrain 安裝（Step 1）與 Notion Integration 建立 + 分享 4 個 PAI 資料庫（Step 2、Step 4）後，**其餘步驟可用 `/notion-sync init` 一次跑完**（v0.1.1+）：

```text
/notion-sync init
```

Claude Code 會用對話方式依序問你：

1. 是否覆蓋既有 `.env`（若存在）
2. Notion Integration Secret（即時 GET `/v1/users/me` 驗證）
3. Anthropic API Key（可空）
4. 4 個 PAI 資料庫的 **頁面 URL 或 UUID**（每個都即時 GET `/v1/databases/{id}` 驗證）
5. 是否安裝 Windows Task Scheduler 定時 sync
6. 是否立即跑第一次 sync

每步若驗證失敗會就地重問（不會從頭開始）。寫好 `.env` 後會自動跑 `doctor` 確認 7 項都過。

> **想用 terminal / 不在 Claude Code 裡？** 下面的九步驟手動流程仍可用（Step 3 的 `cp .env.example .env` + 編輯器手填）。`/notion-sync init` 是便利，不是必須。

---

## 九個必要步驟（按順序執行）

### Step 1 — 安裝並全域連結 gbrain

```bash
git clone https://github.com/garrytan/gbrain
cd gbrain
bun install
bun link
```

驗證：`gbrain --version` 應印出版本號。

---

### Step 2 — 建立 Notion Integration

1. 開啟 https://notion.so/my-integrations
2. 點擊「New integration」
3. 名稱建議：`gbrain-sync`
4. 勾選所需權限（至少 Read content、Update content、Insert content）
5. 點擊「Submit」

---

### Step 3 — 取得 NOTION_TOKEN 並填入 .env

1. 在剛建立的 integration 頁面，複製 **Internal Integration Secret**
2. 將 `notion-sync/.env.example` 複製為 `notion-sync/.env`：

   ```bash
   cp .env.example .env
   ```

3. 編輯 `.env`，填入實際值：

   ```env
   NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
   GBRAIN_PLUGIN_PATH=/absolute/path/to/notion-sync
   ```

   **注意**：不要把真實 token 提交到 git（`.env` 已在 `.gitignore`）。

---

### Step 4 — 在 Notion UI 分享 Integration 給 4 個 PAI 資料庫

在 Notion 中，逐一開啟以下四個資料庫頁面，點擊右上角「...」→「Connections」→「Add connections」→ 選擇 `gbrain-sync`：

1. 🎯 **Projects**
2. ✔️ **To-Do**
3. 📥 **Inbox**
4. 💬 **知識庫**

---

### Step 5 — 設定環境變數

確認 `.env` 中以下三個 key 均已填入：

| 變數 | 說明 |
|---|---|
| `NOTION_TOKEN` | Step 3 取得的 Integration Secret |
| `ANTHROPIC_API_KEY` | Anthropic API 金鑰 |
| `GBRAIN_PLUGIN_PATH` | 本目錄的絕對路徑（例如 `/home/user/notion-sync`）|

---

### Step 5.5 — 安裝 notion-sync 相依套件

```bash
cd notion-sync
bun install --ignore-scripts
```

`--ignore-scripts` 是 Windows 必需（gbrain issue #218：postinstall 用 bash `>/dev/null` 在 PowerShell 解析失敗）。

驗證：`ls node_modules/@notionhq/client/package.json` 應存在。

---

### Step 5.6 — 編譯 TypeScript 來源

```bash
bun run build
```

驗證：`ls dist/` 應列出 `notion-client.js`、`block-converter.js`、`gbrain-adapter.js`（連同 `.d.ts` 與 `.map`）。若 `dist/` 為空，跑 `bun run typecheck` 看 TS 錯誤。

---

### Step 6 — 初始化 gbrain（0.35.x 自動完成，可略過）

gbrain 0.35.x 起改為 **lazy-init**：首次跑任何 gbrain 命令時（例如後面的 `gbrain doctor`）會自動建立預設 PGLite brain 於 `~/.gbrain/`，並進入互動式 search mode 選擇。

若你想明確跑：

```bash
gbrain init
```

互動式設定：
- Storage backend：選 **PGLite**（無需外部 DB）
- Search mode：選 **balanced**（推薦；不依賴 OpenAI key）

注意 search mode 互動式 prompt 有 60 秒 timeout，超時會 default 為 `conservative`。可事後改：

```bash
gbrain config set search.mode balanced
```

---

### Step 7 — 驗證健康狀態

```bash
gbrain doctor
```

所有項目應顯示 OK 或 PASS。若有失敗，依提示修復後重新執行。

---

### Step 8 — 設定 Claude Code MCP

編輯 `~/.claude.json`（或 Claude Code 的 `settings.json`），加入 gbrain MCP 項目。

參考官方部署文件：https://github.com/garrytan/gbrain/blob/master/docs/mcp/DEPLOY.md

範例（格式依官方文件為準）：

```json
{
  "mcpServers": {
    "gbrain": {
      "command": "gbrain",
      "args": ["mcp"],
      "env": {
        "GBRAIN_PLUGIN_PATH": "/absolute/path/to/notion-sync"
      }
    }
  }
}
```

---

### Step 9 — 驗證 Notion 真實連線

```bash
node scripts/sync-pull.mjs --database projects --dry-run
```

預期輸出（dry-run 不實際寫入 gbrain）：

```
[sync-pull] DRY-RUN mode — no data will be written to gbrain
[sync-pull] Starting pull for: projects
[sync-pull] Fetching pages from database: projects
[sync-pull] Found N pages
[DRY-RUN] projects :: <page-uuid> :: "<title>"
         markdown: 123 chars, 8 lines
         preview: # Heading / paragraph text / - bullet
...
[sync-pull] Pull complete.
```

若出現錯誤，確認 `NOTION_TOKEN` 和 Step 4 的分享設定。常見錯誤：

- `Run \`bun run build\` first` → 漏跑 Step 5.6
- `401 Unauthorized` → `NOTION_TOKEN` 錯誤或 integration 未分享給該 DB

---

## 定期同步（Windows Task Scheduler，由 plugin 管理）

gbrain 的 PGLite 模式沒有常駐 daemon supervisor，因此定期排程必須由外部工具管理。v0.1 起改用 plugin 內建的 `scripts/install-task.ps1` 一鍵安裝（取代過去手動操作 taskschd.msc 的流程）。

### 安裝（Claude Code 內）

在 Claude Code 跑：

```
/notion-sync schedule
```

內部執行的指令等同：

```powershell
powershell -ExecutionPolicy Bypass -File "$env:CLAUDE_PLUGIN_ROOT\scripts\install-task.ps1" -Interval 15m
```

預設 15 分鐘執行一次。可改：`-Interval 5m`、`-Interval 30m`、`-Interval 1h`。

### 檢查狀態

```powershell
powershell -ExecutionPolicy Bypass -File "$env:CLAUDE_PLUGIN_ROOT\scripts\install-task.ps1" -Status
```

回報 `Next Run Time`、`Last Run Time`、`Last Result`（0 = 成功）。

### 手動觸發一次

```powershell
schtasks /Run /TN gbrain-notion-sync
```

### 移除

```powershell
powershell -ExecutionPolicy Bypass -File "$env:CLAUDE_PLUGIN_ROOT\scripts\install-task.ps1" -Uninstall
```

### 已棄用的舊指令（v0.0）

過去計畫文件提到的 `gbrain jobs submit gbrain_sync` 已過時，請勿使用。v0.1 改採 Task Scheduler 直接觸發 `bun run sync`，不經 Minions job queue（PGLite 模式下 Minions worker 無法常駐，繞道反而增加失敗點）。

---

## 雙向同步（push，Phase 2）

`pull` 把 Notion 鏡射進 gbrain；`push` 把 gbrain 的本地變更回寫 Notion。push 為**手動觸發**（無自動排程）。

### 前置：先 pull 建立基線

`push` 倚賴 `sync-state.db` 的基線判斷「哪些頁面變過」。第一次使用前必須先 `bun run sync`（pull），它會 seed 基線。

### 預覽（dry-run）

```
/notion-sync push        # → 內部先跑 push:dry
```

等同 `bun run push:dry`。印出每頁的四象限分類，不寫入任何資料：

- `skip` — 兩邊都沒變
- `to_notion` — 本地改了 → 回寫 Notion（屬性走 `pages.update`；body 僅在 Notion 頁無不支援 block 時覆寫）
- `to_brain` — Notion 較新 → 重新整理 gbrain 頁
- `conflict` — 雙改 → **Notion 贏**，本地版備份到 `.conflict/`，Notion 頁留 comment
- `created` — gbrain 頁無 `notion_page_id` → 在 Notion 建新頁（僅限 Inbox / 知識庫）

### 執行

```
bun run push
```

### 衝突處理

```
bun scripts/sync.mjs --conflicts
```

列出未解衝突。每筆顯示 gbrain slug、偵測時間、`.conflict/` 備份路徑。完整 audit trail 在 `~/.notion-sync/conflicts.jsonl`。手動比對備份與 Notion 現況後自行合併。

### Gotchas

- `pull` / `push` 都用 **`bun`** 跑（載入 `sync-state.js` → `bun:sqlite`），不可用 `node`。
- push 不會在 Notion 新增屬性欄位或 select 選項 — 不存在的值會被略過並 warn。
- 新頁的 `source` frontmatter 必須是 `inbox` 或 `knowledge`，否則略過（不允許 agent 建 Projects/To-Do 頁）。

---

## 後處理（重整 gbrain 圖譜）

`/notion-sync pull` 只做 Notion → gbrain 寫入。要重新抽取 backlinks、跑 dream consolidation、更新 vector index（如有 `OPENAI_API_KEY`），跑：

```
/notion-sync postprocess
```

內部執行：

1. `gbrain extract links --source notion`
2. `gbrain dream --dry-run`
3. （若 `OPENAI_API_KEY` 存在）`gbrain embed --stale`

每步失敗不擋下一步。Exit code：全成功 0；部分失敗 1；fatal 2。

---

## 健康檢查

排查問題時跑：

```
/notion-sync doctor
```

七項檢查（順序）：
1. `.env` 存在且 7 個必要 key 都有值
2. `dist/` build artifact 存在
3. `gbrain` CLI 在 PATH 上且 `gbrain doctor` exit 0
4. `gbrain put --help` 成功（CLI 對齊驗證）
5. Notion token 有效（GET `/v1/users/me`）
6. 4 個 `NOTION_DB_*` 各自可達（GET `/v1/databases/{id}`）

---

## HTTP Server Mode（Lock-Free Sync）

### 為什麼需要

`gbrain serve`（stdio MCP，Claude Code 使用）與 `gbrain put`（CLI，sync script 使用）都需要 PGLite 單寫者鎖。兩者同時執行會報 `MultiXactId has not been created yet` 或 lock timeout。

解法：改用 `gbrain serve --http` 作為**唯一**的 PGLite 擁有者，Claude Code 和 sync scripts 都透過 HTTP 連線。

### 遷移步驟（一次性，5-10 分鐘）

**前置：關閉 Claude Code**（停止 stdio MCP server，釋放 PGLite 鎖）

**Step 1：啟動 HTTP server，取得 bootstrap token**

```powershell
# 在 PowerShell 開新視窗執行（保持此視窗開著）
gbrain serve --http --port 7432 --token-ttl 31536000
# 輸出會包含：Admin bootstrap token: gbr_live_xxxx...
# 記下這個 token
```

**Step 2：開啟 admin dashboard，註冊 OAuth 客戶端**

1. 瀏覽 `http://localhost:7432/admin/`，貼入 bootstrap token 登入（**尾端斜線必要**，少斜線會 `Cannot GET /admin`）
2. 點擊「Register client」
3. 填入：
   - Name: `notion-sync`
   - Grant types: `client_credentials`（機器對機器）
   - Scopes: `read` + `write`
4. 點擊「Register」→ 複製 `client_id` 和 `client_secret`（只顯示一次）

**Step 3：取得 access token**

```powershell
# 替換 CLIENT_ID 和 CLIENT_SECRET
$response = Invoke-RestMethod -Uri "http://localhost:7432/token" `
  -Method Post -ContentType "application/x-www-form-urlencoded" `
  -Body "grant_type=client_credentials&client_id=CLIENT_ID&client_secret=CLIENT_SECRET"
# Token endpoint 可用 http://localhost:7432/.well-known/oauth-authorization-server 確認
$response.access_token
```

**Step 4：更新 `.env`**

```env
GBRAIN_HTTP_URL=http://localhost:7432
GBRAIN_HTTP_TOKEN=<access_token from step 3>
```

**Step 5：重新設定 Claude Code MCP 使用 HTTP**

```bash
claude mcp remove gbrain
claude mcp add gbrain -t http http://localhost:7432/mcp -H "Authorization: Bearer <access_token>"
```

**Step 6：設定開機自動啟動**

```powershell
schtasks /Create /TN "gbrain-http-server" `
  /TR "gbrain serve --http --port 7432 --token-ttl 31536000" `
  /SC ONLOGON /RL HIGHEST /F
```

**Step 7：重啟 Claude Code**，驗證 gbrain MCP 恢復正常。

### 日常使用（設定完成後）

```bash
bun run sync          # 讀 Notion → 寫 gbrain，透過 HTTP，無 lock 衝突
bun run sync:dry      # 預覽，不寫入
bun run push          # gbrain 寫回 Notion，透過 HTTP
```

### Gotchas

- Token TTL 到期後需重新執行 Step 3 取得新 token，並更新 `.env` + MCP config
- `gbrain serve --http` 要在 Claude Code **之前**啟動（否則 Claude Code 連不到 HTTP server）
- 若 `GBRAIN_HTTP_URL` 或 `GBRAIN_HTTP_TOKEN` 未設定，adapter 自動回退 CLI 模式（但有 lock 衝突風險）
- `GBRAIN_HTTP_TOKEN` 必須填 OAuth `access_token`，**不是** bootstrap token（一次性 admin 用），也**不是** `client_secret`（`gbrain_cs_...` 開頭）；誤填 `client_secret` 會造成 `{"error":"invalid_token"}`
- `GBRAIN_HTTP_URL` 只能填 `http://localhost:7432`，**不能**加 `/mcp`；adapter 自行呼叫 `${GBRAIN_HTTP_URL}/mcp`
- Admin UI 必須帶尾端斜線 `http://localhost:7432/admin/`，少斜線會 `Cannot GET /admin`
- Token endpoint 是 `/token`（不是 `/oauth/token`）；可用 `/.well-known/oauth-authorization-server` 確認

---

## Reinit 後的恢復流程（`gbrain reinit-pglite`）

`gbrain reinit-pglite` 會清空 PGLite brain 資料（pages、embeddings），**但 OAuth client registrations 存在獨立位置，reinit 後 client credentials 仍然有效**，可直接換發新 access token。

### 前置：備份 OAuth client credentials

首次完成 HTTP Server Mode 設定後（Step 2 Register client），把 `client_id` 和 `client_secret` 存到安全位置：

```json
// C:\Users\victo\Downloads\notion-sync-credentials.json（已在 .gitignore）
{
  "clientId": "gbrain_cl_xxxx...",
  "clientSecret": "gbrain_cs_xxxx...",
  "name": "notion-sync"
}
```

### 恢復步驟（reinit 後）

**Step 1：換發新 access token**（使用已備份的 client credentials）

```powershell
$creds = Get-Content "C:\Users\victo\Downloads\notion-sync-credentials.json" | ConvertFrom-Json
$response = Invoke-RestMethod -Uri "http://localhost:7432/token" `
  -Method Post -ContentType "application/x-www-form-urlencoded" `
  -Body "grant_type=client_credentials&client_id=$($creds.clientId)&client_secret=$($creds.clientSecret)"
$newToken = $response.access_token
Write-Output $newToken
```

**Step 2：更新 `~/.claude.json`（gbrain MCP token）**

在 `~/.claude.json` 中找 gbrain MCP 設定，更新 `-H` 參數裡的 Bearer token：

```json
"args": ["-t", "http", "http://localhost:7432/mcp",
         "-H", "Authorization: Bearer <新的 access_token>"]
```

**Step 3：更新 `notion-sync/.env`**

```env
GBRAIN_HTTP_TOKEN=<新的 access_token>
```

**Step 4：還原本地資料**

```bash
# 匯入本地知識庫（--no-embed 避免 OpenAI API 費用）
gbrain put C:\path\to\myresume\ --no-embed

# 從 Notion 全量 pull（還原 4 個 PAI 資料庫）
cd notion-sync && bun run sync
```

預期結果：約 41 頁（projects 3 + todo 18 + inbox 4 + knowledge 16）

**Step 5：重啟 Claude Code**（MCP 重新握手，讓新 token 生效）

### Gotchas

- HTTP server 必須**先啟動**才能換 token（`gbrain serve --http --port 7432 --token-ttl 31536000`）
- Credentials 檔用 **camelCase**（`clientId` / `clientSecret`），不是 `client_id` / `client_secret`；PowerShell 取用時 `$creds.clientId`
- Step 2 更新的是 Claude Code **MCP config**（`~/.claude.json`），Step 3 更新的是 **sync script config**（`notion-sync/.env`）；兩個都要改
- `bun run sync` 完成後才能 `bun run push`（push 倚賴 sync-state.db 基線）
- Reinit 後 Task Scheduler 排程不受影響，但排程觸發前記得先完成 Step 1~4

---

## 故障排除

| 症狀 | 可能原因 | 處理方式 |
|---|---|---|
| `gbrain: command not found` | bun link 未完成 | 重新執行 Step 1 |
| `401 Unauthorized` from Notion | NOTION_TOKEN 錯誤或過期 | 重新從 my-integrations 複製 |
| 資料庫頁面讀取失敗 | Integration 未分享給該 DB | 重新執行 Step 4 |
| `GBRAIN_ALLOW_SHELL_JOBS not set` | 環境變數未注入 | 確認指令前綴或 `.env` 載入 |
| `--follow` 相關錯誤 | 舊版 gbrain | 升級至 v0.34.0+ |
| `gbrain HTTP 401` in sync log | `GBRAIN_HTTP_TOKEN` 過期，或誤填了 `client_secret` | 確認 token 不是 `gbrain_cs_...`；重新 Step 3 取 `access_token`，更新 `.env` |
| `gbrain HTTP 503 / ECONNREFUSED` | HTTP server 未啟動 | 先啟動 `gbrain serve --http --port 7432` |
| `MultiXactId has not been created` | CLI 寫入與 stdio MCP 衝突 | 遷移至 HTTP 模式，見上方步驟 |
| 同步卡在第一頁（第一頁 `created_or_updated` 後無後續）| `getPage()` 回退到本機 CLI 路徑 | 確認 `gbrain-adapter.ts` build 是最新版（`bun run build`）；确認 `.env` 有 `GBRAIN_HTTP_URL` 和 `GBRAIN_HTTP_TOKEN` |
| `Cannot GET /admin` | Admin URL 少了尾端斜線 | 改用 `http://localhost:7432/admin/` |

