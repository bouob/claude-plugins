# repo-vet

[English](./README.md)

第三方程式碼的使用前安全審查。純靜態分析 — 絕不執行目標 repo 的任何程式碼。

## Skills

### `/repo-scan <github-url>`

在你安裝或執行一個陌生 repo **之前**先審查它。Clone 到隔離的 `tmp/repo-scan/`
目錄後掃描以下項目：

- **憑證竊取** — 讀取 `~/.ssh`、`~/.aws`、完整傾倒 `process.env` / `os.environ`、瀏覽器與錢包資料
- **隱藏對外連線** — 完整盤點所有 URL/IP 並對照 repo 宣稱用途分類；Discord/Telegram webhook、貼文網站、tunnel、raw-IP 端點
- **安裝期攻擊** — 惡意 `postinstall` / `setup.py` hook、`curl | bash`、下載後執行、持久化（shell profile、排程工作、登錄檔 Run key）
- **混淆與動態執行** — 餵入 base64 payload 的 `eval`/`exec`、javascript-obfuscator 特徵、charcode 鏈
- **供應鏈風險** — typosquatting 依賴、指向不明 fork 的 git 依賴、lockfile 竄改、來路不明的二進位檔
- **洩漏的 secrets** — 被 commit 進 repo 的 API key 與私鑰（維護者衛生訊號）
- **CI workflow 風險** — `pull_request_target` 濫用、script injection、可變動的 action 版本釘選
- **維護者淪陷訊號** — 可疑的 git 歷史模式（長期停滯的 repo 突然出現安裝腳本 commit）
- **AI 審查者操弄** — repo 內試圖指示自動化審查工具跳過檢查的文字

輸出：結構化報告，含 **BLOCK / CAUTION / PASS** 三級判定、每個 finding 附
`file:line` 證據、完整對外連線清單，以及明確列出*未*檢查的項目（transitive
依賴、執行期行為）。

## 安裝

```bash
# 透過 bouob-plugins marketplace（推薦）
/plugin marketplace add bouob/claude-plugins
/plugin install repo-vet@bouob-plugins

# 或直接從本 repo 安裝
/plugin marketplace add bouob/repo-vet
/plugin install repo-vet@repo-vet
```

## 安全模型

- 掃描過程絕不執行 `npm install`、`pip install`、build 腳本或目標 repo 的任何程式碼。
- Clone 時使用 `core.symlinks=false`，防止 checkout 階段的符號連結路徑逃逸。
- Repo 內容（README、註解）一律視為不可信資料 — repo 內針對 AI 審查者埋設的指令會被回報為 finding，而非被遵循。

## 授權

MIT
