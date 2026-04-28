# Harness Engineering — Durability & Architecture

> The harness is the technical assembly around the model: CLAUDE.md, skills, rules,
> hooks, references, tools, permissions, memory. Models are replaceable engines
> (Sonnet → Opus → next generation); the harness is **durable goods** that
> carries forward across model swaps.

## Core Principle

**Knowledge belongs in the harness, not in prompts.** Prompts are ephemeral; harness
elements persist across sessions and survive model swaps.

When you find yourself writing the same instruction repeatedly across sessions, that
instruction belongs in the harness — not in another one-shot prompt.

## OODA Loop Framing

Harness engineering centers on spinning **Observe → Orient → Decide → Act** loops:

| Phase | Owner | What happens |
|---|---|---|
| Observe | Harness | Read environment data (filesystem, tool output, user input) |
| Orient | Harness | Shape and present information to the model |
| Decide | Model (LLM) | Select next action |
| Act | Harness | Execute the chosen command, API call, or tool |

**Three of four phases belong to the harness.** The model handles only Decide. This is
why "great prompt → great output" was wrong — the harness scaffolding around the model
determines whether the Decide step has good information to act on.

## 5-Layer Harness Architecture

(Adapted from claudecode-lab.com analysis of Claude Code itself as reference harness.)

| Layer | What | Examples |
|---|---|---|
| **1. Tool Design** | 5–15 focused tools with clear responsibility | Read, Edit, Write, Glob, Grep, Bash, Agent |
| **2. Layered Context** | Hierarchy of context sources, loaded by scope | `~/.claude/CLAUDE.md` global → project `CLAUDE.md` → memory → session |
| **3. Subagent Delegation** | Spawn isolated agents to prevent context pollution | Agent tool with subagent_type |
| **4. Hooks** | Deterministic post-processing that bypasses model judgment | `.claude/settings.json` PreToolUse/PostToolUse/Stop |
| **5. Permission Modes** | Allow safe tools by default, require approval for writes/destructive | `permissions.allow[]`, `permissions.deny[]` in settings |

Each layer is durable goods. None of them are tied to a specific model version.

## Where Does This Knowledge Belong? (Decision Tree)

```
Step 1 — Is this knowledge ephemeral (one-time, this-task-only)?
  ├── YES → leave it in prompt, do not save
  └── NO  → continue
        │
Step 2 — Must this be enforced 100% of the time (no model judgment allowed)?
  ├── YES → Hook (deterministic, runs outside the model)
  └── NO  → continue
        │
Step 3 — Is this triggered by a specific situation (user asks X, file Y is touched)?
  ├── YES → Skill (with a description that names the trigger)
  └── NO  → continue
        │
Step 4 — Is this a behavioral preference applied across many tasks?
  ├── YES → Rule (.claude/rules/*.md, scoped via frontmatter paths)
  └── NO  → continue
        │
Step 5 — Is this domain knowledge loaded only when needed?
  ├── YES → Reference (called by a skill via progressive disclosure)
  └── NO  → reconsider; this knowledge may not be worth persisting
```

## Element Properties

| Element | Activation | Model dependency | Best for |
|---|---|---|---|
| **Hook** | Deterministic (event-triggered shell or prompt) | None — runs outside model | Hard guardrails: block dangerous commands, enforce conventions |
| **Skill** | Description match → loaded into context | Reads in any sufficiently-capable model | Procedure + Gotchas + Verification for specific situations |
| **Rule** | Always loaded for matching paths | Light — describes intent, model executes | Cross-task behavioral preferences |
| **Reference** | On-demand (skill calls Read) | Light — structured data | Long domain knowledge that bloats SKILL.md if inlined |
| **CLAUDE.md** | Always loaded | Light — generic guidance | Project orientation, pointers to other elements |

**Rule of thumb**: pick the most-specific element that fits. CLAUDE.md is the catch-all
that decays first (read first and forgotten first under context pressure). Hooks are
the most durable (model-independent) but the least flexible.

