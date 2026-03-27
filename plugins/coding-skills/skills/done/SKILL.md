---
name: done
description: 'Verification gate before claiming work is complete, fixed, or passing. Evidence before claims — run lint + test + build before any completion statement. Auto-loaded by /write, /fix, /refactor at completion step.'
user-invocable: false
---

# Verification Before Completion

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have not run the verification command in this message, you cannot claim it passes.

## The Gate

1. **IDENTIFY** — what command proves this claim?
2. **RUN** — execute it fresh (not from memory or earlier in session)
3. **READ** — check exit code and count failures
4. **VERIFY** — does output confirm the claim? If NO, state actual status with evidence.

Find verification commands in: `package.json` scripts, `Makefile`, `pyproject.toml`, CI config, or README.

Run the **full** chain (lint + test + build), not just one step.

## Red Flags — Stop and Verify

- Using "should", "probably", "seems to" about pass/fail status
- Saying "Done!" before running anything
- Relying on a previous run from earlier in the session
