---
name: refactor
description: 'Clean up existing code by identifying smells and applying safe refactoring. Behavior must not change. This skill should be used when the user asks to "refactor", "clean up code", "simplify", "extract function", "reduce complexity", or mentions code smells, tech debt, or structural improvements. For bug fixes use /fix. For new features use /write.'
argument-hint: [path | module]
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Grep, Glob,
  Bash(git log:*), Bash(git diff:*), Bash(git show:*),
  Bash(npm test:*), Bash(npm run test:*), Bash(npx vitest:*),
  WebSearch, Skill
---

# /refactor — Safe Refactoring Workflow

## Skills Rubric

| Skill | When to load |
|-------|-------------|
| **testing** | Tests exist that cover the target — required before any refactoring |
| **principles** | Refactoring addresses SOLID violations, naming, or dependency direction |
| **done** | Always — verify tests still pass and no regressions after refactoring |

## Step 1: Analyze Code Smells

Refactoring target: $ARGUMENTS

Read the target path and scan for problems.

- Use `git log -- <path>` to check recent change history (exclude recently refactored areas)
- Classify each smell by severity:

| Smell | Example | Severity |
|-------|---------|----------|
| Long Method | Function body > 50 lines (TS) / 60 lines (Python) | High |
| Large Class | Class with too many responsibilities | High |
| Duplicated Code | Same logic copy-pasted in ≥ 3 places | Medium |
| Dead Code | Exported but never imported; unreachable branches | Medium |
| Magic Numbers | `if (status === 3)` with no named constant | Medium |
| Wrong Layer | Business logic in a route handler or component | High |
| Circular Import | Module A imports B, B imports A | High |
| `any` Type | Escaping the type system | Medium |

Exclude smells that were intentionally introduced or appear in recently refactored commits.

## Step 2: Load Skills

Apply the Skills Rubric above. **Do not start if tests do not exist** — write tests first using `/fix` or `/write`, then return.

## Step 3: Investigate

If the refactoring touches a framework-specific pattern (e.g., React hooks, Astro components, Python dataclasses):

- Use WebSearch to confirm the officially recommended pattern before restructuring
- Skip if the change is purely internal (renaming, extracting functions, removing duplication)

## Step 4: Plan Mode — Refactoring Plan

Enter plan mode. Prioritize by: high impact first, low regression risk first.

For each smell:
- Identify the minimal transformation (Extract Function, Rename, Move, Inline, etc.)
- Verify the transformation preserves behavior (no logic changes)
- Verify dependency direction stays correct after any Move operations:
  - Pages/Routes → Layouts → Components → Lib/Utils
  - No reverse dependencies
  - No cross-subsystem imports

**Wait for user confirmation before writing any code.**

## Step 5: Refactor (one smell at a time)

For each item in the plan:

1. Confirm tests pass before starting: "Tests green before change."
2. Apply the single transformation — nothing else
3. Confirm tests still pass: "Tests green after change."
4. If tests fail, revert the transformation and investigate before retrying

Do not combine multiple transformations in one step. Small, verifiable increments only.

## Step 6: Completion Check

Verify against both skill rubrics:

- **principles rubric** — naming, function length, import order, no `any`, no magic numbers
- **testing rubric** — tests still pass, no test smells introduced, coverage not reduced

---

Next: run `/review` on the refactored diff — if review is clean, done.
