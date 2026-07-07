# bouob-plugins

[繁體中文](./README.zh-TW.md)

Claude Code plugin marketplace by [Victor](https://github.com/bouob).

## Plugins

| Plugin | Description |
|--------|-------------|
| [agent-harness](https://github.com/bouob/agent-harness) | Multi-agent harness — Planner→Generator→Evaluator sprints run as background dynamic workflows, with fable/opus/sonnet/haiku model routing |
| [claude-statusline](https://github.com/bouob/claude-statusline) | Zero-dependency statusline with rainbow progress bar, 10 themes, rate limit monitoring, and natural language config |
| [coding-skills](https://github.com/bouob/coding-skills) | Opinionated coding skills for TypeScript, React, and Python — TDD, SOLID, spec-driven design, and code review |
| [gbrain-notion-sync](https://github.com/bouob/gbrain-notion-sync) | One-way Notion PAI second-brain to local gbrain knowledge graph sync — hybrid search and graph traversal across your Notion content via the /notion-sync command, without hitting the API rate limit |
| [repo-vet](https://github.com/bouob/repo-vet) | Pre-use security vetting for third-party repos — static analysis for credential theft, hidden outbound connections, install-time attacks, obfuscated payloads, and supply-chain risks |
| [sysadmin-skills](https://github.com/bouob/sysadmin-skills) | ITIL 4-based IT operations skills — incident response, change management with CAB review, and status communication |

## Usage

```bash
# Add marketplace (one-time)
/plugin marketplace add bouob/claude-plugins

# Browse and install
/plugin
# → Discover tab lists all plugins

# Or install directly
/plugin install agent-harness@bouob-plugins
/plugin install claude-statusline@bouob-plugins
/plugin install coding-skills@bouob-plugins
/plugin install gbrain-notion-sync@bouob-plugins
/plugin install repo-vet@bouob-plugins
/plugin install sysadmin-skills@bouob-plugins

# Update installed plugins to the latest version later
/plugin marketplace update bouob-plugins
```

## License

MIT
