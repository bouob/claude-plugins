# agent-harness

[English](./README.md)

Claude Code 的模型路由多代理人 Sprint：Planner 分解你的規格，Generators
平行實作任務（背景 dynamic workflow 內最多 16 個並行 agents），Evaluator
依驗收標準驗證——最多迭代 3 輪直到通過。

這個 plugin 是 **harness**，不是 workflow：耐久的部分是模型 + effort
路由設定、Planner → Generator → Evaluator 角色 contract、以及 sprint
artifacts。執行後端（Claude Code 的 dynamic Workflow runtime，含
Agent-tool fallback）只是底下可替換的引擎。同一個套件另附獨立的
[Codex adapter](#codex-支援)。

## 安裝

```bash
# 加入 marketplace（一次性）
/plugin marketplace add bouob/claude-plugins

# 安裝
/plugin install agent-harness@bouob-plugins

# 或在開發時直接載入
claude --plugin-dir ./agent-harness
```

## Quick Start

裝完後先跑一次 wizard，根據你能使用的 Claude 模型設定路由：

```bash
/agent-harness:init
```

接著就可以跑自主 Sprint：

```bash
/sprint 建立一個包含 email/password 和 Google OAuth 的登入頁面
```

如果跳過 wizard，`/sprint` 會用全 Sonnet 的安全預設值，因此任何訂閱方案或
API 都能跑，不會撞到模型權限錯誤。

## 運作方式

```text
/sprint <spec>
  -> 解析模型 + effort 路由（讀 /agent-harness:init 寫的 config；
     沒跑過就用全 Sonnet 安全預設）
  -> 初始化工作區（.sprint/<timestamp>/）
  -> 啟動背景 dynamic workflow（Claude Code >= 2.1.154）：
       Planner（依你 config 的模型）寫出 sprint-plan.md
       Generators 平行完成任務（最多 16 個並行）
       彙整進度檔案
       Evaluator（依你 config 的模型）寫出 sprint-eval.md
       失敗任務在 run 內重跑（最多 3 輪）
  -> 主對話只收到最終結果並回報
```

每個 subagent 啟動時都帶著從 config 解析出的**顯式** `model` 參數——
不依賴 Claude Code「繼承 session 模型」的預設行為，也沒有任何模型會
「自己決定」。中間結果留在 workflow run 裡，主對話的 context 只保留
最終報告。dynamic workflows 不可用時（舊版 Claude Code 或已停用），
`/sprint` 會 fallback 成原本逐回合用 `Agent` 工具編排相同的階段。

## Skills 與 Commands

| 名稱 | 用法 |
|------|------|
| `/sprint <spec>` | 自主多代理人 Sprint：分解 -> 平行實作 -> 評估 -> 迭代，產出 `.sprint/<ts>/` 工作區 |
| `/harness-engineering [任務\|問題]` | 多代理人 harness 框架：規劃、執行、設計審查、模型路由或診斷 harness 失敗 |
| `/agent-harness:init` | 互動式 wizard，詢問你能使用哪些 Claude 模型，並寫入 `~/.claude/agent-harness.json`，讓 `/sprint` 知道如何路由 Planner / Evaluator / Generator |

## 設定

沒有 config 檔時，`/sprint` 會把所有 reasoning 角色都用 Sonnet + `medium`
effort（`collect` 用 `low`），這是任何訂閱方案與 API 都能跑的安全預設。
Wizard 讓有 Opus 權限的使用者把 Planner 升級成 Opus + `high` effort，
也能在特定任務壓低成本。

設定檔（每個欄位以先找到的檔案為準）：

1. `./.claude/agent-harness.local.json` — 專案層覆寫
2. `~/.claude/agent-harness.json` — 使用者層

每個角色接受 `model`（`fable` / `mythos` / `opus` / `sonnet` / `haiku`）與
`effort`（`low` / `medium` / `high` / `xhigh` / `max`）。Effort 會以
prompt-level keyword（`Think.`、`Think hard.`、`Think harder.`、`Ultrathink.`）
注入每個 subagent prompt 開頭——這是因應 Claude Code 的 `Agent` 工具與
workflow runtime 的 `agent()` 目前在呼叫時都不接受 `effort` 參數所做的橋接。
等 Anthropic 加上原生 effort 後，schema 不必改、`/sprint` 會自動切過去。

Effort 範圍**依模型而異**：`haiku` 不吃 effort、`sonnet` 沒有 `xhigh`，只有
`opus` / `fable` / `mythos` 支援完整階梯。超出範圍的值會向下 clamp 到該模型最近
的合法等級（`sonnet`+`xhigh` → `high`）。`ultracode` 不是 effort 等級（它是
Workflow opt-in 關鍵字）；`max` 是上限。

模型注意事項：

- **`fable`**（Claude Fable 5）：採 adaptive thinking，effort keyword 對它
  僅供參考；定價約為 Opus 4.8 的 2 倍；受限主題會靜默 fallback 到 Opus 4.8。
- **`mythos`**（Mythos 5）：受 Project Glasswing 限制，且不在 Claude Code
  文件記載的模型值集（`sonnet` / `opus` / `haiku` / `fable`）內——無權限時
  spawn 可能在參數驗證層就被拒絕。
- **範圍**：此 config 只路由 subagents——orchestrator（主對話）模型由
  `/model` 決定；Fable 5 的 1M context 很適合拿來當大型 sprint 的
  orchestrator。
- **`CLAUDE_CODE_SUBAGENT_MODEL`**：若有設定這個環境變數，它會靜默蓋掉
  路由傳入的所有模型（它在 Claude Code 解析鏈的第一位）。使用
  agent-harness 路由時請先取消設定。

Schema：`skills/sprint/references/config-schema.md`。

## 模型路由

預設路由為每個 reasoning 角色都用 Sonnet + `medium` effort（`collect` 用
`low`），以求相容性。推薦的 `full-access` preset 把基礎角色放到 Opus、
每個 reasoning Generator 放到 Sonnet + `high`：

| 角色 | 推薦路由 |
|------|----------|
| Planner | `opus` + `xhigh` |
| Evaluator | `opus` + `high` |
| Generator code | `sonnet` + `high` |
| Generator write | `sonnet` + `high` |
| Generator research | `sonnet` + `high` |
| Generator collect | `haiku`（不吃 effort） |

Planner 是整輪槓桿最大的單一呼叫，所以給最強的模型 + effort；Generator 是用量
主體，給有能力的模型搭配高 reasoning（這是主要成本來源——prose-heavy 的 sprint
可把 `write` 降回 `medium` 省成本）。有 Claude Fable 5 權限的使用者可改選
`frontier` preset：Planner 路由為 `fable` + `high`（1M context 適合整份 spec
分解，成本約為 Opus planner 的 2 倍），其餘角色與 `full-access` 相同。

## 需求

- 任何 Claude Code 訂閱方案或 API 都適用
- 平行執行需 Claude Code v2.1.154+ 且啟用 dynamic workflows
  （legacy 的 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 路徑可作 fallback）
- Playwright MCP（選用）供 Evaluator 階段進行真實 UI 驗證

## 建議工作流程

對於非單純規格：

1. 先進 plan mode，把需求、歧義與範圍談清楚。
2. 離開 plan mode 後再跑 `/sprint <spec>`，讓 Planner 從較乾淨的上下文出發。

只有在規格已經非常明確、風險很低時，才建議跳過第一步。

## Codex 支援

套件附獨立的 Codex adapter：先規劃、再明確委派 subagents 的 Sprint，
支援每角色模型路由與 Codex lifecycle hooks。它維持自己的設定檔、skills
與 hooks——不會讀寫 Claude Code 的 `.claude/agent-harness*.json`。

### 安裝

```bash
# 在包含 agent-harness 的上一層目錄執行
codex plugin marketplace add ./agent-harness

# 或在本 repo 內執行
codex plugin marketplace add .
```

重新啟動 Codex，開啟 `/plugins`，選擇 `Agent Harness` marketplace，安裝
`agent-harness`。詳細步驟見 `docs/codex-install.md`。

### Quick Start

初始化 Codex 專用模型路由：

```text
$agent-harness:agent-harness-init
```

Codex 內建預設是所有角色都用 `mode: "inherit"`，所以 Planner、Evaluator、
Generator subagents 會繼承目前 Codex session 的模型與 reasoning 設定。
Codex 設定也可以把任一角色切成 explicit 路由，指定 `model` 與選填的
`reasoning_effort`。

先規劃：

```text
$agent-harness:agent-harness-sprint-plan 建立一個包含 email/password 和 Google OAuth 的登入頁面
```

再執行已確認的計畫：

```text
$agent-harness:agent-harness-sprint 執行已確認的計畫。只在 ownership 不重疊時啟動平行 subagents。
```

Codex 只有在明確要求時才會啟動 subagents，所以 Codex skills 會標出哪些
任務可平行、哪些任務必須依序處理，以及哪些角色要繼承目前 session、哪些
角色要套用明確的模型或 reasoning 覆寫。

### Skills

| Skill | 用法 |
|-------|------|
| `agent-harness-init` | 初始化 `.codex` 或 `~/.codex` 下的 Codex 專用模型路由 |
| `agent-harness-sprint-plan` | 只讀探索與 Sprint 規劃，不實作 |
| `agent-harness-sprint` | 依已確認的計畫執行，並明確委派 subagents |

### 設定

Codex 使用自己的設定檔：

- 專案覆寫：`./.codex/agent-harness.local.json`
- 使用者預設：`~/.codex/agent-harness.json`

Codex schema v2 對每個角色支援兩種 route 形狀：

- `{"mode": "inherit"}`：沿用目前 Codex session 的模型與 reasoning
- `{"mode": "explicit", "model": "...", "reasoning_effort": "..."}`：傳入明確覆寫

`reasoning_effort` 是選填；如果省略，就只覆寫模型、不覆寫推理等級。

Schema：`codex/references/codex-config-schema.md`。

### 運作方式

```text
$agent-harness:agent-harness-init
  -> 寫入 .codex 或 ~/.codex 下的 Codex 專用設定
  -> 每個角色使用 inherit 或 explicit 的模型/推理路由

$agent-harness:agent-harness-sprint-plan <spec>
  -> 只讀探索 repo
  -> 產生含驗收標準、ownership 邊界與路由註記的 Sprint 計畫
  -> 交給使用者確認

$agent-harness:agent-harness-sprint <approved plan>
  -> 初始化 .sprint/<timestamp>/ artifacts
  -> 明確要求時，將 disjoint tasks 委派給平行 subagents
  -> 依設定傳入每角色模型與選填的 reasoning 覆寫
  -> shared-file 或相依任務依序處理
  -> 用具體證據評估驗收標準
  -> 回報變更、驗證、風險與任何路由 fallback
```

### 模型路由

內建預設是 all-inherit。推薦的 `balanced` preset 如下：

| 角色 | 推薦路由 |
|------|----------|
| Planner | `gpt-5.5` + `high` |
| Evaluator | `gpt-5.4` + `medium` |
| Generator code | `gpt-5.4` + `high` |
| Generator write | `gpt-5.4` + `medium` |
| Generator research | `gpt-5.4-mini` + `low` |
| Generator collect | `gpt-5.4-mini` + `low` |

如果 explicit route 格式不合法，或 Codex 在執行時拒絕該模型或 reasoning
覆寫，該角色應警告後回退成 inherit-mode routing，而不是讓整個 sprint
直接失敗。

### 需求

- 支援 plugin 的 Codex
- 已啟用 Subagent workflows
- 若要使用 sprint push guard，需啟用 plugin hooks

## 版本歷史

| 版本 | 範圍 | 狀態 |
|------|------|------|
| v0.2.0 | 僅支援 Claude Code 的初始版本 | 已發布 |
| v0.3.x -> v0.5.x | 舊版 Codex / Auggie 多平台實驗 | 已回退 |
| v0.6.0 | 回到 Claude Code 單平台、Claude 路由 schema v3 | 已發布 |
| v2.2.1 | 雙平台套件，加入獨立的 Codex adapter | 已發布 |
| v2.3.0 | Claude 端加入每角色 reasoning effort（low/medium/high/xhigh/max），schema v4 | 已發布 |
| v2.5.0 | Sprint 改用 workflow 後端編排、加入 `fable`（Claude Fable 5）路由與 `frontier` preset | 目前版本 |

Codex 支援刻意與 Claude `/sprint` runtime 分離。Codex adapter 維持自己的
設定檔、skills 與 hooks，不把 Claude 與 Codex 的引擎路由混在同一套 schema 內。

## License

MIT
