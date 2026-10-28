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

This skill has three concerns:

1. The `pr-review` workflow: PR scope resolution, context collection, review
   dimensions, read-only rules, and output schema.
2. The execution policy: delegate **every** review dimension to this plugin's
   five read-only specialist agents and run them all in parallel — every time.
   Fixing dispatch this way keeps every dimension covered, keeps this context
   free of inline review, and keeps output uniform. There is no diff-gating of
   dispatch and no user-facing toggle: the main context only builds the bundle,
   fans out the Task calls, and merges. A host without the Task tool degrades to
   a single inline pass over the same checklist anchors.
3. The evidence policy: finding is not verifying. Every reviewer reports which
   changed files it covered, so a dropped file surfaces as a gap instead of a
   silent clean result; every Blocking/High candidate is then re-checked by a
   fresh `finding-verifier` that did not find it and tries to disprove it.

The review dimensions below are anchors, not a closed list. Report any
high-confidence merge risk that is inside the PR scope, can be tied to the diff
or surrounding code, and has a concrete `file:line`.

## Skills Rubric

| Skill | When to load |
|-------|-------------|
| **principles** | Always — naming, types, SOLID, function length for the *Code* and *Type* dimensions |
| **testing** | When the diff touches test files — AAA structure, coverage gaps, test smells for the *Test* dimension |

## Review Dimensions

Eight static dimensions, each owned by one specialist agent. All are reviewed
every time — the **Enable when** column is now **informational** (it tells each
agent what to focus on), not a dispatch gate.

| Dimension | Enable when the diff contains | Reuses | Delegated agent |
|-----------|-------------------------------|--------|------------------------|
| Code (correctness / boundaries / regression / project rules) | always | `principles` | `correctness-reviewer` |
| Breaking change (API / schema / config / route / output shape / visible behavior) | always | — | `correctness-reviewer` |
| Security (injection / authz bypass / CORS / auth / trust boundary / front-back validation gap) | always | project `security.md` if present | `security-reviewer` |
| Secret leak (token / API key / private key / cookie / `.env` / config / log) | always | — | `security-reviewer` |
| Type design (invariant expression / `any` / nullable-vs-required confusion) | `.ts`/`.tsx` type or interface changes | `principles` | `type-design-reviewer` |
| Error handling (silent failure / swallowed error / unsafe fallback / wrong retry / unreturned error state) | try/catch, `.catch(`, fallback, retry, error-path changes | — | `error-handling-reviewer` |
| Test risk (missing coverage / wrong assertion / removed test / happy-path-only) | added/removed/changed test files | `testing` | `test-risk-reviewer` |
| Comment & doc consistency (comment / README / API doc / example contradicts code) | comment, README, or doc changes | — | `correctness-reviewer` |

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
- Whether the PR head is checked out locally: yes only when `git rev-parse HEAD`
  equals the PR's head commit SHA (`headRefOid`). A matching branch name is not
  enough — a stale local branch can show a guard the PR already removed.

If any context cannot be retrieved, note the gap explicitly in the output —
do not review as if the bundle were complete.

## Step 3 — Select Active Dimensions

All eight dimensions are always active and all five agents always run. The
**Enable when** triggers in the table above are only focus hints handed to each
agent, not a dispatch gate. Before reviewing, list the dimensions and the agents
being launched so the user sees the full coverage.

## Step 4 — Run the Review

Use the same output schema regardless of execution style. Apply the active
dimension checklists, but stay open to adjacent correctness, compatibility,
security, or reliability risks discovered while tracing the PR.

### Delegated Parallel Review (default)

Whenever the Task tool is available, delegate every dimension to this plugin's
five read-only specialist agents and run them all in parallel — every time. This
is the default and only execution path. Do not diff-gate the dispatch and do not
wait for the user to ask for `parallel` or `subagents`.

Dimension → agent (all five always launched):

- Code + Breaking change + Comment/doc consistency → `correctness-reviewer`
- Security + Secret leak → `security-reviewer`
- Error handling → `error-handling-reviewer`
- Type design → `type-design-reviewer`
- Test risk → `test-risk-reviewer`

Every agent emits the exact Step 8 schema plus a `Coverage:` block, so merging
delegated results is a straight concatenation + de-dup — no severity
translation, no external toolkit. An agent whose dimension is absent from the
diff returns no findings; that is expected and collapses to a one-line note in
Step 8, not a wasted section.

Launch steps — this is what makes the agents run concurrently:

1. Build the shared diff bundle once from Step 2: PR metadata, changed-file path
   list, and the relevant diff hunks.
2. In a SINGLE assistant message, issue one `Task` call per agent — all five
   above — each carrying the slice it owns. Multiple `Task` calls in one message
   run concurrently; do not send them one message at a time, and do not review
   any dimension inline in this context.
3. Wait for every agent to return, then run Steps 5–7.

Slice shape — decide before sending the Task calls:

- Small or focused PR: one slice per active dimension, routed to the matching
  agent above.
- Large PR: for `error-handling-reviewer`, `type-design-reviewer`, and
  `test-risk-reviewer`, one slice per file group (security-related files, tests,
  routes, data-access code, UI, generated/config files), routed to the agent
  that owns each group's dominant dimension. `correctness-reviewer` and
  `security-reviewer` always receive every changed file — split either into
  several instances if needed, but together they cover the full list.

Each delegated slice (Task prompt) must carry:

- the PR metadata and changed-file path list,
- an `Owned files:` list — the exact files this slice must cover,
- the relevant diff hunks,
- the dimensions or file group the slice owns,
- the checklist anchors below,
- the required finding schema (severity, `file:line`, problem, risk, fix),
- the instruction to end with a `Coverage:` block listing every owned file
  exactly once as `reviewed` or `skipped: <reason>`,
