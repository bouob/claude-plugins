# Claude Code Change Recommendations

This file records Claude Code-side changes suggested while adding Codex support. Codex support should not silently reshape the Claude Code plugin runtime.

## Current Recommendation

No Claude Code command or sprint skill rewrite is required for the Codex adapter.

The only Claude-facing changes recommended for v0.7.0 are:

- Update README content to document the new Codex adapter.
- Bump Claude plugin metadata to `0.7.0` so both plugin manifests describe the same release.
- Keep `commands/init.md` and `skills/sprint/SKILL.md` Claude Code-only.

## Deferred Ideas

- Add a Claude Code note that Codex support now lives in `.codex-plugin/` and `codex/`.
- Consider a future shared `core/` directory if both adapters begin duplicating large sections of the sprint contract.
- Do not reintroduce schema v2 `{ engine, model }` routing unless both hosts have a stable shared configuration story.
