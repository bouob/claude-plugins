---
name: agent-harness-init
description: Initialize agent-harness model routing for Codex. Writes Codex-only config under .codex or ~/.codex using inherit or explicit per-role routing.
argument-hint: "[--project | --user | --show]"
---

# Agent Harness Init for Codex

Configure Codex-only model routing for agent-harness.

This skill is the Codex equivalent of Claude Code's `/agent-harness:init`.
Codex does not provide a namespaced slash command for this plugin, so users call
this skill as `agent-harness-init` or `$agent-harness:agent-harness-init`.

## Interaction Goals

This skill should feel like a short first-run setup flow, not a schema dump.

- In the first reply, explain in plain language that this sets model routing for
  planning, checking, coding, and simple research tasks.
- Do not show JSON, raw role names, or file paths in the first reply unless the
  user passed `--show` or explicitly asked for them.
- Keep canonical option labels and example replies in English in this skill.
  The assistant may still phrase the surrounding explanation in the user's
  language and should map equivalent replies from other languages.
- Ask for at most two decisions in the first round:
  - scope: `This project only` or `All projects`
  - setup style: `Quick recommended setup`, `Follow current session for everything`, or `Custom setup`
- Prefer short reply templates such as `1 + 1` or `This project only + Custom setup`.
- Delay `.gitignore`, exact target paths, and resolved JSON until preview or
  until the user asks for technical details.
- Treat `Quick recommended setup` as the user-facing label for `balanced`.
- Treat `Follow current session for everything` as the user-facing label for `all-inherit`.
- For `Custom setup`, ask by work type first, then map to internal roles:
  - `Planning and review` -> `planner` and `evaluator`
  - `Coding` -> `generator.code` and `generator.write`
  - `Research / simple tasks` -> `generator.research` and `generator.collect`
- Default each work-type pair to the same model and reasoning unless the user
  asks to split them further.
- Use concrete examples in the prompt because earlier Codex models are more
  reliable with explicit answer formats than with open-ended questions.

## References

- `../../references/codex-config-schema.md` - Codex config schema and lookup order

## Step 1 - Detect Existing Config

Read these files in order:

1. `./.codex/agent-harness.local.json`
2. `~/.codex/agent-harness.json`

If either file exists:

1. Parse the JSON.
2. If it is v1, resolve it as v2 by treating every role as
   `{"mode": "inherit"}`.
3. Summarize the current effective setup in plain language first.
4. Show the current resolved config in a fenced code block only when:
   - the user passed `--show`
   - the user explicitly asks to see the JSON
   - or the conversation is already in preview/confirmation stage
4. If parsing fails, report the invalid file and recommend reconfiguration.

If the user passed `--show`, print the resolved config and stop without writing.

## Step 2 - Choose Target

If the user passed `--project`, target `./.codex/agent-harness.local.json`.

If the user passed `--user`, target `~/.codex/agent-harness.json`.

If no target flag is present, ask the user which target to write:

- `This project only` - project config
- `All projects` - user config

In the first prompt, prefer these plain-language labels instead of file paths.
Only mention the exact path after the user chooses or when previewing.

Recommend project config when the user is inside a repository and wants the
setting to apply only there. Recommend user config when they want the same
behavior across repositories.

## Step 3 - Choose Routing Strategy

Ask which preset to use:

- `Quick recommended setup` (`balanced`)
- `Follow current session for everything` (`all-inherit`)
- `Custom setup` (`custom`)

When this step is combined with Step 2 for a first-run user, prefer a short
setup prompt like:

```text
I can help set up agent-harness model routing so planning, review, coding, and
simple research tasks can use different models automatically.

First choose the scope:
1. This project only (recommended)
2. All projects

Then choose the setup style:
1. Quick recommended setup
2. Follow current session for everything
3. Custom setup

Reply with: `1 + 1`
```

### `all-inherit`

Write the built-in default:

