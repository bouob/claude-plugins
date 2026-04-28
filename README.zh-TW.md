# bouob-plugins

[English](./README.md)

由 [Victor](https://github.com/bouob) 維護的 Claude Code plugin marketplace。

## Plugins

| Plugin | 說明 |
|--------|------|
| [claude-statusline](https://github.com/bouob/claude-statusline) | 零相依性狀態列，內建彩虹進度條、10 種主題、自然語言設定 |
| [coding-skills](https://github.com/bouob/coding-skills) | TypeScript、React、Python 開發方法論 — TDD、SOLID、spec-driven 設計 |
| [sysadmin-skills](https://github.com/bouob/sysadmin-skills) | ITIL 4 IT 維運技能 — 事件回應、變更管理與 CAB 審查 |
| [agent-harness](https://github.com/bouob/agent-harness) | 多代理人編排架構 — 自主 Planner→Generator→Evaluator Sprint，搭配 Agent Teams 平行執行 |

## 使用方式

```bash
# 加入 marketplace（只需一次）
/plugin marketplace add bouob/claude-plugins

# 瀏覽並安裝
/plugin
# → Discover 分頁會列出所有 plugins

# 或直接安裝
/plugin install claude-statusline@bouob-plugins
/plugin install coding-skills@bouob-plugins
/plugin install sysadmin-skills@bouob-plugins
/plugin install agent-harness@bouob-plugins
```

## 授權

MIT
