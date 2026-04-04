---
name: fix
description: 'Fix a bug using TDD. Diagnose root cause, write a failing test, then fix. This skill should be used when the user asks to "fix a bug", "debug and fix", "find and fix", or encounters a failing test, crash, or regression that needs a code fix. For diagnosis only without fixing, use /diagnose instead.'
argument-hint: [bug description | error message]
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Grep, Glob,
  Bash(git log:*), Bash(git diff:*), Bash(git show:*),
  Bash(npm test:*), Bash(npm run test:*), Bash(npx vitest:*),
  WebSearch, Skill
---

# /fix — Bug Fix Workflow

## Skills Rubric

| Skill | When to load |
|-------|-------------|
| **diagnose** | Always — systematic root cause investigation before fixing |
| **testing** | Always — core skill for reproducing and verifying fixes |
| **principles** | Root cause involves a design problem (SRP violation, missing DI, coupling) |
| **done** | Always — verify tests pass and no regressions before claiming fixed |

## Step 1: Diagnose Root Cause

Bug report: $ARGUMENTS

Read the relevant files and trace the execution path.

- Use `git log --oneline -20` to identify when the bug was introduced
- Use `git diff <commit>^ <commit>` to inspect the change that likely caused it
- Classify the bug type:
  - **Logic error** — wrong condition, off-by-one, incorrect algorithm
  - **Null / undefined** — missing guard at a boundary
  - **Type mismatch** — unexpected shape from external data
  - **Race condition** — async operations in wrong order
  - **Design smell** — symptom of a deeper structural problem

Document your findings in one sentence: "The bug was introduced in [commit/file] because [root cause]."

## Step 2: Load Skills

Apply the Skills Rubric above. Always load `testing`. Load `principles` if the root cause is structural.

## Step 3: Investigate

If the bug involves a third-party library or framework:

- Use WebSearch to check the official documentation, changelog, or migration guide
- Confirm the recommended fix approach before writing any code

Skip this step if the bug is purely in application logic with no external dependencies.

## Step 4: Plan Mode — Design Reproduction Test

Enter plan mode. Design the smallest test case that reproduces the bug.

- Minimum reproducible case only — no extra scenarios yet
- Specify: test file location, test name, what to assert, what data to arrange
- List any questions or ambiguities for the user to confirm

**Wait for user confirmation before writing any code.**

## Step 5: Red — Write the Failing Test

Write the reproduction test. Run it and confirm it fails.

- Confirm: "Test fails with [specific error message] because [root cause]."
- Do not touch production code yet.
- If the test does not fail, the reproduction is incorrect — revisit Step 1.

## Step 6: Green — Minimum Fix

Write the minimum change that makes the failing test pass.

- Do not refactor during this step
- Do not fix unrelated issues
- Confirm: "All tests pass."

## Step 7: Refactor

Clean up the fix and any immediately affected code.

- Apply naming, structure, and clarity improvements
- Confirm: "Tests still pass."

## Step 8: Regression Check

Run the test suite for the affected module.

- If a broader test suite exists, run it
- Look for tests that may have been silently masking the bug
- Confirm: "No regressions introduced."

---

Next: run `/review` to check style consistency and test quality of the fix.
