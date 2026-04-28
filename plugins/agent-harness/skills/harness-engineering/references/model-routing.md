# Model Routing Table

Route each task to the cheapest model that meets the quality bar. Reserve Opus for work
that genuinely needs its reasoning depth; default to Sonnet; use Haiku only for mechanical
work where synthesis isn't required.

## Primary Routing Table

| Task type | Model | Why | Cost note |
|---|---|---|---|
| `plan` | Opus | Architectural decomposition, dependency reasoning, acceptance-criteria authoring | High; one Planner per sprint amortizes |
| `evaluate` | Opus or Sonnet | Verifying against acceptance criteria; Opus when judgment is non-trivial, Sonnet when checks are mechanical | Medium |
| `code` | Sonnet | Implementation, debugging, test writing | Medium |
| `write` | Sonnet | Long-form prose, documentation, structured reports | Medium |
| `research` | Sonnet | Synthesizing multiple sources, connecting concepts | Medium |
| `collect` | Haiku | Fetching data, format conversion, file discovery, simple transforms | ~15× cheaper than Sonnet |

## When to Override

- **Code → Opus**: novel architecture, security-sensitive logic, code that touches
  invariants you can't easily test
- **Evaluate → Opus**: acceptance criteria require domain judgment ("is this prose
  clear?" or "does this design respect the project's coding conventions?")
- **Research → Opus**: the research itself is the deliverable and synthesis quality
  determines downstream decisions

Always note the override reason in the plan so future-you (or another reviewer)
understands why the cost was justified.

## When NOT to Use Haiku

Haiku is fast and cheap but degrades on:

- Synthesis (combining multiple sources into a coherent view)
- Long-context recall (>50k tokens of input)
- Code generation beyond trivial transforms
- Judgment calls (use it for "fetch this URL and return JSON", not "decide which of these
  three approaches is best")

Use Haiku for: scraping, regex transforms, file enumeration, mechanical data extraction,
short translations, format conversions.

## Orchestrator Model

The orchestrator (the main session running this skill) is typically Opus when you need
1M context to hold the plan + all progress files + eval simultaneously. Sonnet works for
smaller orchestrations (≤7 tasks, ≤200k total context).

The orchestrator runs `agent-harness` itself; subagents inherit their role's model from
the routing table above.

## Cost Reasoning

A typical 5-task sprint with one retry cycle:

- 1× Opus Planner (initial) + 1× Opus Planner (retry plan) ≈ 2 Opus calls
- 5× Sonnet Generator (initial) + 1–2× Sonnet Generator (retries) ≈ 6–7 Sonnet calls
- 1× Sonnet Evaluator (initial) + 1× Sonnet Evaluator (retry) ≈ 2 Sonnet calls

If you swap one Generator from Sonnet to Haiku where appropriate (a `collect` task), you
save ~14× on that call. Across hundreds of sprints, this adds up. But never trade quality
for cost on judgment-heavy work — a wrong plan or a wrong eval costs more than every
Generator call combined.

## Runtime Override (`/sprint` Only)

The static table above is the recommended default. For users who don't have Opus access
(Pro/Team subscription, or an API key without Opus) or who want to lower cost on a
specific project, `/sprint` resolves the actual routing at runtime from a config file:

- `~/.claude/agent-harness.json` — user-level
- `./.claude/agent-harness.local.json` — project-level override

Set up via `/agent-harness:init` (interactive wizard). Schema and defaults are documented
at `${CLAUDE_PLUGIN_ROOT}/skills/sprint/references/config-schema.md`. Missing config falls
back to the table above (Opus planner, Sonnet generator/evaluator, Haiku collect).

Note: this override mechanism applies only to `/sprint`. The `/harness-engineering` skill
treats this table as advisory — it's a reference for designing harnesses, not a runtime
contract.
