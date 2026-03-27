---
name: testing
description: 'Enforce TDD discipline with Shadow Run validation and AI-specific guardrails. Auto-loaded when writing tests, implementing features, or fixing bugs. Ensures tests are written before implementation, fail before passing (Shadow Run), and are never deleted or weakened by AI. Skip for pure refactoring with existing test coverage.'
user-invocable: false
---

# Testing Discipline

## When This Skill Applies

- Implementing a new feature
- Fixing a bug
- Changing existing behavior
- Writing or modifying tests

Skip for: pure refactoring with existing test coverage, documentation-only changes.

---

## Integration-First Philosophy

Test component collaboration before testing components in isolation.

- Write integration tests first — verify that parts work together correctly
- Only add unit tests for edge cases the integration tests cannot reach cost-effectively
- Code with no integration path is **dead code** — delete it or connect it

---

## TDD Cycle

Follow all three steps in order. Do not skip or merge steps.

**Red** — Write a failing test before any implementation.
- Confirm: "The test fails because [specific reason]."
- Do not write any production code yet.
- **Shadow Run:** run the test against the existing codebase before writing new code. It **must** fail. If it passes immediately, the test is invalid — it either tests existing behavior or contains no real assertion. Rewrite it.
- State explicitly: "Shadow Run: test fails with [error] because [method/feature] does not exist yet."
- In agentic workflows: a failing test is the clearest instruction you can give an AI — it defines exactly what "done" means and nothing more.

**Green** — Write the minimum code that makes the test pass.
- Confirm: "All tests pass."
- Resist the urge to clean up during this step.

**Refactor** — Improve the code without changing behavior.
- Confirm: "Tests still pass."
- Now apply naming, structure, and duplication fixes.

---

## AI Agent Guardrails

Violation of any red rule is a **hard stop** — revert and investigate.

| Signal | Level | Action |
|--------|:-----:|--------|
| AI deletes a failing test | RED | Hard stop. The test must pass, not disappear. |
| AI marks test as `skip` / `todo` / `pending` | RED | Hard stop. Same as deletion. |
| AI weakens an assertion (e.g., `toBeDefined()` replacing a specific value check) | RED | Hard stop. Assertion strength must not decrease. |
| AI writes tests after implementation | YELLOW | Test may confirm wrong behavior. Review required. |
| CI green but no test for new behavior | YELLOW | Missing test = Red step not completed. |

**The fundamental rule:** Tests constrain AI behavior. A passing test suite with fewer tests is worse than a failing test suite with more tests.

---

## Gotchas: Where Claude Gets It Wrong

**1. Mock everything by default**
Claude's natural tendency is to mock every dependency and write isolated unit tests. This misses real integration bugs. When testing a service with DB/API dependencies:
- Write at least one test that exercises two or more methods in sequence (e.g., register then authenticate)
- Test the actual collaboration between components, not just individual method return values
- Use test doubles for external boundaries only (network, third-party APIs), not for your own modules

**2. Tests mirror implementation instead of requirements**
When Claude reads your function's if-else chain and writes tests that replicate the same logic in `expect()` calls, those tests only verify "code does what code does." Write tests from the spec/requirements perspective: what should the user experience? What are the boundary cases from a business rule standpoint?

**3. Skipping Red failure confirmation**
Claude often writes the test and implementation together in one block. The test never actually ran in a failing state, so you can't be sure it tests the right thing. Always confirm the Red step explicitly.

---

## Completion Rubric

| Check | Pass Condition |
|-------|---------------|
| TDD order followed | Failing test written before production code |
| Shadow Run confirmed | New test verified to fail against existing codebase |
| No deleted or skipped tests | Test count did not decrease; no new skip/todo |
| Assertion strength maintained | No assertion weakened compared to prior version |
| At least one collaboration test | Service-level tests exercise component interaction |
| No mirror tests | Tests derived from spec/requirements, not from reading the implementation |
