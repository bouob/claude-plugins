# coding-skills

[English](./README.md)

一個 [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/plugins)，提供具有主觀設定的 TypeScript、React 與 Python 開發流程 — 包含規格驅動介面設計（SDD）、TDD 工作流程、SOLID 原則與結構化程式碼審查。

## 安裝

```bash
# 從 marketplace 新增並安裝（推薦）
/plugin marketplace add bouob/coding-skills
/plugin install coding-skills

# 或在開發時直接載入
claude --plugin-dir ./coding-skills
```

Skills：`/write`、`/fix`、`/review`、`/refactor`、`/diagnose`、`/spec`、`/decision`

## Skills

### 工作流程 Skills（手動呼叫）

| Skill | 用途 |
|-------|------|
| `/write <功能描述>` | 以 TDD 方式實作功能 |
| `/fix <錯誤描述>` | 修復錯誤（診斷 → Red → Green → Refactor） |
| `/review [--staged \| path]` | 審查本地變更（風格、測試、架構） |
| `/refactor [path \| module]` | 安全重構，含壞味道分析與 TDD 驗證 |
| `/diagnose <錯誤描述>` | 純診斷 — 找出根因但不動程式碼。也會被 `/fix` 載入。 |
| `/spec <功能描述>` | 定義介面契約（Given/When/Then + TypeScript interface + 不變量） |
| `/decision <A vs B>` | AI 時代技術決策框架（四維度評分 + 預想失敗分析 + 退場方案） |

### 方法論 Skills（由工作流程指令載入）

不會出現在 `/` 選單，由工作流程 skill 在適當步驟指示 Claude 載入。

| Skill | 自動載入時機 |
|-------|------------|
| `principles` | 設計新功能、架構決策、SOLID 違反 |
| `testing` | 實作功能、修復錯誤、改變行為 |
| `done` | 任何產出程式碼變更的工作流程結尾 |

### 各指令載入的 Skills

| 指令 | `spec` | `principles` | `testing` | `diagnose` | `done` | `decision` |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| `/write` | Spec Gate 觸發時¹ | 總是 | 總是 | — | 總是 | — |
| `/fix` | — | 設計問題時 | 總是 | 總是 | 總是 | — |
| `/review` | — | 總是 | 總是 | — | — | — |
| `/refactor` | — | SOLID 違反時 | 總是 | — | 總是 | — |
| `/diagnose` | — | — | — | 獨立使用 | — | — |
| `/decision` | — | — | — | — | — | 獨立使用 |

> ¹ **Spec Gate** — 寫程式碼前的三個問題：(1) 這是 bug fix 或介面不變的修改嗎？(2) TypeScript interface 已存在嗎？(3) 現在就能列出 3 個以上的邊界案例嗎？三問全 YES → 跳過 spec 直接 TDD。任一 NO → 先載入 `spec`。

## 運作原理

**兩層架構** — 工作流程 Skills 提供步驟化流程，方法論 Skills 提供知識。

- **工作流程 Skills** 使用編號步驟加上明確確認關卡 — Claude 在你核准計畫前不會撰寫任何程式碼
- **方法論 Skills** 由工作流程指令在適當步驟載入（例如 `/fix` 總是載入 `testing`，若根因涉及設計問題則額外載入 `principles`）
- 工作流程 Skills 皆設定 `disable-model-invocation: true` — 不會意外自動觸發

## 工作流程

```
/write "新增使用者驗證"
  → Spec Gate（介面已定義？邊界案例清楚？）
      全 YES → 計畫 → 確認 → TDD 循環 → /review
      任一 NO → /spec（介面 + 不變量）→ TDD 循環 → /review

/fix "登入頁面當機"      →  診斷  →  確認  →  Red/Green/Refactor  →  /review
/refactor src/auth/      →  壞味道 (Code Smell) 分析  →  確認  →  逐步重構  →  /review
/decision "Supabase vs Firebase"  →  假設審查  →  四維度評分  →  預想失敗分析  →  建議
```

## 授權

MIT
