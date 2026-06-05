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
staged diff → use `/review`. This skill is self-contained — it does not depend
on the `pr-review-toolkit` plugin being installed.

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
- **Empty** → resolve the current branch's PR: `gh pr view --json number,url`.
  If that command fails (no PR for this branch), stop and tell the user this
  branch has no open PR, and suggest `/review` for local changes. Do not
  fabricate a review.

## Step 2 — Collect the Static Review Bundle

Gather context with `gh`. Each command's purpose:

- `gh pr view <n> --json title,body,state,files,baseRefName,headRefName` —
  metadata + changed-file list.
- `gh pr diff <n>` — base/head diff with line numbers.
- `gh pr checks <n>` — CI/checks summary (read-only context, not a finding source).
- `gh api repos/<owner>/<repo>/pulls/<n>/comments` — existing review threads, to
  avoid duplicating points already raised.

If any context cannot be retrieved, note the gap explicitly in the output —
do not review as if the bundle were complete.

## Step 3 — Select Active Dimensions

Run the four default-on dimensions. Scan the diff and enable each diff-gated
dimension whose trigger (table above) is present. List the active dimensions
before reviewing so the user sees what was and was not checked.

## Step 4 — Run the Review

Same review content and output schema regardless of path.

**If the `Task` tool is available** (Claude Code): fan out one general-purpose
subagent per active dimension, in parallel. Each Task prompt must include:

- the changed-file path list (so the subagent reads only relevant files, not the
  whole repo),
- the relevant diff hunks,
- that dimension's review checklist,
- the required finding schema (severity, `file:line`, problem, risk, fix),
- the instruction to return findings only — no file edits, no test runs.

**If the `Task` tool is not available** (Codex or any single-context host):
review each active dimension sequentially in this context, applying the same
checklist and schema.

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

Combine results from all dimensions (or subagents):

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
問題：新增的權限檢查只驗證 userId，沒有驗證 tenantId。
風險：跨 tenant 請求可能讀到不屬於自己的資料。
建議：在查詢條件與授權檢查中同時驗證 tenantId。

[Medium] src/lib/cache.ts:88
問題：catch 區塊吞掉錯誤後回傳空陣列，呼叫端無法分辨「快取為空」與「讀取失敗」。
風險：上游失敗被靜默成正常結果，問題延後爆發且難以定位。
建議：讓 catch 重新拋出或回傳帶錯誤旗標的結果型別。
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

- `gh pr diff <n>` empty or errors → retry with `gh pr diff <n> --patch`. Private
  repo access failing → run `gh auth status` to confirm login before assuming the
  PR is empty.
- Subagents are isolated contexts — the Task prompt **must** carry the changed-
  file path list and diff hunks. Without them each subagent re-fetches the whole
  PR and wastes context.
- Empty `$ARGUMENTS`: `gh pr view --json number` failing means this branch has no
  PR → route to `/review`, do not fabricate a review.
- Secret-leak `Blocking` requires high confidence the value is real. Fake keys in
  test fixtures (`sk-test-...`, `AKIAIOSFODNN7EXAMPLE`) do not count.
- Never list “the PR has no tests” as a finding by itself. Absence of a test run
  is out of scope — only flag a genuine coverage gap for changed behavior.
- This skill is read-only. Code simplification is `/refactor` / `/simplify`, not
  here.

---

Next: if Blocking/High findings need fixes, switch to the PR branch locally and
run `/fix` per finding, then `/review` before pushing.
