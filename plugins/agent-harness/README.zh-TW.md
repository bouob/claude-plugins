# agent-harness

[English](./README.md)

一個 [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/plugins)，提供多代理人編排架構——自主的 Planner→Generator→Evaluator Sprint，搭配 Agent Teams 平行執行與迭代回饋迴圈。

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

## Skills

| Skill | 用法 |
|-------|------|
| `/sprint <spec>` | 自主多代理人 Sprint：分解 → 平行實作 → 評估 → 迭代（固定 6 階段流程，產出 `.sprint/<ts>/` 工作區）|
| `/harness-engineering [任務\|問題]` | 多代理人 harness 框架：規劃、執行、設計審查、模型路由、診斷 harness 失敗（Anthropic 2026-04-04 P-G-E pattern + Harness Defects 診斷）|

## Commands

| Command | 用法 |
|---------|------|
| `/agent-harness:init` | 互動式 wizard，詢問你能使用哪些 Claude 模型，並寫入 `~/.claude/agent-harness.json`，讓 `/sprint` 知道如何把 Planner / Evaluator / Generator 路由到你有權限的模型 |

## 設定

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

## 運作方式

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

## 模型路由

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

## 需求

- 任何 Claude Code 訂閱方案或 API 都適用——模型路由可透過 `/agent-harness:init` 配置（有 Opus 權限的 Planner 品質最佳，Sonnet 也可頂替）
- 最大化平行需要啟用 Agent Teams（`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`）
- Playwright MCP（選用）供 Evaluator 階段進行真實 UI 驗證

## 授權

MIT
