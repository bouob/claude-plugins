# gbrain Compatibility Matrix

This table tracks which gbrain versions have been tested with the notion-sync plugin.

| gbrain version | tested at  | breaking? | notes |
|----------------|------------|-----------|-------|
| 0.34.0         | 2026-05-16 | no        | initial — Phase 0 setup; PGLite backend; plugin_version gbrain-plugin-v1 |
| 0.35.1.0       | 2026-05-22 | no        | Phase 2 bidirectional sync; `get`/`list` CLI signatures verified (docs/gbrain-cli-signatures.md) |

---

## Notes

- **breaking?** = `yes` means the plugin manifest, CLI flags, or subagent API changed in a way that requires code edits
- Test environment: Windows 11, bun 1.2.22, node v24.15.0
- When upgrading gbrain, re-run `gbrain doctor` and `bun scripts/sync-pull.mjs --database projects --dry-run` to verify no regressions
- Verified flags (gbrain 0.35.1.0): `gbrain get` (`--fuzzy`, `--include-deleted`), `gbrain list` (`--type`, `--tag`, `--limit`, `--updated-after`, `--sort`). Neither supports `--json`.
- Unverified flags: `gbrain extract links --source` and `--since` (see `subagents/notion-pull.md` TODO)
