---
name: spec
description: 'Define the interface contract before writing any implementation code. This skill should be used when the TypeScript interface or function signature does not yet exist, the public API or return type is changing, or you cannot immediately name 3+ boundary cases without stopping to think. Output: behaviour description (Given/When/Then), TypeScript interface, invariants list. Do NOT use for internal refactoring or bug fixes where the public interface is unchanged.'
argument-hint: [feature description]
disable-model-invocation: true
allowed-tools: Read, Grep, Glob,
  Bash(git log:*), Bash(git diff:*), Bash(git show:*),
  Skill
---

# Spec — Interface Contract Definition

## Applicability Rubric (Spec Gate)

Answer all three questions before loading this skill:

| Question | YES → | NO → |
|----------|-------|------|
| Is this a bug fix or internal change that does not touch the public interface? | Skip spec, go to `/testing` | Continue |
| Does a TypeScript interface / function signature already exist for this? | Skip spec, go to `/testing` | Continue |
| Can you name 3+ boundary cases right now without thinking hard? | Skip spec, go to `/testing` | **Load spec** |

If you reach the end without skipping → run this skill before any implementation.

---

## Spec Output: Three Steps

### Step 1 — Behaviour Description

Write 1–3 sentences in natural language. This step uses BDD's Given/When/Then thinking structure as the backbone for describing behavior — not the Gherkin toolchain, just the reasoning pattern.

Follow this structure (no Gherkin syntax required, just the logic):

```
Given [the starting condition or context],
when  [the action or input],
then  [the expected outcome].
```

Rules:
- Use business language, not implementation language
- Cover the happy path and at least one failure case
- If you cannot write this without mentioning internal details (e.g. "calls the database"), the boundary is not clear yet — ask before proceeding

**Example:**
```
Given a list of transactions for a user,
when they request a monthly summary,
then return the total amount grouped by category,
  and return an empty summary if no transactions exist for that month.
```

---

### Step 2 — TypeScript Interface

Define all public boundaries. Do not write implementation — only shapes.

```typescript
// What goes in
interface MonthlyReportInput {
  userId: string
  year: number
  month: number  // 1–12
}

// What comes out
interface MonthlyReportResult {
  categories: CategorySummary[]
  totalAmount: number
  currency: string
}

interface CategorySummary {
  category: string
  amount: number
  transactionCount: number
}

// What can go wrong (explicit error types, not thrown exceptions)
type MonthlyReportError =
  | { type: 'USER_NOT_FOUND' }
  | { type: 'INVALID_MONTH'; month: number }
```

Rules:
- Prefer `interface` over `type` for object shapes
- Make error types explicit — do not rely on `throw` as the only contract
- `unknown` instead of `any` when the shape is genuinely unknown
- Do not include implementation details (no database types, no ORM models)

---

### Step 3 — Invariants List

List the constraints the implementation must always respect. These become the boundary test cases in TDD.

**The boundary cases you tried to name in Q3 of the Spec Gate belong here.** If Q3 felt hard, that difficulty was pointing you at the right invariants — write them down now. Each case you struggled to articulate is an invariant waiting to be made explicit.

Format each invariant as a verifiable statement:

```
✓ userId must be a non-empty string — reject empty string and whitespace-only
✓ month must be between 1 and 12 (inclusive) — reject 0 and 13
✓ Returns empty categories array (not null) when no transactions exist
✓ totalAmount equals the sum of all category amounts
✓ currency is always a 3-letter ISO code (e.g. "TWD", "USD")
⚠ AI constraint: do not infer currency from transaction data — caller must provide it
```

Legend:
- `✓` — must be true, will become a test case
- `⚠` — AI execution constraint — the implementation must not cross this boundary

Rules:
- Write at least 3 invariants (if you cannot, Q3 of the Spec Gate was YES — you did not need this skill)
- At least one invariant should cover the empty / null / zero case
- Mark invariants that are **AI execution constraints** with `⚠` — these are the non-negotiable boundaries AI must not reinterpret

---

## Connecting Spec to TDD

When spec is complete, the invariants map directly to your first set of failing tests:

| Invariant | Test name |
|-----------|-----------|
| Returns empty categories when no transactions | `it('returns empty summary when no transactions exist for the month')` |
| Month must be 1–12 | `it('returns INVALID_MONTH error when month is 0')` |
| totalAmount equals sum of categories | `it('totalAmount equals sum of all category amounts')` |

Hand off to `/testing`: the interface is the input to the TDD cycle.

---

## Common Mistakes

| Mistake | Why it's a problem | Fix |
|---------|--------------------|-----|
| Writing implementation details in the interface | Couples spec to implementation, defeats the purpose | Only describe shapes and contracts |
| Skipping the behaviour description | Interface without context is just types — loses the "why" | Always write step 1 first |
| Forgetting error cases in the interface | Errors become implicit throws, untestable contracts | Define error types explicitly |
| Writing invariants as "it should..." | Vague, not verifiable | Write as falsifiable statements |
| Using `any` in the interface | Escapes the contract, spec loses its value | Use `unknown` or define the shape |
| Spec written once then never updated | Stale spec misleads more than no spec — implementation drifts silently | When implementation deviates from spec, update the spec first before continuing. Spec Gate's self-restraint (skip for small changes) is the first defense against drift. |

---

## Reverse Path: Exploration → Spec

The default flow is spec → implementation. But AI excels at rapid prototyping — sometimes you need to explore first, then extract a spec.

This is valid when:
- Technology choice is uncertain (need a spike to verify feasibility)
- The problem shape only becomes clear through implementation

When using the reverse path:
1. Write exploratory code (no tests needed yet)
2. Once the shape is clear, **stop and run this skill** to extract the interface
3. Delete or rewrite the exploratory code, now following the spec → TDD flow

The Spec Gate already covers this: if the interface exists after exploration, Q2 is YES and you skip to `/testing`.

---

## Related Skills

- **principles** — if the interface design requires SOLID decisions (DI, interface segregation)
- **testing** — load after spec output is complete; invariants become the first Red tests
