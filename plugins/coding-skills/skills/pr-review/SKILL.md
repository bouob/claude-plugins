---
name: pr-review
description: 'Static risk review of a GitHub Pull Request — correctness, breaking changes, security, secret leaks, test/error-handling/type/comment risks. This skill should be used when the user asks to "review this PR", "review a pull request", "audit a PR", gives a PR URL or owner/repo#number, or wants a pre-merge risk check. Does NOT run tests/build/lint or modify files. For local uncommitted diff review use /review instead.'
argument-hint: '[PR URL | owner/repo#number | (empty = current branch PR)]'
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Task, Skill,
  Bash(gh pr view:*), Bash(gh pr diff:*), Bash(gh pr checks:*),
  Bash(gh api:*), Bash(gh auth status:*),
  Bash(git rev-parse:*), Bash(git branch:*)
---

# /pr-review — GitHub PR Static Risk Review

Read-only risk review of a GitHub Pull Request. Reads the diff, surrounding
context, existing comments, and CI summary, then reports merge risk. It does
**not** run tests, build, lint, or migrations, and it does **not** modify files
or submit GitHub reviews.

Scope split: `/pr-review` handles **remote GitHub PRs**. Local uncommitted or
staged diff → use `/review`.

This skill has two concerns:

1. The `pr-review` workflow: PR scope resolution, context collection, review
   dimensions, read-only rules, and output schema.
2. The execution policy: if the user explicitly asks for delegated or parallel
   review and the current environment supports it, split the review into bounded
   read-only slices. Otherwise run the same workflow sequentially.

The review dimensions below are anchors, not a closed list. Report any
high-confidence merge risk that is inside the PR scope, can be tied to the diff
or surrounding code, and has a concrete `file:line`.

## Skills Rubric

| Skill | When to load |
|-------|-------------|
| **principles** | Always — naming, types, SOLID, function length for the *Code* and *Type* dimensions |
| **testing** | When the diff touches test files — AAA structure, coverage gaps, test smells for the *Test* dimension |

## Review Dimensions

Eight static dimensions. **Default-on**: Code, Breaking change, Security, Secret
leak. **Diff-gated** (enable only when the diff contains the trigger):

| Dimension | Enable when the diff contains | Reuses |
|-----------|-------------------------------|--------|
| Code (correctness / boundaries / regression / project rules) | always | `principles` |
| Breaking change (API / schema / config / route / output shape / visible behavior) | always | — |
| Security (injection / authz bypass / CORS / auth / trust boundary / front-back validation gap) | always | project `security.md` if present |
| Secret leak (token / API key / private key / cookie / `.env` / config / log) | always | — |
| Type design (invariant expression / `any` / nullable-vs-required confusion) | `.ts`/`.tsx` type or interface changes | `principles` |
| Error handling (silent failure / swallowed error / unsafe fallback / wrong retry / unreturned error state) | try/catch, `.catch(`, fallback, retry, error-path changes | — |
| Test risk (missing coverage / wrong assertion / removed test / happy-path-only) | added/removed/changed test files | `testing` |
| Comment & doc consistency (comment / README / API doc / example contradicts code) | comment, README, or doc changes | — |

## Step 1 — Resolve PR Scope

Input: $ARGUMENTS

Resolve to a single PR:

- **PR URL** (`https://github.com/<owner>/<repo>/pull/<n>`) → use directly.
- **`owner/repo#number`** → use directly.
- **Empty** → resolve the current branch's open PR using whatever GitHub access
  the current environment provides. If no PR can be resolved for this branch,
  stop and tell the user this branch has no open PR, and suggest `/review` for
  local changes. Do not fabricate a review.

## Step 2 — Collect the Static Review Bundle

Gather enough context to build this review bundle:

- PR metadata: title, body, state, base branch, head branch, and changed files.
- Base/head diff with line numbers or patch hunks.
- CI/checks summary as read-only context, not a finding source.
- Existing review comments/threads, so the output does not duplicate points
  already raised.

If any context cannot be retrieved, note the gap explicitly in the output —
do not review as if the bundle were complete.

## Step 3 — Select Active Dimensions

Run the four default-on dimensions. Scan the diff and enable each diff-gated
dimension whose trigger (table above) is present. List the active dimensions
before reviewing so the user sees what was and was not checked.

## Step 4 — Run the Review

Use the same output schema regardless of execution style. Apply the active
dimension checklists, but stay open to adjacent correctness, compatibility,
security, or reliability risks discovered while tracing the PR.

### Delegated or Parallel Review

Use this path only when the user explicitly asks for `parallel`, `subagents`,
`delegation`, or equivalent wording, and the current environment provides a
supported way to delegate bounded review slices. Do not infer permission from a
normal `pr-review` request.

Choose the slice shape before delegating:

- Small or focused PR: one slice per active dimension or small dimension group.
- Large PR: one slice per file group, such as security-related files, tests,
  routes, data-access code, UI, or generated/config files.

Each delegated slice must receive:

