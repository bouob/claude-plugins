---
name: review
description: 'Review local code changes for style, test quality, and architecture. This skill should be used when the user asks to "review code", "review my changes", "check code quality", "review the diff", or wants a pre-commit code review. Not for GitHub PR review — use a dedicated PR review tool instead.'
argument-hint: [--staged | path | (empty=latest commit)]
disable-model-invocation: true
allowed-tools: Read, Grep, Glob,
  Bash(git diff:*), Bash(git show:*),
  Skill
---

# /review — Local Code Review Workflow

## Skills Rubric

| Skill | When to load |
|-------|-------------|
| **principles** | Always — check naming, types, SOLID, function length |
| **testing** | Always — check AAA structure, coverage, test smells |

## Step 1: Collect Change Scope

Review target: $ARGUMENTS

Determine what to review based on the argument:

- `--staged` → `git diff --staged`
- `path` → `git diff HEAD -- {path}`
- *(empty)* → `git show HEAD`

Read the changed files in full to understand context — not just the diff.

## Step 2: Load Skills

Load both skills. Both rubrics apply to every review.

## Step 3: Style Consistency

Compare changed code against the surrounding unchanged code.

- Does naming follow the convention table in `principles`?
- Is import order correct?
- Are function bodies within the length limits?
- Any `any` types or magic numbers introduced?

Flag inconsistencies, not personal preferences.

## Step 4: Test Quality

Evaluate the tests added or modified.

- Do tests follow AAA structure?
- Is there one logical assertion per test?
- Are test names readable as sentences?
- Any test smells from the `testing` smell table?
- Does new behavior have an integration test, not just unit tests?

## Step 5: Architecture Check

Scan for boundary violations in the changed code.

- Does any import cross subsystem boundaries?
- Does dependency direction follow the layer rules (Pages → Layouts → Components → Lib)?
- Is business logic leaking into the wrong layer?

## Step 6: Output — Categorized Issue List

Report findings in three categories:

**High** — Correctness or security issues; must fix before merging.
- Examples: logic errors, missing null guards, security vulnerabilities, broken types, boundary violations

**Medium** — Code quality issues; should fix soon.
- Examples: naming violations, missing tests, function too long, magic numbers

**Low** — Style suggestions; fix if convenient.
- Examples: import order, minor naming improvements, comment clarity

Format each issue as:
```
[HIGH] file.ts:42 — description of the problem
[MED]  file.ts:87 — description of the problem
[LOW]  file.ts:12 — description of the problem
```

If no issues are found in a category, omit that section.

---

Next: run `/refactor` if Medium issues reveal structural problems worth cleaning up.
