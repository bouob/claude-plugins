# sysadmin-skills

[English](README.md)

對齊 ITIL (Version 5) 的 IT 維運技能，專為系統管理員設計 — 事件回應、變更管理（含 CAB 審查）、AI 治理、SRE 式事後檢討、問題管理。

## 技能清單

### 工作流程技能（使用者直接呼叫）

| 技能 | 說明 |
|---|---|
| `/incident` | 完整事件回應生命週期：偵測、分級、調查、解決、通報、結案。支援 SRE 錯誤預算情境與 AIOps 偵測事件。 |
| `/change-request` | ITIL 變更請求（RFC），含風險評估、回滾計畫、CAB 審查清單、AI/ML 變更指引、GitOps 模式。 |
| `/statuspage` | 事件與維護的狀態頁更新（相容 Atlassian Statuspage / Instatus）。 |
| `/problem` | 問題管理：根因分析（5 Whys / Fishbone / Pareto）、已知錯誤資料庫（KEDB）登錄、永久修復追蹤。 |
| `/postmortem` | 無責任事後檢討，遵循 Google SRE 文化。聚焦系統性促成因素、哪些做得好、SMART 行動項目。 |
| `/ai-change` | AI/ML 系統變更申請，應用 ITIL v5 AI 治理（6C 模型）、偏差/公平性評估、可解釋性要求與 AI 專屬回滾。 |

### 方法論技能（自動載入）

| 技能 | 說明 |
|---|---|
| `itil` | ITIL (Version 5) 框架參考：優先權矩陣、事件管理、變更促成、AI 治理（6C 模型）、SRE 整合。 |
| `comms` | 利害關係人溝通範本，依嚴重程度調整語氣。 |
| `done-ops` | 維運任務驗證閘門 — 有證據才能結案。含 SLO 合規性檢查。 |

## 安裝

```bash
# 從 marketplace 安裝
/plugin marketplace add bouob/sysadmin-skills

# 本地開發
claude --plugin-dir ./sysadmin-skills
```

## 使用方式

```
/incident Email service is not sending outbound messages since 09:15
/change-request Upgrade Exchange Server 2019 to 2022
/statuspage VPN service experiencing intermittent connectivity issues
/problem VPN drops every Monday morning — 4th occurrence this month
/postmortem Payment service P1 outage resolved — blameless review needed
/ai-change Upgrade customer service chatbot from Claude 3.5 to Claude Sonnet 4.6
```

方法論技能（`itil`、`comms`、`done-ops`）會由工作流程技能自動載入，無需手動呼叫。

## 輸出檔案

所有技能產出本地 markdown 檔案：

| 技能 | 輸出目錄 | 檔名格式 |
|---|---|---|
| `/incident` | `./incidents/` | `incident-YYYY-MM-DD-slug.md` |
| `/change-request` | `./changes/` | `change-request-YYYY-MM-DD-slug.md` |
| `/statuspage` | `./statuspage/` | `statuspage-YYYY-MM-DD-slug.md` |
| `/problem` | `./problems/` | `problem-YYYY-MM-DD-slug.md` |
| `/postmortem` | `./postmortems/` | `postmortem-YYYY-MM-DD-slug.md` |
| `/ai-change` | `./changes/ai/` | `ai-change-YYYY-MM-DD-slug.md` |

若專案中有 `docs/{type}/` 目錄，技能會優先使用該目錄。

## 架構

三層式架構：

- **工作流程技能** — 使用者直接呼叫的逐步流程
- **方法論技能** — 自動載入的領域知識（ITIL v5、SRE、溝通範本）
- **參考文件** — 按需載入的深度內容（各技能的 `references/` 資料夾）

參考文件採用漸進式揭露：SKILL.md 保持精簡，詳細內容放在 `references/`，僅在需要時載入。

### 共用參考文件（位於 `itil/references/`）

| 檔案 | 共用者 |
|---|---|
| `itil-v5-overview.md` | 所有技能 — ITIL v5 變革、術語對照 |
| `ai-governance-6c.md` | `/change-request`、`/ai-change`、`/incident` |
| `sre-integration.md` | `/incident`、`/postmortem`、`/change-request` |
| `sustainability.md` | `/change-request`、`/ai-change` |
| `incident-management.md` | `/incident` — 完整流程、AIOps、SLO 整合 |
| `change-enablement.md` | `/change-request` — 完整流程、AI/ML、GitOps 模式 |
| `priority-matrix.md` | `/incident` — P1-P4 與 SEV1-SEV4 範例 |

## ITIL v5 對齊說明

本 plugin 對齊 **ITIL (Version 5)**（2026 年 2 月正式發布）：

- 保留全部 34 個 ITIL 4 practices — 現有工作流程 100% 相容
- AI 治理（6C 模型）整合進變更與事件管理
- SRE 實務（錯誤預算、無責任事後檢討）橋接 ITIL 流程
- 永續性維度加入變更風險評估

ITIL 4 使用者：無需改變任何現有工作流程，新功能全為加值擴充。

## 授權

MIT
