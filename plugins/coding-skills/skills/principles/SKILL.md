---
name: principles
description: 'Enforce project-specific coding constraints that Claude does not apply by default: function length limits (50 TS / 60 Python), dependency injection over concretions, and structured data class selection. Auto-loaded by /write, /fix, /review, /refactor when designing interfaces or checking architecture. Do NOT use for refactoring (use /refactor) or bug fixes (use /fix).'
user-invocable: false
---

# Coding Principles

## When This Skill Applies

- Designing a new feature or module
- Making architecture decisions
- Defining interface / API boundaries
- Choosing dependency direction

Skip for: refactoring (use /refactor), bug fixes (use /fix), pure implementation.

---

## SOLID Quick Reference

Claude applies SOLID naturally — this checklist highlights the violation signs to actively scan for during design and review:

| Violation Sign | Principle |
|----------------|-----------|
| Class with 2+ unrelated reasons to change | SRP |
| Adding a feature requires editing an existing class | OCP |
| `instanceof` guards spreading across call sites | LSP |
| Interface with methods the implementor leaves empty or throws | ISP |
| `new Dependency()` inside a service instead of constructor injection | DIP |

If none of these appear, SOLID is satisfied — move on.

---

## Function Length Limits

These are project-specific limits Claude does not enforce by default.

- TypeScript: **max 50 lines** per function body (excluding tests)
- Python: **max 60 lines** (orchestration functions up to 100 when decomposition obscures sequential logic)

When a function approaches the limit, extract helpers for distinct responsibilities.

---

## Dependency Direction

```
Pages/Routes → Layouts → Components/Islands → Lib/Utils → External APIs
```

No reverse dependencies. No cross-subsystem imports.

Depend on abstractions, not concretions — inject interfaces via constructor, not `new DatabaseClient()` inside services.

---

## Gotchas: Where Claude Gets It Wrong

These are patterns Claude tends to produce incorrectly without guidance.

**1. Structured data classes vs plain dicts (Python)**
Claude defaults to plain dicts everywhere. Use `@dataclass` for internal models with stable shape, `pydantic.BaseModel` at trust boundaries (API inputs, config), plain dicts only for dynamic/runtime-extensible structures.

**2. Speculative generality**
Claude tends to add "just in case" abstractions, extra config options, and hypothetical extension points. Design for current requirements only. Three similar lines of code > one premature helper.

**3. Barrel exports**
Claude creates `index.ts` files that re-export everything. Forbidden — creates implicit coupling. Import directly from source modules.

---

## Completion Rubric

| Check | Pass Condition |
|-------|---------------|
| Function body within limit | 50 lines (TS) / 60 lines (Python) |
| Dependencies injected | No `new Dependency()` inside service constructors |
| No speculative abstractions | Only code needed for current requirements |
