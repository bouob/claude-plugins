---
name: principles
description: 'Apply coding principles for TypeScript, React, and Python. This skill should be used when designing new features, making architecture decisions, defining interface boundaries, choosing dependency direction, or asking about naming conventions, import order, function length limits, or SOLID principles. Do NOT use for refactoring existing code (use /refactor) or bug fixes (use /fix).'
user-invocable: false
---

# Coding Principles

## Applicability Rubric

| Scenario | Apply? |
|----------|--------|
| Designing a new feature or module | ✅ Pass |
| Making architecture decisions | ✅ Pass |
| Defining interface / API boundaries | ✅ Pass |
| Choosing dependency direction | ✅ Pass |
| Refactoring existing code | ❌ Fail → use /refactor |
| Fixing a bug | ❌ Fail → use /fix |
| Pure implementation detail | ❌ Fail — just write it |

## Related Skills

- **testing** — when the design requires a testability strategy
- **/review** — when applying these principles to existing code
- **/fix** — when a principle violation caused a bug

---

## SOLID (TypeScript)

| Principle | Rule | Violation Sign |
|-----------|------|----------------|
| **S** — Single Responsibility | One class / module = one reason to change | A class that handles data fetching AND formatting AND rendering |
| **O** — Open/Closed | Extend behavior without modifying core | Adding a new feature requires editing an existing class |
| **L** — Liskov Substitution | Subtypes must be substitutable for their parent | `instanceof` type-narrowing guards spread throughout call sites |
| **I** — Interface Segregation | Clients only depend on what they use | An interface with methods the implementor leaves empty or throws |
| **D** — Dependency Inversion | Depend on abstractions, not concretions | `new DatabaseClient()` inside a service instead of constructor injection |

---

## YAGNI / DRY / KISS

**Rule of Three** — duplicate code twice; abstract only on the third occurrence.

| Anti-pattern | Rule |
|--------------|------|
| Barrel exports (`index.ts` re-exporting everything) | Forbidden — creates implicit coupling |
| Magic numbers | Forbidden — extract to a named constant |
| `any` type | Forbidden — use `unknown` if type is uncertain |
| Premature abstraction | Forbidden — three similar lines > one premature helper |
| Speculative generality | Forbidden — design for current requirements only |

---

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| TS variables / functions | camelCase | `fetchUsers`, `isLoading` |
| TS components / types / classes | PascalCase | `ProductCard`, `UserProfile` |
| TS constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Python functions / variables | snake_case | `get_user_status`, `retry_count` |
| Python classes | PascalCase | `Product`, `OrderRecord` |
| Environment variables | SCREAMING_SNAKE_CASE | `DATABASE_URL`, `API_KEY` |
| DB tables | snake_case with prefix | `app_user_sessions` |

---

## TypeScript Standards

- `strict: true` — no exceptions
- Prefer `interface` over `type` for object shapes
- Explicit return types on all exported functions
- Max function body: **50 lines** (excluding tests)
- No `any` — use `unknown` when type is uncertain
- No barrel exports (`index.ts` re-exporting everything)

**Import order:**
1. Framework (`astro`, `react`)
2. External libraries
3. Internal absolute (`@/lib`, `@/components`)
4. Relative imports (`./foo`, `../bar`)
5. Type-only (`import type { ... }`)

---

## React Standards

- Function components + Hooks only — no class components
- ES Modules only (`import`/`export`) — no CommonJS (`require`/`module.exports`)
- No `var` — use `const`/`let`
- Co-locate component state as close as possible to where it's used
- Lift state only when siblings genuinely need to share it

---

## Python Standards

- PEP 8 + type hints on all function signatures for new code. For legacy codebases, prioritize adding type hints to public API boundaries; do not require retroactive annotation of all existing functions.
- Max function body: **60 lines** (excluding tests). Orchestration functions (multi-step workflows, state machines) may justify up to 100 lines when decomposition would obscure sequential logic.
- Google-style docstrings for public API functions. Internal helpers with self-explanatory names and signatures may omit docstrings.
- Structured data classes instead of plain dicts — when the shape is known at development time and stable. Use `@dataclass` (stdlib, zero dependency) for internal models, `pydantic.BaseModel` at trust boundaries requiring validation (API inputs, config files), or `attrs`/`msgspec` when advanced features or high throughput are needed. Plain dicts remain appropriate for dynamic config (JSON-loaded settings, migration-heavy schemas, runtime-extensible structures).

**Import order:**
1. stdlib (`os`, `sys`, `datetime`)
2. Third-party (`requests`, `httpx`, `pydantic`)
3. Local / relative (`.models`, `..utils`)

---

## Completion Rubric

| Check | Pass Condition |
|-------|---------------|
| Single Responsibility | Each module/class has exactly one reason to change |
| No magic numbers | All constants are named |
| No `any` | `unknown` used where type is uncertain |
| Naming follows convention table | camelCase / PascalCase / snake_case applied correctly |
| No barrel exports | `index.ts` does not re-export everything |
| Function body within limit | ≤ 50 lines (TS) / ≤ 60 lines (Python, up to 100 for orchestration) |
| Import order correct | Framework → external → internal → relative → type-only |
| React: no class components | Only function components |
| Python: type hints present | New code and public API boundaries annotated |
| Dependencies injected | No `new Dependency()` inside service constructors |
