# agent-harness

[English](./README.md)

一個雙平台 agent workflow 套件，提供多代理人編排架構。

- **Claude Code**：透過 plugin commands 執行自主 Planner→Generator→Evaluator Sprint，搭配 Agent Teams 平行執行與迭代回饋迴圈。
- **Codex**：透過 plugin skills 執行先規劃、再明確委派 subagents 的 Sprint，並提供 Codex lifecycle hooks。

## 安裝

### Claude Code

```bash
# 加入 marketplace（一次性）
/plugin marketplace add bouob/claude-plugins

# 安裝
/plugin install agent-harness@bouob-plugins

# 或在開發時直接載入
claude --plugin-dir ./agent-harness
```

### Codex

```bash
# 在包含 agent-harness 的上一層目錄執行
codex plugin marketplace add ./agent-harness

# 或在本 repo 內執行
codex plugin marketplace add .
```

重新啟動 Codex，開啟 `/plugins`，選擇 `Agent Harness` marketplace，安裝
`agent-harness`。詳細步驟見 `docs/codex-install.md`。

## Quick Start

### Claude Code

裝完後先跑一次 wizard，根據你能使用的 Claude 模型設定路由：

```bash
/agent-harness:init
```

Wizard 大約 30 秒——詢問你有哪些 Claude 模型權限（Opus / Sonnet / Haiku 任意組合），
並寫入 `~/.claude/agent-harness.json`。可隨時重跑以重新設定。

接著就可以跑自主 Sprint：

```bash
/sprint 建立一個包含 email/password 和 Google OAuth 的登入頁面
```

> **如果你跳過 wizard**，`/sprint` 會用全 Sonnet 的安全預設值（每個角色都是 Sonnet），
> 任何訂閱方案或 API 都能跑、不會撞 model-not-available 錯誤。**有 Opus 權限的人
> 建議跑 `/agent-harness:init` 選 `All models — Opus, Sonnet, Haiku`**——Opus
> Planner 的任務拆解品質明顯比 Sonnet 好。

### Codex

初始化 Codex 專用模型路由：

```text
$agent-harness:agent-harness-init
```

Codex 預設路由會讓 Planner、Evaluator、Generator subagents 繼承目前
Codex session 的模型。它不會讀寫 Claude Code 的 `.claude/agent-harness*.json`
檔案。

先規劃：

```text
$agent-harness:agent-harness-sprint-plan 建立一個包含 email/password 和 Google OAuth 的登入頁面
```

再執行已確認的計畫：

```text
$agent-harness:agent-harness-sprint 執行已確認的計畫。只在 ownership 不重疊時啟動平行 subagents。
```

Codex 只有在明確要求時才會啟動 subagents，所以 Codex skill 會明確標出哪些任務可平行、哪些任務必須依序處理。

## Skills

| Skill | 用法 |
|-------|------|
| `/sprint <spec>` | 自主多代理人 Sprint：分解 → 平行實作 → 評估 → 迭代（固定 6 階段流程，產出 `.sprint/<ts>/` 工作區）|
| `/harness-engineering [任務\|問題]` | 多代理人 harness 框架：規劃、執行、設計審查、模型路由、診斷 harness 失敗（Anthropic 2026-04-04 P-G-E pattern + Harness Defects 診斷）|
| `agent-harness-init` | Codex skill：初始化 `.codex` 或 `~/.codex` 下的 Codex 專用模型路由 |
| `agent-harness-sprint-plan` | Codex skill：只讀探索與 Sprint 規劃，不實作 |
| `agent-harness-sprint` | Codex skill：依已確認的計畫執行，並明確委派 subagents |

## Commands

| Command | 用法 |
|---------|------|
| `/agent-harness:init` | 互動式 wizard，詢問你能使用哪些 Claude 模型，並寫入 `~/.claude/agent-harness.json`，讓 `/sprint` 知道如何把 Planner / Evaluator / Generator 路由到你有權限的模型 |

