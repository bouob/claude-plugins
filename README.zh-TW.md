# bouob-plugins

[English](./README.md)

由 [Victor](https://github.com/bouob) 維護的 Claude Code plugin marketplace。

## Plugins

| Plugin | 說明 |
|--------|------|
| [agent-harness](https://github.com/bouob/agent-harness) | 多代理人編排架構 — Planner→Generator→Evaluator Sprint 以背景 dynamic workflow 執行，搭配 fable/opus/sonnet/haiku model routing |
| [claude-statusline](https://github.com/bouob/claude-statusline) | 零相依性狀態列，內建彩虹進度條、10 種主題、rate limit 監控、自然語言設定 |
| [coding-skills](https://github.com/bouob/coding-skills) | TypeScript、React、Python 開發方法論 — TDD、SOLID、spec-driven 設計與 code review |
| [gbrain-notion-sync](https://github.com/bouob/gbrain-notion-sync) | Notion PAI 第二大腦單向同步到本地 gbrain 知識圖譜 — 透過 /notion-sync 指令對 Notion 內容做 hybrid search 與 graph traversal，不受 Notion API 速率限制 |
| [repo-vet](https://github.com/bouob/repo-vet) | 第三方 repo 使用前安全審查 — 靜態分析偷 key、隱藏對外連線、安裝期攻擊、混淆 payload 與供應鏈風險 |
| [sysadmin-skills](https://github.com/bouob/sysadmin-skills) | ITIL 4 IT 維運技能 — 事件回應、變更管理與 CAB 審查、狀態溝通 |

## 使用方式

```bash
# 加入 marketplace（只需一次）
/plugin marketplace add bouob/claude-plugins

# 瀏覽並安裝
/plugin
# → Discover 分頁會列出所有 plugins

# 或直接安裝
/plugin install agent-harness@bouob-plugins
/plugin install claude-statusline@bouob-plugins
/plugin install coding-skills@bouob-plugins
/plugin install gbrain-notion-sync@bouob-plugins
/plugin install repo-vet@bouob-plugins
/plugin install sysadmin-skills@bouob-plugins

# 之後更新已安裝的 plugin 到最新版
/plugin marketplace update bouob-plugins
```

## 授權

MIT
