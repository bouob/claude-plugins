# GBrain × Notion Sync — User Guide

> 最後更新：2026-05-25
> 對象：日常使用者（非安裝/設定，那份在 RUNBOOK.md）

---

## 架構一句話

```
Notion（人類介面）←→ sync-state.db（基線）←→ gbrain（Agent 介面）←→ Claude Code（MCP）
```

- **Notion** 是唯一的 source of truth
- **gbrain** 是本地的 agent-friendly 鏡像，讓 Claude 能高速搜尋
- **sync-state.db** 記錄每次 sync 後兩邊的快照，用來判斷下次誰改過

---

## gbrain 什麼時候自動跑？

### ✅ 自動：gbrain MCP（Claude Code 開啟就在線）

Claude Code 啟動時，gbrain MCP server 自動啟動。Claude 能直接搜尋、讀取 brain 裡的 Notion 鏡像內容。**你不需要做任何事。**

### 🖐 手動：Notion Sync

把 Notion 最新內容同步進 gbrain **不是自動的**，需要你手動觸發。  
（Windows Task Scheduler 試過但每次跳 console 視窗太擾人，已移除。）

---

## 日常工作流程

```
你在 Notion 更新了 TODO / Project / 知識庫
          ↓
    /notion-sync pull       ← 拉進 gbrain
          ↓
跟 Claude 工作（Claude 透過 gbrain MCP 查詢最新內容）
```

**pull 永遠安全**：只讀 Notion，只寫 gbrain，不動你的 Notion 原始資料。

---

## 命令速查

| 指令 | 做什麼 |
|------|--------|
| `/notion-sync pull` | Notion → gbrain（最常用） |
| `/notion-sync status` | 顯示上次 sync 時間、頁數摘要 |
| `/notion-sync doctor` | 健康檢查（7 項驗證） |
| `/notion-sync push` | gbrain → Notion（⚠️ 尚未正式授權，先別用） |

---

## 同步比較機制

系統**不比較時間誰先誰後**，而是比「跟上次 sync 的基線差多少」：

| Notion 改過？ | Local 改過？ | 結果 |
|:---:|:---:|------|
| ❌ | ❌ | `skip` — 兩邊沒動，略過 |
| ✅ | ❌ | `to_brain` — Notion 更新，重拉進 gbrain |
| ❌ | ✅ | `to_notion` — Local 改了，推回 Notion |
| ✅ | ✅ | `conflict` — **Notion 贏**，local 備份到 `.conflict/` |

> **Notion 改過** = `last_edited_time` 跟上次 sync 記錄的不同  
> **Local 改過** = gbrain 頁面 body 的 SHA-256 跟上次記錄的不同

---

## 目前限制

| 限制 | 說明 |
|------|------|
| Push 暫停使用 | Phase 2 code 完成，但 live 寫入測試尚未授權（會實際改 Notion） |
| Vector search 未啟用 | 搜尋走 keyword；中文短詞可能 miss；啟用需設 `OPENAI_API_KEY` |
| 首次出現的頁面 | 第一次 sync 只記錄基線，**第二次** sync 才開始追蹤變更 |
| Callout / Toggle / Table | 這類 block push 時會自動降級為 conflict（保護機制） |

---

## 故障排除

| 症狀 | 處理方式 |
|------|---------|
| Claude 看不到 Notion 最新內容 | `/notion-sync pull` 一次 |
| Pull 失敗 | `/notion-sync doctor` 看哪項掛掉 |
| 出現 `.conflict/` 備份 | 手動比對備份與 Notion 現況後合併，不需任何指令 |
| 想確認 sync 狀態 | `/notion-sync status` |
