---
name: diagnose
description: 'Systematic diagnosis workflow — find root cause before proposing any fix. This skill should be used when encountering bugs, crashes, errors, test failures, unexpected behavior, build failures, stack traces, or performance problems. Do NOT skip to fixes before completing Phase 1.'
argument-hint: [error | symptom]
disable-model-invocation: true
allowed-tools: Read, Edit, Grep, Glob,
  Bash(git log:*), Bash(git diff:*), Bash(git show:*),
  Bash(npm test:*), Bash(npm run test:*), Bash(npx vitest:*),
  Skill
---

# Systematic Debugging

**Core principle:** Find root cause before attempting any fix. Symptom fixes are failure.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## Related Skills

- **testing** — write a failing test before implementing the fix (Phase 4)
- **/fix** — full TDD bug fix workflow after root cause is confirmed

---

## Phase 1: Root Cause Investigation

**Complete ALL steps before moving on.**

1. **Read error messages carefully** — stack traces, line numbers, error codes
2. **Reproduce consistently** — can you trigger it reliably? If not, gather more data
3. **Check recent changes** — `git log`, `git diff`, new dependencies, config changes
4. **Trace data flow** — where does the bad value originate? Trace backward up the call stack
5. **Add diagnostics for multi-component systems** — log input/output at each boundary, run once to see WHERE it breaks before touching anything

## Phase 2: Pattern Analysis

1. Find working examples of similar code in the same codebase
2. Compare working vs broken — list every difference, however small
3. Understand dependencies and assumptions the broken code makes

## Phase 3: Hypothesis and Testing

1. State one hypothesis: "I think X is the root cause because Y"
2. Make the SMALLEST possible change to test it — one variable at a time
3. If it works → Phase 4. If not → form a NEW hypothesis. Do NOT stack fixes

## Phase 4: Fix

1. Write a failing test that reproduces the root cause (use **testing** skill)
2. Implement ONE fix addressing the root cause
3. Verify: test passes, no regressions

**If 3+ fixes have failed:** Stop. The architecture may be the problem — discuss before attempting more fixes.

---

## Red Flags — Return to Phase 1

| Thought | Reality |
|---------|---------|
| "Quick fix for now, investigate later" | Patches mask root causes |
| "Just try X and see if it works" | Guessing wastes time |
| "I don't fully understand but this might work" | Incomplete understanding guarantees new bugs |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem |
| Proposing solutions before tracing data flow | Phase 1 is not done |
