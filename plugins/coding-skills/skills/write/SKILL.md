---
name: write
description: 'Implement a small to medium feature with TDD approach. This skill should be used when the user asks to "write a feature", "implement", "add functionality", "build", or describes a new feature to create. For large features requiring architecture exploration, consider a feature-dev plugin.'
argument-hint: [feature description]
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Grep, Glob,
  Bash(git log:*), Bash(git diff:*), Bash(git show:*),
  Bash(npm test:*), Bash(npm run test:*), Bash(npx vitest:*),
  Skill
---

# /write — Feature Implementation Workflow

## Skills Rubric

| Skill | When to load |
|-------|-------------|
| **spec** | When the Spec Gate says NO (see Step 2) |
| **principles** | Always — design decisions are part of every feature |
| **testing** | Always when the feature introduces new behavior (almost always) |
| **done** | Always — run verification before claiming the feature is complete |

## Step 1: Understand the Context

Feature request: $ARGUMENTS

Read the relevant files before writing any code.

- Identify which files / modules will be affected
- Look at existing patterns in adjacent code (`git log --oneline -10` for recent context)
- Do NOT read framework source code — only application code

## Step 2: Spec Gate — TDD or SDD First?

Before loading skills or writing any plan, answer these three questions:

| Question | If YES |
|----------|--------|
| Is this a bug fix or internal change that does not touch the public interface? | Skip spec → go to Step 3 |
| Does a TypeScript interface / function signature already exist for this? | Skip spec → go to Step 3 |
| Can you name 3+ boundary cases right now without thinking hard? | Skip spec → go to Step 3 |

**If you could not answer YES to any question → load `spec` skill now. Complete the spec output (behaviour description + interface + invariants) before continuing.**

When spec is complete, return here. The invariants become the first test cases in Step 4.

## Step 3: Load Skills

Apply the Skills Rubric. Load `principles` and `testing` always. `spec` only if Spec Gate triggered it.

## Step 4: Plan Mode — TDD Task Breakdown

Enter plan mode. Break the feature into the smallest meaningful tasks.

- Apply minimum change principle: prefer extending over modifying
- Each task should be completable as one Red/Green/Refactor cycle
- List any questions or assumptions for the user to confirm

**Wait for user confirmation before writing any code.**

## Step 5: Implement (Red → Green → Refactor per task)

For each task in the breakdown:

**Red** — Write a failing test that describes the behavior.
- Confirm: "Test fails because [reason]."

**Green** — Write minimum code to pass the test.
- Confirm: "All tests pass."

**Refactor** — Clean up without changing behavior.
- Confirm: "Tests still pass."

## Step 6: Completion Check

Verify against both skill rubrics:

- **principles rubric** — naming, types, function length, import order
- **testing rubric** — AAA structure, single assertion, deterministic, integration path exists

---

Next: run `/review` to verify style consistency and test quality before committing.
