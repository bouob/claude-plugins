# gbrain CLI 簽名驗證

> Phase 2.1 Step 0 artifact。**先驗證、再寫 adapter** —— progress.md「三個 alignment bug + Bug 4/5」反覆證明 adapter 沒對齊真實 CLI 會讓 sync 全壞。
> **驗證日期**：2026-05-22 ｜ **gbrain 版本**：0.35.1.0 ｜ **執行 cwd**：`D:\Desktop\side-project`（非 gbrain repo）

---

## `gbrain get <slug>`

```
Usage: gbrain get <slug> [options]
Options:
  <slug>              Page slug (required)
  --fuzzy             模糊比對 slug（default false）
  --include-deleted   顯示 soft-deleted 頁面（default false）
```

- **輸出**：原始 markdown（YAML frontmatter + body）印到 **stdout**。
- **`--json` flag 不存在** —— 加了也被靜默忽略，輸出格式不變。
- 實測 frontmatter keys（Phase 1 pull 的頁）：`type` / `title` / `source` / `notion_page_id`。frontmatter 由 gbrain 在 `put` 時用 gray-matter 重新序列化（純 YAML，字串值不一定有引號）。
- **不含** `content_hash` / `updated_at` / `created_at`。
- exit code：成功 0。

## `gbrain list`

```
Usage: gbrain list [options]
Options:
  --type              依 page type 過濾
  --tag               依 tag 過濾
  --limit             最多筆數（default 50）
  --updated-after     ISO date（YYYY-MM-DD）或完整 timestamp；回傳 updated_at > value
  --sort              updated_desc（default）| updated_asc | created_desc | slug
  --include-deleted   含 soft-deleted
```

- **輸出**：TSV，每行 `slug<TAB>type<TAB>date<TAB>title`。
- **`date` 欄只到日期**（`2026-05-16`），無時分秒。
- **`--json` flag 不存在** —— 輸出永遠是 TSV。
- 空結果印 `No pages found.`（exit 0）。
- `--updated-after 2026-05-20` 實測有效（回 `No pages found.`，因全部頁 updated_at 停在 05-16）。

## `gbrain put <slug> --content <md>`

```
Options:
  <slug>      Page slug (required)
  --content   完整 markdown 含 YAML frontmatter（required）
```

- `--content` 吃**完整** markdown（含 frontmatter）。Phase 1 已驗證可寫入。

## `gbrain delete <slug>`

- Soft-delete，72h 內可 `restore_page` 復原。

## 共通

- **`[ai.gateway] recipe "google" ...` 警告行印在 stderr** —— stdout 乾淨。adapter 捕捉 stdout 即可，但 parser 仍應從第一個 `---` 開始解析以求穩健。

---

## 對 Phase 2 的結論

| 決策點 | 結論 |
|--------|------|
| 變更偵測路線 | **Path A**：`get`/`list` 都不給 `content_hash`，CLI `list` 的 date 只到日。adapter 自行 `sha256(body)`。 |
| 增量粗篩 | `list --updated-after <date>` 可當粗篩（日粒度），但 hash 比對才是權威判定。 |
| `getPage` 實作 | 用 `runGbrainRaw`（純 stdout，**不** `JSON.parse`），自行解析 frontmatter + body。 |
| `listPages` 實作 | 解析 TSV，跳過 `No pages found.` 與空行。 |
| stderr 雜訊 | 無需特別處理（stdout/stderr 分流），parser 從第一個 `---` 起算即可。 |