## 設定

### Claude Code

沒有 config 檔時，`/sprint` 會把**所有角色都用 Sonnet**——這是任何訂閱方案
與 API 都能跑的安全預設。Wizard 讓你把 Planner 升級為 Opus（有 Opus 權限的使用者）
或在特定任務壓低成本：

```bash
/agent-harness:init
```

Wizard 會詢問你能使用哪些 Claude 模型（同時支援 Claude.ai 訂閱與直接 API 存取），
並把結果寫到 `~/.claude/agent-harness.json`。若需要 per-project 覆寫，
複製該檔到 `./.claude/agent-harness.local.json`——`.local.json` 後綴符合官方
`.claude/*.local.json` gitignore 慣例，預設不會被 commit。

Schema：`skills/sprint/references/config-schema.md`。

### Codex

Codex 使用自己的設定檔，不會讀取 Claude Code 的模型路由：

- 專案覆寫：`./.codex/agent-harness.local.json`
- 使用者預設：`~/.codex/agent-harness.json`

用這個 skill 初始化：

```text
$agent-harness:agent-harness-init
```

Codex v1 schema 預設所有角色都是 `mode: "inherit"`，所以啟動的 subagents
會沿用目前 Codex session 的模型與 reasoning 設定。Schema：
`codex/references/codex-config-schema.md`。

## 運作方式

### Claude Code

```
/sprint 建立一個包含 email/password 和 Google OAuth 的登入頁面
       │
       ├─ Phase 1: 初始化工作區（.sprint/<timestamp>/）
       ├─ Phase 2: Planner（依你 config 的模型）→ sprint-plan.md
       │           └─ 任務清單、驗收標準、相依圖
       ├─ Phase 3: Generator（透過 Agent Teams 平行執行）
       │           ├─ 無相依任務 → Agent Teams（同時啟動）
       │           └─ 有相依任務 → 依序 Subagents
       ├─ Phase 4: 彙整進度檔案
       ├─ Phase 5: Evaluator（依你 config 的模型）→ sprint-eval.md
       │           └─ 每條驗收標準的 PASS/FAIL
       └─ Phase 6: 決策閘門
                   ├─ 全部 PASS → 完成，向使用者報告
                   └─ 有 FAIL → 重跑失敗任務（最多 3 次迭代）
```

### Codex

```
$agent-harness:agent-harness-init
       │
       ├─ 寫入 `.codex` 或 `~/.codex` 下的 Codex 專用設定
       └─ 所有角色繼承目前 Codex session 模型

$agent-harness:agent-harness-sprint-plan <spec>
       │
       ├─ 只讀探索 repo
       ├─ 產生含驗收標準與 ownership 邊界的 Sprint 計畫
       └─ 交給使用者確認

$agent-harness:agent-harness-sprint <approved plan>
       │
       ├─ 初始化 .sprint/<timestamp>/ artifacts
       ├─ 明確要求時，將 disjoint tasks 委派給平行 subagents
       ├─ shared-file 或相依任務依序處理
       ├─ 用具體證據評估驗收標準
       └─ 回報變更、驗證與風險
```

## 模型路由

### Claude Code

預設路由（無 config 檔）每個角色都用 Sonnet 以求相容性。下面這張是
**推薦路由**——wizard 的 `full-access` preset 會寫入這套，在有 Opus
權限時品質最佳：

| 任務類型 | 推薦模型 | 原因 |
|----------|----------|------|
| 規劃、評估 | Opus | 複雜推理、架構判斷 |
| 程式碼、寫作、研究整合 | Sonnet | 品質與速度的平衡 |
| 資料蒐集、格式轉換 | Haiku | 機械性工作，便宜 15 倍 |

跑 `/agent-harness:init` 套用上表。沒有 Opus 權限的話選 `Sonnet + Haiku`
或 `Sonnet only`。

### Codex