```json
{
  "version": 2,
  "host": "codex",
  "models": {
    "planner": { "mode": "inherit" },
    "evaluator": { "mode": "inherit" },
    "generator": {
      "code": { "mode": "inherit" },
      "write": { "mode": "inherit" },
      "research": { "mode": "inherit" },
      "collect": { "mode": "inherit" }
    }
  }
}
```

### `balanced`

Write this preset:

```json
{
  "version": 2,
  "host": "codex",
  "models": {
    "planner": {
      "mode": "explicit",
      "model": "gpt-5.5",
      "reasoning_effort": "high"
    },
    "evaluator": {
      "mode": "explicit",
      "model": "gpt-5.4",
      "reasoning_effort": "medium"
    },
    "generator": {
      "code": {
        "mode": "explicit",
        "model": "gpt-5.4",
        "reasoning_effort": "high"
      },
      "write": {
        "mode": "explicit",
        "model": "gpt-5.4",
        "reasoning_effort": "medium"
      },
      "research": {
        "mode": "explicit",
        "model": "gpt-5.4-mini",
        "reasoning_effort": "low"
      },
      "collect": {
        "mode": "explicit",
        "model": "gpt-5.4-mini",
        "reasoning_effort": "low"
      }
    }
  }
}
```

### `custom`

Do not start by asking for all six internal roles. Start with work types:

1. `Planning and review`
2. `Coding`
3. `Research / simple tasks`

Ask the user for each work type:

1. `inherit` or `explicit`
2. If `explicit`, ask for `model`
3. If `explicit`, ask for `reasoning_effort`

Default mapping:

- `Planning and review` -> `planner` and `evaluator`
- `Coding` -> `generator.code` and `generator.write`
- `Research / simple tasks` -> `generator.research` and `generator.collect`

If the user wants finer control, then ask whether they want to split either of
these pairs into separate role settings.

Prefer a concrete reply template such as:

```text
Planning and review: gpt-5.5 high
Coding: gpt-5.4 high
Research / simple tasks: gpt-5.4-mini high
```

If the user answers in natural language, map it into the role structure above
without forcing them to restate it in internal terminology.

Accepted `reasoning_effort` values are:

- `low`
- `medium`
- `high`
- `xhigh`

Users may leave `reasoning_effort` empty only if they want to override the
model while keeping the current session reasoning level.

Do not translate Claude model names such as `opus`, `sonnet`, or `haiku` into
this file. Use Codex model ids such as `gpt-5.5`, `gpt-5.4`, or
`gpt-5.4-mini`.

## Step 4 - Preview and Confirm

Show:

- Selected target path
- A short explanation:
  `Roles in inherit mode use the current Codex session model and reasoning. Roles in explicit mode pass model and optional reasoning overrides.`
- A role table with columns:
  - Role
  - Mode
  - Model
  - Reasoning
- The JSON that will be written

At this stage, it is appropriate to introduce:

- the exact file path that will be written
- the mapping from work types to internal roles
- a note about `.codex/*.local.json` ignore rules when relevant

Ask for confirmation before writing.

## Step 5 - Write Config

Create the parent directory if needed, then write the pretty-printed JSON with
2-space indentation.

After writing, tell the user:

```text
Config written. Codex sprints will use per-role inherit or explicit routing for Planner, Evaluator, and Generator subagents.
```

## Gotchas

- Do not read or write `.claude/agent-harness*.json` from this skill.
- Do not edit `~/.claude/agent-harness.json`; that file belongs to Claude Code.
- If sandbox permissions block writing `~/.codex/agent-harness.json`, request
  approval instead of choosing another location silently.
- Project config should be local-only. If the repository does not already ignore
  `.codex/*.local.json`, mention that the user may want to add an ignore rule.
- Do not hard-code a runtime allowlist of model ids. Codex model availability is
  account-specific and time-sensitive.
- Do not front-load JSON, file paths, or `.gitignore` advice in the first reply
  unless the user explicitly asked for technical details.
