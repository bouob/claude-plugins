# Planner-Generator-Evaluator Pattern (Anthropic 2026-04-04)

> **Source**: Anthropic Engineering, *Harness Design for Long-Running Agent Applications*
> (https://www.anthropic.com/engineering/harness-design-long-running-apps, 2026-04-04).
>
> P-G-E is a **design pattern**, not a Claude Code built-in feature. The harness is
> what you implement; the pattern is the shape it takes.

## Why P-G-E

A single agent doing planning + execution + verification in one window has three
documented failure modes:

1. **Self-Evaluation Weakness** — generators confidently praise mediocre work; tuning
   a standalone skeptical Evaluator is far more tractable than making a Generator
   self-critical (Anthropic, 2026-04-04)
2. **Context Anxiety** — models nearing context limits wrap work prematurely rather
   than completing tasks; observed pre-Opus-4.6
3. **No Parallelism** — sequential single-agent execution wastes wall-clock on
   independent sub-tasks

P-G-E separates concerns so each role has fresh context and a narrow remit.

## The Three Roles (Updated 2026-04-04)

### Planner

- **Input**: brief prompt (1–4 sentences)
- **Output**: detailed product specification — ambition-appropriate scope, high-level
  technical design, integration points
- **Critical constraint**: avoid granular implementation details. Specification errors
  cascade downstream — over-specification by Planner produces worse output than
  under-specification.
- **Output goes to**: Generator (full spec) and Evaluator (acceptance criteria)
- **Model**: Opus

### Generator

- **Input**: full spec from Planner + sprint contract
- **Output**: implemented features, git-versioned commits, `claude-progress.txt` with
  commit-by-commit progress, self-evaluation against the contract before handoff
- **Critical constraint**: works only on the assigned scope; never edits unrelated code;
  never commits to main or pushes (orchestrator owns git policy)
- **Sustained sessions observed**: 2+ hours of coherent build with Opus 4.6
- **Model**: Sonnet for code/write/research; Haiku for collect/transform

### Evaluator

- **Input**: full plan + sprint contract + actual artifacts (running app, files)
- **Output**: PASS/FAIL per criterion, specific actionable feedback
- **Method**: Playwright MCP to navigate running applications as end users; screenshots,
  user flows, API and DB state checks
- **Granularity**: example from Anthropic — 27 distinct criteria for a single sprint's
  level editor; failure messages like "Rectangle fill tool only places tiles at drag
  start/end points instead of filling region"
- **Critical constraint**: grade against the contract as written, not against personal
  preference; flag ambiguous criteria as a Planner issue, not as task failure
- **Why separate**: "tuning a standalone evaluator to be skeptical turns out to be far
  more tractable than making a generator critical of its own work" — Anthropic
- **Model**: Sonnet (default) or Opus (deep judgment cases)

## The Sprint Contract

The artifact bridging Generator and Evaluator. Negotiated **before** code generation:

```
sprint-contract.md
├── scope            # what is in / out of this sprint
├── deliverables[]   # files, endpoints, behaviors
└── criteria[]
      ├── id
      ├── description       # phrased for unambiguous grading
      ├── threshold         # number or boolean, not vibes
      └── verification      # how Evaluator checks this
            ├── method      # unit test | playwright | file-check | api-call
            └── steps[]     # exact commands or interactions
```

**Why pre-negotiation matters**: shared understanding of "done" before implementation
starts. Without it, Evaluator standards drift, Generator over-builds or under-builds,
and PASS/FAIL becomes negotiable.

## Context Reset vs Compaction

Anthropic observed two strategies for managing long sessions:

- **Compaction**: summarize earlier conversation in-place. Preserves continuity but
  retains some noise; works best on Opus 4.6+ which tolerates context pressure.
- **Context Reset**: clear the context window entirely; spin up a fresh agent;
  carry state via a structured handoff file. **This was the cure for Context Anxiety**
  observed on Sonnet 4.5, where agents wrapped work believing they approached limits.

P-G-E architecture is built on context reset by design — each agent starts cold,
reads the handoff artifacts, executes its narrow remit, writes its handoff, exits.

## Handoff Schema (Minimum)

```
sprint-plan.md           ← Planner writes
  ├── spec               # expanded from brief prompt
  ├── tasks[]
  │     ├── id, title, type, model
  │     ├── acceptance_criteria[]
  │     └── depends_on[]
  ├── parallel_batch[]
  └── sequential_tasks[]

sprint-contract.md       ← Planner writes (or co-authored with Evaluator stub)
  └── (see schema above)

claude-progress.txt      ← Generator appends commit-by-commit
sprint-progress/<id>.md  ← Generator writes one per task
  ├── task_id, status, summary
  ├── files_changed[]
  └── blocker (if BLOCKED)

sprint-eval.md           ← Evaluator writes
  ├── overall            # PASS | FAIL
  ├── per_criterion[]
  │     ├── id, status, evidence
  └── retry_tasks[]
```

(For the runnable schema used by `/sprint`, see `skills/sprint/references/handoff-schema.md`.)

## Iteration Loop

```
Planner → plan + contract
   │
   ▼
Generators → progress files (parallel where possible)
   │
   ▼
Evaluator (Playwright MCP) → eval
   │
   ├── PASS → done
   │
   └── FAIL → re-plan retry_tasks (cap at 3 iterations)
```

The cap matters. Without it, ambiguous criteria produce an infinite fail-retry loop.
When the cap hits, surface the blocker — do not silently lower the bar.

## Cost Reality (Anthropic's Retro Game Maker example)

| Approach | Time | Cost | Result |
|---|---|---|---|
| Solo agent | 20 min | $9 | Functional core, broken entity input |
| Full P-G-E harness | 6 hr | $200 | Full feature set, AI integration, polish |

20× cost for completeness. For exploratory or single-step work, solo is correct. For
production deliverables, harness wins on completion rate.

## When the Pattern Doesn't Fit

P-G-E is overkill for:

- Single-step tasks (one file edit, one query, one transform)
- Verification-IS-implementation tasks (e.g., "run this test suite")
- Exploratory work where the spec is being discovered as you go (Planner can't
  decompose what isn't yet defined)

For these, single agent with good tooling is faster and produces less noise. Use
P-G-E when: parallel execution helps, OR fresh-context evaluation matters, OR the
task genuinely doesn't fit one window.

## Criteria as Design Levers

Anthropic observed that explicit grading-criteria phrasing steers output character
more than expected. Examples:
- "the best designs are museum quality" → drove visual convergence
- "code must be production-ready" → suppressed scaffold-style placeholders

Phrasing is part of the contract. Treat criteria text as load-bearing prompt
engineering, not bureaucracy.

## Related Patterns (2026-04 industry context)

- **Logits Masking / Dynamic Tool Rationing**: harness uses MCP to dynamically expose
  only task-relevant tools, preventing attention fragmentation from oversized toolsets
- **Meta-Harness (Stanford)**: harness itself becomes the optimization target —
  experiments show Haiku with refined harness can outrank larger models on specific
  tasks, validating that harness is a transferable asset, not model-bound
- **EigentSearch-Q+ (2026-04)**: deep-research agent framework that externalizes
  intermediate reasoning into typed tool arguments, descended from Anthropic's
  think-tool design
