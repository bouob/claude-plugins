# agent-harness

[English](./README.md)

一個雙平台 agent workflow 套件，提供多代理人編排架構。

- **Claude Code**：透過 plugin commands 執行自主 Planner -> Generator -> Evaluator Sprint，搭配 Agent Teams 平行執行與迭代回饋。
- **Codex**：透過 plugin skills 執行先規劃、再明確委派 subagents 的 Sprint，支援每角色模型路由與 Codex lifecycle hooks。

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

接著就可以跑自主 Sprint：

```bash
/sprint 建立一個包含 email/password 和 Google OAuth 的登入頁面
```

如果跳過 wizard，`/sprint` 會用全 Sonnet 的安全預設值，因此任何訂閱方案或 API 都能跑，不會撞到模型權限錯誤。

### Codex

初始化 Codex 專用模型路由：

```text
$agent-harness:agent-harness-init
```

Codex 內建預設仍是所有角色都用 `mode: "inherit"`，所以 Planner、
Evaluator、Generator subagents 會繼承目前 Codex session 的模型與
reasoning 設定。Codex 設定也可以把任一角色切成 explicit 路由，指定
`model` 與選填的 `reasoning_effort`。它不會讀寫 Claude Code 的
`.claude/agent-harness*.json` 檔案。

先規劃：

```text
$agent-harness:agent-harness-sprint-plan 建立一個包含 email/password 和 Google OAuth 的登入頁面
```

再執行已確認的計畫：

```text
$agent-harness:agent-harness-sprint 執行已確認的計畫。只在 ownership 不重疊時啟動平行 subagents。
```

Codex 只有在明確要求時才會啟動 subagents，所以 Codex skills 會標出哪些任務可平行、哪些任務必須依序處理，以及哪些角色要繼承目前 session、哪些角色要套用明確的模型或 reasoning 覆寫。

## Skills

| Skill | 用法 |
|-------|------|
| `/sprint <spec>` | 自主多代理人 Sprint：分解 -> 平行實作 -> 評估 -> 迭代，產出 `.sprint/<ts>/` 工作區 |
| `/harness-engineering [任務\|問題]` | 多代理人 harness 框架：規劃、執行、設計審查、模型路由或診斷 harness 失敗 |
| `agent-harness-init` | Codex skill：初始化 `.codex` 或 `~/.codex` 下的 Codex 專用模型路由 |
| `agent-harness-sprint-plan` | Codex skill：只讀探索與 Sprint 規劃，不實作 |
| `agent-harness-sprint` | Codex skill：依已確認的計畫執行，並明確委派 subagents |

## Commands

| Command | 用法 |
|---------|------|
| `/agent-harness:init` | 互動式 wizard，詢問你能使用哪些 Claude 模型，並寫入 `~/.claude/agent-harness.json`，讓 `/sprint` 知道如何路由 Planner / Evaluator / Generator |

## 設定

### Claude Code

沒有 config 檔時，`/sprint` 會把所有角色都用 Sonnet，這是任何訂閱方案與 API 都能跑的安全預設。Wizard 讓有 Opus 權限的使用者提高 Planner 品質，也能在特定任務壓低成本。

Schema：`skills/sprint/references/config-schema.md`。

### Codex

Codex 使用自己的設定檔，不會讀取 Claude Code 的模型路由：

- 專案覆寫：`./.codex/agent-harness.local.json`
- 使用者預設：`~/.codex/agent-harness.json`

用這個 skill 初始化：

```text
$agent-harness:agent-harness-init
```

Codex schema v2 對每個角色支援兩種 route 形狀：

- `{"mode": "inherit"}`：沿用目前 Codex session 的模型與 reasoning
- `{"mode": "explicit", "model": "...", "reasoning_effort": "..."}`：傳入明確覆寫

`reasoning_effort` 是選填；如果省略，就只覆寫模型、不覆寫推理等級。

Schema：`codex/references/codex-config-schema.md`。

## 運作方式

### Claude Code

```text
/sprint <spec>
  -> 初始化工作區（.sprint/<timestamp>/）
  -> Planner（依你 config 的模型）寫出 sprint-plan.md
  -> Generators 平行或依序完成任務
  -> 彙整進度檔案
  -> Evaluator（依你 config 的模型）寫出 sprint-eval.md
  -> 必要時重跑失敗任務
```

### Codex

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

## 模型路由

### Claude Code

預設路由為每個角色都用 Sonnet，以求相容性。推薦的 `full-access`
preset 會把 Planner 升級到 Opus，並把較便宜的工作分給更省成本的模型。

### Codex

Codex 路由支援 inherit 與 explicit 兩種 route 形狀。

內建預設仍是 all-inherit。推薦的 `balanced` preset 如下：

| 角色 | 推薦路由 |
|------|----------|
| Planner | `gpt-5.5` + `high` |
| Evaluator | `gpt-5.4` + `medium` |
| Generator code | `gpt-5.4` + `high` |
| Generator write | `gpt-5.4` + `medium` |
| Generator research | `gpt-5.4-mini` + `low` |
| Generator collect | `gpt-5.4-mini` + `low` |

如果 explicit route 格式不合法，或 Codex 在執行時拒絕該模型或 reasoning 覆寫，該角色應警告後回退成 inherit-mode routing，而不是讓整個 sprint 直接失敗。

## 需求

### Claude Code

- 任何 Claude Code 訂閱方案或 API 都適用
- 若要最大化平行，需啟用 Agent Teams（`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`）
- Playwright MCP（選用）供 Evaluator 階段進行真實 UI 驗證

### Codex

- 支援 plugin 的 Codex
- 已啟用 Subagent workflows
- 若要使用 sprint push guard，需啟用 plugin hooks

## 建議工作流程

對於非單純規格：

1. 先進 plan mode，把需求、歧義與範圍談清楚。
2. 離開 plan mode 後再跑 `/sprint <spec>` 或 Codex 規劃技能，讓 Planner 從較乾淨的上下文出發。

只有在規格已經非常明確、風險很低時，才建議跳過第一步。

## 版本歷史

| 版本 | 範圍 | 狀態 |
|------|------|------|
| v0.2.0 | 僅支援 Claude Code 的初始版本 | 已發布 |
| v0.3.x -> v0.5.x | 舊版 Codex / Auggie 多平台實驗 | 已回退 |
| v0.6.0 | 回到 Claude Code 單平台、Claude 路由 schema v3 | 已發布 |
| v2.2.1 | 雙平台套件，加入獨立的 Codex adapter | 目前版本 |

Codex 支援刻意與 Claude `/sprint` runtime 分離。Codex adapter 維持自己的設定檔、skills 與 hooks，不把 Claude 與 Codex 的引擎路由混在同一套 schema 內。

## License

MIT
