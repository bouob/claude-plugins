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

## 故障排除

| 症狀 | 可能原因 | 處理方式 |
|---|---|---|
| `gbrain: command not found` | bun link 未完成 | 重新執行 Step 1 |
| `401 Unauthorized` from Notion | NOTION_TOKEN 錯誤或過期 | 重新從 my-integrations 複製 |
| 資料庫頁面讀取失敗 | Integration 未分享給該 DB | 重新執行 Step 4 |
| `GBRAIN_ALLOW_SHELL_JOBS not set` | 環境變數未注入 | 確認指令前綴或 `.env` 載入 |
| `--follow` 相關錯誤 | 舊版 gbrain | 升級至 v0.34.0+ |
