# sysadmin-skills

[English](README.md)

基於 ITIL 4 的 IT 維運技能，專為系統管理員設計 — 事件回應、變更管理（含 CAB 審查）、狀態頁通訊。

## 功能

| 技能 | 類型 | 說明 |
|---|---|---|
| `/incident` | 工作流程 | 完整事件回應生命週期：偵測、分級、調查、解決、通報 |
| `/change-request` | 工作流程 | ITIL 變更請求（RFC），含風險評估、回滾計畫、CAB 審查清單 |
| `/statuspage` | 工作流程 | 事件與維護的狀態頁更新（相容 Atlassian Statuspage / Instatus） |
| `itil` | 方法論 | ITIL 4 框架參考：優先權矩陣、事件管理、變更促成 |
| `comms` | 方法論 | 利害關係人溝通範本，依嚴重程度調整語氣 |
| `done-ops` | 方法論 | 維運任務驗證閘門 — 有證據才能結案 |

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
```

方法論技能（`itil`、`comms`、`done-ops`）會由工作流程技能自動載入，無需手動呼叫。

## 輸出

所有技能產出本地 markdown 檔案：

| 技能 | 輸出目錄 | 檔名格式 |
|---|---|---|
| `/incident` | `./incidents/` | `incident-YYYY-MM-DD-slug.md` |
| `/change-request` | `./changes/` | `change-request-YYYY-MM-DD-slug.md` |
| `/statuspage` | `./statuspage/` | `statuspage-YYYY-MM-DD-slug.md` |

若專案中有 `docs/{type}/` 目錄，技能會優先使用該目錄。

## 架構

兩層式技能架構：

- **工作流程技能** — 使用者直接呼叫的逐步流程
- **方法論技能** — 自動載入的領域知識（ITIL 4、溝通範本）

方法論技能採用漸進式揭露：SKILL.md 保持精簡（約 500 字），詳細內容放在 `references/`，僅在需要時載入。

## 授權

MIT