## Skill Anatomy (Procedure + Gotchas + Verification)

Every skill should have all three sections:

- **Procedure**: numbered steps the model follows. Use `## Step N — title` headers, not
  prose. Cold-start agents read structure better than narrative.
- **Gotchas**: known failure modes with concrete strings (paths, commands, error
  messages). This is the highest-value section — it's what makes the skill survive a
  model swap. Update it every time you observe a failure.
- **Verification**: how to know the skill actually worked. "Output exactly: DONE" is a
  verification. "Make sure it's good" is not.

Missing any of these → the skill drifts in quality across model versions.

## Description Is a Trigger, Not a Summary

The skill's `description` frontmatter is matched against user requests to decide whether
to load the skill. Write it as a trigger condition:

```yaml
# Good — names the situations
description: >
  Use when the user asks to refactor a function, simplify nested conditionals, or
  reduce duplication across files. Do NOT use for: bug fixes, new features, or test
  writing.

# Bad — describes what it is
description: A skill for refactoring code.
```

The `Do NOT use for` clause is high-value: it prevents over-triggering and keeps the
skill's domain clear.

## Cross-Model Stability Checklist

Before publishing a skill, verify it works on the weakest model you intend to support
(typically Sonnet 4.6). Specifically:

- [ ] Steps are structural (`## Step N`), not tonal ("you must really make sure...")
- [ ] Gotchas list concrete strings, not vague advice
- [ ] Length is controlled by positive examples, not "please be concise"
- [ ] Required scaffolding for weaker models is kept; only remove it if the skill is
      pinned to a specific model via frontmatter `model: opus-4-7`

See `.claude/rules/cross-model-skill-design.md` (project-level) for the full pattern.

## Iteration Loop (do → learn → improve)

A skill is finished only after one full use → observe failure → update Gotchas cycle.
First-version skills are draft artifacts. The skill becomes durable after Gotchas
section captures real failure modes, not imagined ones.

**The lever is the harness, not the model.** When a workflow fails after a model
change, the fix is to update Gotchas/Procedure — not to wait for a better model.

## Industry Context (2026-04)

- **65% of enterprise AI failures** trace back to harness defects: Context Drift,
  Schema Misalignment, State Degradation. (See `anti-patterns.md` for definitions.)
- **88% of AI agent projects** never reach production. Harness design has emerged as
  the bottleneck, not model capability.
- AI Engineer World's Fair (April 2026): three independent speakers ranked "agent
  harness" and "context engineering" as the #1 priority topic.

These numbers reframe the engineering problem: shipping reliable AI is a harness
problem, not a model problem. Strong models with weak harness underperform; modest
models with strong harness can outrank them on specific tasks (Stanford Meta-Harness
research, 2026-04).

## Anti-Patterns (Brief — see `anti-patterns.md` for full catalogue)

- Putting per-task details in CLAUDE.md ("the current refactor uses pattern X") — these
  belong in the conversation, not in persistent context
- Writing skills without Verification — the model declares done without evidence
- Description as marketing copy — load criteria become fuzzy
- Inlining 5KB of reference data into SKILL.md — bloats every load; use `references/`
  instead
- Hook for something that's actually a preference (not a hard rule) — over-rigid,
  fights the user when context shifts
- Removing scaffolding "because Opus 4.7 doesn't need it" without pinning the skill to
  Opus 4.7 — silently degrades for Sonnet users
- Tool overload (>15 in one context) — selection accuracy collapses; delegate overflow
  to subagents
- Auto-approving destructive actions — disasters become inevitable; default to user
  approval for writes

## Related Memories

- `feedback_harness-engineering.md` — Harness is durable goods, model is the engine
- `feedback_model-agnostic-skill-design.md` — Skill = Procedure + Gotchas + Verification
- `.claude/rules/cross-model-skill-design.md` — Sonnet-vs-Opus stability patterns