Codex 路由預設每個角色都是 `mode: "inherit"`。編排器啟動
subagents 時不傳入模型覆寫，因此它們會繼承目前 Codex session 的模型與
reasoning 設定。執行 `$agent-harness:agent-harness-init` 可寫入 Codex 專用設定。

## 需求

### Claude Code

- 任何 Claude Code 訂閱方案或 API 都適用——模型路由可透過 `/agent-harness:init` 配置（有 Opus 權限的 Planner 品質最佳，Sonnet 也可頂替）
- 最大化平行需要啟用 Agent Teams（`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`）
- Playwright MCP（選用）供 Evaluator 階段進行真實 UI 驗證

### Codex

- 支援 plugin 的 Codex
- Subagent workflows 啟用（目前 Codex release 預設啟用）
- 若要使用 sprint push guard，需要啟用 plugin hooks

## 推薦工作流程

對於非單純規格的任務：

1. **先進入規劃模式**（按 Esc 再按 P，或你 terminal 對應的 plan mode 快捷）—
   先和模型釐清規格、找出歧義、對齊範圍
2. 退出規劃模式後再下 `/sprint <spec>` — Planner 會接收已經銳化的 context，
   產出更精準的 `sprint-plan.md`

只有當規格已經很具體（單一交付物、驗收清楚、無架構決策）時才跳過第 1 步。
多數模型在 plan mode 下推理更謹慎、會先提出釐清問題再動工。

## 版本沿革

| 版本 | 範圍 | 狀態 |
|------|------|------|
| v0.2.0 | 純 Claude Code — 初版 | 已發布 |
| v0.3.x – v0.5.x | 多 host 實驗（Codex CLI generator backend、Auggie CLI 鋪設、schema v2 加 engine namespace）。v0.6.0 已撤回，詳見下方 | 已撤回 |
| v0.6.0 | 回歸純 Claude Code、簡化版。Schema v3（純字串 model）。v0.4.x – v0.5.x 的 config 會自動 lift；含非 claude engine 的 config 會被拒絕並提示重跑 init。保留 Recommended Workflow 與 plan-mode 提示。 | 已發布 |
| **v0.7.0** | **雙平台套件**。Claude Code plugin 維持穩定；新增 `.codex-plugin/`、Codex skills、選用 Codex hooks 與 local marketplace metadata。 | **目前版本** |

### 為什麼撤回 v0.4–v0.5 多 host 路線

Codex / Auggie 實驗碰到兩個務實阻礙，讓多 host 對 agent-harness
這個使用情境而言成本大於效益：

- **Auggie**：主 agent 不可靠地遵守 `.augment/rules/*.md` 限制
  （例如即使 deny rule 寫了不要寫 Jira / Confluence，仍會呼叫 MCP
  建立文件）。`~/.augment/settings.json` 的 `toolPermissions` deny
  機制粒度過粗，無法做 sprint 等級的隔離。v0.5.0 移除。
- **Codex**：目前 Codex CLI 沒有乾淨的 Claude Code plugin 安裝路徑。
  Skills 必須手動複製或 symlink 到 `~/.agents/skills/` 或
  `~/.codex/skills/`，namespaced slash command（例如 `/agent-harness:init`）
  在 Codex 不存在，hooks 也要為 Codex 的獨立 hook 系統重寫一份。
  維護平行的 install / config / hook 故事讓表面積翻倍，但帶來的
  價值不成比例。v0.6.0 移除。

v0.4.x – v0.5.x 的 schema-v2 / `adapters/` / `templates/` 鷹架已刪除。
v0.6.0 只保留在純 Claude Code 場景仍有價值的耐久改良：plan-mode
工作流程建議、sprint contract 工件、harness-engineering meta-skill。

v0.7.0 以獨立 adapter 方式重新加入 Codex 支援，不把 Codex engine 混回
Claude `/sprint` runtime。Claude 端改動建議記錄在
`docs/claude-code-change-recommendations.md`。

## 授權

MIT
