---
name: done
description: 'Verification gate before claiming work is complete, fixed, or passing. This skill should be used before committing, creating PRs, moving to next task, or when asking "is this done?", "are tests passing?", "ready to commit?". Evidence before claims — always run verification commands first.'
user-invocable: false
---

# Verification Before Completion

**Core principle:** Evidence before claims, always.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## Related Skills

- **debug** — if verification fails, use this to find root cause before fixing

This skill is loaded as a gate by **/fix**, **/write**, and **/refactor**. It does not need to be invoked directly when using those workflows.

---

## The Gate

Before claiming any status or expressing satisfaction:

1. **IDENTIFY** — what command proves this claim?
2. **RUN** — execute the full command (fresh, not from memory)
3. **READ** — full output, check exit code, count failures
4. **VERIFY** — does output confirm the claim?
   - NO → state actual status with evidence
   - YES → state claim WITH evidence
5. **ONLY THEN** — make the claim

## Common Verification Requirements

| Claim | Required Evidence |
|-------|-----------------|
| Tests pass | Test command output: 0 failures |
| Linter clean | Linter output: 0 errors/warnings |
| Build succeeds | Build command: exit 0 |
| Bug fixed | Original symptom verified as resolved |
| Feature complete | Each requirement checked line-by-line |

## Red Flags — Stop and Verify

- Using "should", "probably", "seems to"
- Saying "Done!", "Complete!", "Fixed!" before running anything
- About to commit or push without verification
- Relying on a previous run from earlier in the session
- "Partial check is enough"

## Finding Verification Commands

Identify the project's test, lint, and build commands from:
- `package.json` → `scripts` section (`test`, `lint`, `build`)
- `Makefile` or `pyproject.toml` → test/lint targets
- CI config (`.github/workflows/`) → the commands CI runs
- README → quick start or development section

Run the **full** verification chain available in the project (lint + test + build where applicable), not just one step.
