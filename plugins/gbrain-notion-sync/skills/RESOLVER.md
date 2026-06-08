# GBrain Skill Resolver

This is the dispatcher. Skills are the implementation. **Read the skill file
before acting.** If two skills could match, read both.

## Brain operations

| Trigger | Skill |
|---------|-------|
| "/notion-sync", "sync notion", "pull notion", "push notion", "refresh brain", "init notion sync", "notion sync status", "notion sync conflicts", "notion sync doctor", "同步 notion", "拉取 notion", "推回 notion", "雙向同步", "brain 沒更新", "檢查 notion 同步", "notion 衝突" | `skills/notion-sync/SKILL.md` |

## Disambiguation rules

1. All Notion ↔ gbrain sync intents route to `skills/notion-sync/SKILL.md`;
   pick the sub-command (init/pull/push/conflicts/schedule/status/doctor) from
   the user's verb.
2. When in doubt about scope (one DB vs all four), ask the user before writing.