- the PR metadata and changed-file path list,
- the relevant diff hunks,
- the dimensions or file group the slice owns,
- the checklist anchors below,
- the required finding schema (severity, `file:line`, problem, risk, fix),
- the instruction to return findings only — no file edits, no test runs,
- the instruction that checklist anchors are not exhaustive; adjacent clear
  merge risks inside PR scope should still be reported.

### Sequential Review

Use this path by default. Review each active dimension in this context, applying
the checklist anchors below.

Per-dimension checklist anchors:

- **Code** — wrong conditions, off-by-one, missing null guards, broken state
  transitions, dataflow errors, project-rule violations. Flag real defects, not
  style preference.
- **Breaking change** — does the change alter a public API, schema, config key,
  route, output format, or user-visible behavior? If the break looks
  intentional, ask for a migration note / compatibility strategy rather than
  calling it a bug.
- **Security** — injection, authz bypass, sensitive-data handling, dangerous
  APIs, CORS/auth changes, server-side trust boundary, client-data-trusted-for-
  authorization.
- **Secret leak** — real tokens/keys/private-keys/cookies/`.env` values in code,
  config, or logs. High-confidence real secrets → `Blocking`. A fake key inside
  a test fixture is **not** a leak.
- **Type design** — `any` introduced, nullable mixed with required, illegal
  states made representable, invariants not expressed in the type.
- **Error handling** — silent failure, swallowed exception, unsafe fallback,
  insufficient error message, wrong retry behavior, error state not returned.
- **Test risk** — new/changed behavior with no test or guard, test name
  contradicting test body, assertion validating wrong behavior, key test removed
  without replacement, happy-path-only leaving an obvious failure path unguarded.
- **Comment & doc consistency** — stale, misleading, or code-contradicting
  comments / README / API docs / examples.

## Step 5 — Merge Findings

Combine results from all dimensions and review slices:

- de-duplicate findings that point at the same `file:line`,
- calibrate severity against the table in Step 6,
- ensure every finding has file and line number,
- drop pure style preferences,
- skip points already raised in existing PR comments (from Step 2).

## Step 6 — Output

Order strictly: `Blocking` → `High` → `Medium` → `Low`. Omit any empty section.

- **Blocking** — security, data loss, clear correctness bug, compatibility break,
  secret leak.
- **High** — likely production bug after merge, severe test risk, broken error
  handling.
- **Medium** — maintainability, type design, test quality, architecture boundary.
- **Low** — comment clarity, naming consistency, readability.

Each finding has four lines: file:line, problem, risk, fix.

### Output example

```
[Blocking] src/api/user.ts:42
Problem: The new authorization check validates only userId and does not verify tenantId.
Risk: Cross-tenant requests may read data that belongs to another tenant.
Fix: Validate tenantId in both the query conditions and the authorization check.

[Medium] src/lib/cache.ts:88
Problem: The catch block swallows the error and returns an empty array, so callers cannot distinguish "empty cache" from "read failed".
Risk: Upstream failures are silently converted into successful results, delaying discovery and making the issue harder to diagnose.
Fix: Re-throw from catch or return a result type with an explicit error flag.
```

If nothing is found, write “未發現明顯破壞風險” and list the review limitations
(e.g. could not fetch full diff, CI summary unavailable, dimension X skipped).

## GitHub Write Rules

Default: do not submit reviews and do not resolve threads. Enter a write path
only on explicit user request:

- **“產生草稿” / "draft"** — output a paste-ready review summary + inline comment
  drafts only. Still no submission.
- **“送出 review” / "submit"** — first list exactly what will be sent and the
  target PR, then wait for explicit confirmation before any `gh` write.
- If draft comments conflict with each other, report the conflict first; do not
  guess the user's intent.

## Gotchas

- Empty or unavailable full diff → try another available way to obtain patch
  hunks or changed-file patches before assuming the PR is empty.
- Private repo access failing → verify authentication before assuming the PR is
  empty or inaccessible.
- Delegated reviewers are isolated contexts — every delegated slice **must**
  carry the PR metadata, changed-file path list, and relevant diff hunks. Without
  that bundle, the reviewer may duplicate data collection and waste context.
- This skill does not depend on external typed-agent toolkits. Use bounded
  delegated review only when the user explicitly asks for it and the environment
  supports it; otherwise run the same checklist inline.
- Empty `$ARGUMENTS`: if the current branch has no resolvable GitHub PR, route
  to `/review`, do not fabricate a review.
- Secret-leak `Blocking` requires high confidence the value is real. Fake keys in
  test fixtures (`sk-test-...`, `AKIAIOSFODNN7EXAMPLE`) do not count.
- Never list “the PR has no tests” as a finding by itself. Absence of a test run
  is out of scope — only flag a genuine coverage gap for changed behavior.
- This skill is read-only. Code simplification is `/refactor` / `/simplify`, not
  here.

---

Next: if Blocking/High findings need fixes, switch to the PR branch locally and
run `/fix` per finding, then `/review` before pushing.