- the instruction to return findings only — no file edits, no test runs,
- the instruction that checklist anchors are not exhaustive; adjacent clear
  merge risks inside PR scope should still be reported.

### Review criteria (checklist anchors)

These anchors are the shared review criteria passed into each delegated slice
above (and applied directly in this context only if a host has no Task tool).

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

## Step 5 — Check Coverage

Treat the changed-file list from Step 2 as the coverage ledger.
`correctness-reviewer` and `security-reviewer` own every changed file:
correctness may skip only generated, vendored, or binary files, and security
only binary files (any text file can leak a secret). The other three may skip a
file that has nothing in their dimension.

Compare each agent's `Coverage:` block with its `Owned files:`:

- **Dropped** — an owned file the block does not list. An agent whose Task
  failed, timed out, or returned no block has dropped all of its owned files.
  That is a silent gap, not a clean result.
- **Invalid skip** — correctness or security skipped a file for a reason outside
  its allowed list above.

A file is covered when both correctness and security marked it `reviewed` or
skipped it for an allowed reason. Count allowed skips separately; they are not
gaps.

Run one coverage wave: in a SINGLE message, re-dispatch each dropped or invalidly
skipped file to the same agent, with only those files' hunks. A file still
uncovered after that wave is listed under `Coverage gaps` in Step 8 as
`path — agent — reason` — never cap silently.

## Step 6 — Merge Findings

Combine results from all five agents and the coverage wave:

- de-duplicate findings that point at the same `file:line`, and merge findings
  that share one root cause reached from several places — keep the most direct
  location and name the others in `Problem`,
- calibrate severity against the table in Step 8,
- ensure every finding has file and line number,
- drop pure style preferences,
- skip points already raised in existing PR comments (from Step 2).

## Step 7 — Verify Blocking/High Candidates

Finders do not verify their own findings. After merging, every `Blocking` and
`High` finding is a candidate, not a result:

1. In a SINGLE message, issue one `Task` call to `finding-verifier` per
   candidate. Each carries the one candidate and the reviewer that reported it,
   the same diff bundle, and whether the PR head is checked out locally — never
   other candidates or other verifiers' verdicts.
2. Apply each verdict:
   - `confirmed` → keep, with the verifier's corrected line. Severity is the
     lower of the reported one and the verifier's; a lowered finding notes
     `(reported <severity>)` after its `file:line`,
   - `needs_validation` → move to `Needs validation` with the named blockers,
   - `rejected` → drop it from the findings and list it in the verification
     footer with its refutation: the `Control`, or the `Evidence` line when
     `Control` is "none visible",
   - `input_error` → do not re-run; list the candidate under `Unverified` with
     the missing input as its reason. It means this context sent an incomplete
     bundle.
3. A malformed reply → re-run once with a fresh verifier; still malformed →
   list the candidate under `Unverified`. Malformed means: no verdict block, a
   verdict outside the four values, a severity above the reported one, a
   `Finding` path that differs from the candidate's file, a `rejected` verdict
   that cites no code `path:line`, `Blocker` present without
   `needs_validation` (or missing with it), or a Task error or timeout.

Verify at most 10 candidates, `Blocking` first. Any beyond that go under
`Unverified` with reason `cap` — never presented as confirmed.
`Medium`/`Low` findings are not verified; the footer says so.

## Step 8 — Output

Order strictly: `Blocking` → `High` → `Medium` → `Low` → `Needs validation` →
`Unverified` → `Coverage gaps`. Omit any empty section.

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

[Needs validation] src/routes/export.ts:17
Problem: The export route reads `req.query.path` into a filesystem read.
Blocker: Whether the reverse proxy strips `..` segments is outside the bundle — check the proxy's path normalization config.

[Unverified · reported High] src/jobs/sync.ts:55
Problem: The retry loop re-sends the webhook without an idempotency key.
Reason: malformed verifier reply twice.

Coverage: 14/14 changed files covered (13 reviewed, 1 skipped: binary; 1 re-dispatched)
Verification: 2 confirmed (1 lowered), 1 needs validation, 1 rejected (src/auth/session.ts:30 — token is verified by verifySession() at :12), 1 unverified (malformed); Medium/Low not verified
Clean: type-design, test-risk — no findings
```

`Needs validation` entries carry no severity. `Unverified` entries keep the
reported severity only as a label, never as a section, and always state their
reason (`cap`, `malformed`, or the missing input). Always end with the
`Coverage` and `Verification` lines, even when nothing is found. An agent goes
on the `Clean:` line only when it returned no findings **and** a complete
`Coverage:` block; an agent with gaps goes on an `Incomplete: <agent> — <reason>`
line instead.

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
- Delegated parallel review is the default and only path — it dispatches to this
  plugin's own five specialist agents (`correctness-reviewer`, `security-reviewer`,
  `error-handling-reviewer`, `type-design-reviewer`, `test-risk-reviewer`), all
  launched every time, no external toolkit required. A host without the Task tool
  degrades to applying the same checklist anchors inline — no keyword, no separate
  mode. Without Task there is no independent verifier: say `Verification: not
  run (no subagent support)` instead of presenting candidates as verified.
- A reviewer's empty findings only mean "clean" if its `Coverage:` block lists
  every owned file. Missing block or missing files → Step 5 gap, not clean.
- The verifier is a fresh context per candidate on purpose. Batching candidates
  into one verifier, or passing it the reviewer's reasoning beyond the finding
  itself, lets one conclusion anchor the next.
- A rejected candidate stays visible in the footer with its refutation, so the
  user can audit the drop.
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
