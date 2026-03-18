---
name: testing
description: 'Apply TDD and integration-first testing philosophy. This skill should be used when implementing new features, fixing bugs, changing behavior, writing tests, or when asking about test structure, test smells, or which test type to use. Skip for pure refactoring with existing test coverage.'
user-invocable: false
---

# Testing Philosophy

## Applicability Rubric

| Scenario | Apply? |
|----------|--------|
| Implementing a new feature | ✅ Pass |
| Fixing a bug | ✅ Pass |
| Changing existing behavior | ✅ Pass |
| Pure refactoring with existing tests | ❌ Fail — tests already cover it |
| Updating documentation only | ❌ Fail — not applicable |

## Related Skills

- **spec** — when no TypeScript interface exists yet; spec output becomes the first Red tests
- **principles** — when testability depends on design decisions (DI, interface segregation)
- **/fix** — when a bug needs a failing test before the fix
- **/review** — when checking test quality of existing code

---

## Integration-First Philosophy

Test component collaboration before testing components in isolation.

- Write integration tests first — verify that parts work together correctly
- Only add unit tests for edge cases the integration tests cannot reach cost-effectively
- Code with no integration path is **dead code** — delete it or connect it

Confidence hierarchy (high to low):

| Test Type | What it verifies |
|-----------|-----------------|
| Integration | Components cooperate; the system does the right thing end-to-end |
| Unit | A pure function returns correct output for given inputs |
| E2E | The deployed system works for a real user action |

---

## TDD Cycle

Follow all three steps in order. Do not skip or merge steps.

**Red** — Write a failing test before any implementation.
- Confirm: "The test fails because [specific reason]."
- Do not write any production code yet.
- **Shadow Run:** run the test against the existing codebase before writing new code. It **must** fail. If it passes immediately, the test is invalid — it either tests existing behavior or contains no real assertion. Rewrite it.
- In agentic workflows: a failing test is the clearest instruction you can give an AI — it defines exactly what "done" means and nothing more.

**Green** — Write the minimum code that makes the test pass.
- Confirm: "All tests pass."
- Resist the urge to clean up during this step.

**Refactor** — Improve the code without changing behavior.
- Confirm: "Tests still pass."
- Now apply naming, structure, and duplication fixes.

---

## AI Agent Guardrails

These rules apply whenever AI is writing or modifying code. Violation of any rule is a hard stop — revert and restart.

| Signal | Risk Level | Action |
|--------|-----------|--------|
| AI proposes deleting a failing test | 🔴 Critical | Hard stop. Revert. The test must pass, not disappear. |
| AI proposes `skip`, `todo`, or `pending` on a test to pass CI | 🔴 Critical | Hard stop. Same as deletion. |
| AI weakens an assertion (e.g. `expect(result).toBeDefined()` replacing a specific value check) | 🔴 High | Hard stop. The assertion strength must not decrease. |
| AI writes tests *after* writing implementation | 🟡 Caution | Test may confirm the wrong behaviour. Human review required before trusting results. |
| CI is green but no test was written for the new behaviour | 🟡 Caution | Missing test, not a passing test. Treat as Red step not completed. |
| AI-written test is a mirror of the implementation (same logic, just wrapped in `expect()`) | 🟡 Caution | Mirror test only verifies "code does what code does", not what it *should* do. Rewrite test based on spec/requirements, not implementation. |

**The fundamental rule:** Tests constrain AI behaviour. A passing test suite with fewer tests is worse than a failing test suite with more tests.

---

## Test Type Selection

| Situation | Recommended Type | Rationale |
|-----------|-----------------|-----------|
| Pure function, business logic | Unit | Fast, deterministic, easy to parameterize |
| Database operation | Integration | Tests real query behavior and schema constraints |
| API endpoint | Integration | Tests routing, middleware, and response shape |
| Service-to-service interaction | Integration | Tests contracts between layers |
| Critical user journey | E2E | Validates the whole deployed stack |
| UI component rendering | Unit (component test) | Fast feedback on visual structure |

---

## Property-Based Testing

Example-based tests verify specific inputs → outputs. Property-based tests verify **invariants hold for all inputs**.

AI-generated code is especially prone to passing hand-picked examples while failing on edge cases. Property tests catch this.

**When to use:**

| Situation | Example Property |
|-----------|-----------------|
| Pure function / data transformation | `sort(xs).length === xs.length` |
| Mathematical / financial calculation | `total === sum of all line items` |
| Encoding / decoding round-trip | `decode(encode(x)) === x` |
| Invariant from `/spec` marked `✓` | Any invariant expressible as `for all x: P(x)` |

**When NOT to use:** UI rendering, side-effectful code, integration boundaries.

**Tools:** `fast-check` (TypeScript), `Hypothesis` (Python), `QuickCheck` (Haskell-family)

```typescript
import fc from 'fast-check'

it('sort preserves array length', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (xs) => {
      expect(sort(xs)).toHaveLength(xs.length)
    })
  )
})
```

Property tests complement example-based TDD — they do not replace it. Use both.

---

## AAA Pattern

Every test follows **Arrange → Act → Assert**.

```typescript
it('returns an empty array when no users exist', async () => {
  // Arrange
  const repo = new UserRepository(testDb)
  await testDb.clear()

  // Act
  const result = await repo.findAll()

  // Assert
  expect(result).toEqual([])
})
```

One assertion per test where possible. Multiple assertions are acceptable when they verify a single logical outcome.

---

## Boundary Testing

Test your own code's behavior at integration boundaries — not the third-party library's internal logic.

| Boundary | Test This | Not This |
|----------|-----------|----------|
| ORM / DB | Repository returns correct business objects | SQL query text generated by ORM |
| HTTP client | Service handles 200 / 404 / 500 responses correctly | Request headers or URL format |
| Auth middleware | Protected routes reject unauthenticated requests | JWT algorithm details |
| External API | Your adapter maps the response to your domain model | External API's internal behavior |

---

## Common Test Smells

| Smell | Description | Fix |
|-------|-------------|-----|
| **Flaky** | Passes sometimes, fails sometimes | Remove timing/order dependency; use deterministic data |
| **Slow** | Takes > 1s per test | Replace real I/O with fakes; check for unnecessary network calls |
| **Brittle** | Breaks on unrelated changes | Test behavior, not implementation details |
| **Mystery Guest** | Relies on external state not visible in the test | Bring setup into the test (Arrange step) |
| **Dead Code Testing** | Tests internal private methods | Test through public API only |
| **Assertion Roulette** | Multiple unrelated asserts with no description | Split into separate named tests |
| **Giant Test** | One test covers many unrelated scenarios | One test = one behavior |

---

## Completion Rubric

| Check | Pass Condition |
|-------|---------------|
| Test naming | `it('does X when Y')` format — reads as a sentence |
| Single logical assertion | Each test verifies one outcome |
| Test independence | Tests pass in any execution order |
| Deterministic | No random data, no time-dependent logic without mocking |
| AAA structure present | Arrange / Act / Assert sections are clear |
| No implementation detail testing | Tests use the public API, not private internals |
| TDD order followed | Failing test written before production code |
| Integration path exists | No code is tested only in isolation with no real usage path |
| No deleted or skipped tests | Test count did not decrease; no new `skip`/`todo` added |
| No mirror tests | Tests are derived from spec/requirements, not from reading the implementation |
| Property tests for invariants (when applicable) | Pure functions and spec `✓` invariants expressible as `for all x: P(x)` have property tests |
| AI-generated code security check | If AI wrote significant code: reviewed for null guards, input validation, no hardcoded secrets |
