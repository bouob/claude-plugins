# Subagent Decision Tree

When a task arrives, decide between three execution shapes: inline, single subagent, or
parallel via Agent Teams. The choice shapes context budget, wall-clock time, and
recoverability.

## Decision Tree

```
Is the task <10k tokens of work AND its result is needed for the very next step?
  ├── YES → Inline (do it yourself in main session)
  └── NO  → continue
        │
        Are there 2+ independent tasks that could run simultaneously?
          ├── NO  → Single subagent
          └── YES → continue
                │
                Is CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 set?
                  ├── YES → Agent Teams (parallel teammates)
                  └── NO  → Sequential subagents (note the fallback in output)
```

## Inline

**Use when**: the work is small AND you need the result immediately.

**Example**: "Read the package.json to find the build script" — embed in current context,
no subagent needed.

**Cost**: zero subagent overhead, but the work consumes main-session context. After many
inline operations, main session bloats and quality drops.

## Single Subagent

**Use when**: any of —
- Result not needed immediately (you can do other work while waiting)
- Task would consume >10k tokens of main context (isolate it)
- Task involves bulk file reads or large search (preserve main context budget)
- You want a fresh evaluation perspective (e.g., spawn a code-reviewer)

**Example**: "Search the entire codebase for all uses of `legacyAuth`" — spawn an
Explore subagent, get back a summary, main context stays clean.

**Cost**: subagent spinup time (a few seconds) + its own token consumption. Net
beneficial for any non-trivial isolation.

## Agent Teams (Parallel)

**Use when**: 2+ tasks have no dependency on each other AND Agent Teams is enabled.

**Verify availability** before claiming parallel:
```bash
echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
```
- Non-empty output → Agent Teams available, spawn teammates in a single message
- Empty output → fall back to sequential subagents, note it in output:
  "Agent Teams not available — running tasks sequentially."

**Spawning rule**: all parallel teammates must be spawned in a single assistant message
with multiple Agent tool-use blocks. Spawning them across separate messages serializes
them — defeats the parallelism.

**Example**: 3 independent code-generation tasks (TASK-001, TASK-002, TASK-003 in the
parallel_batch) → one assistant turn with three Agent tool calls.

## Cold-Start Context

Every subagent (single or teammate) starts cold. They see:

- The exact prompt you give them — nothing else
- No conversation history, no skill context, no memory of prior turns

**Implication**: every subagent prompt must embed
- Task description
- Acceptance criteria
- All handoff data needed (file content, not file paths)
- The schema for their output

Passing a file path and saying "read this" works only if the path exists in the agent's
filesystem — and even then, requires them to know what to look for. Embedding content
directly in the prompt is more reliable.

For very large handoff data, write it to a file the subagent can Read, AND tell them in
the prompt exactly what file to read and what to extract.

## When NOT to Spawn a Subagent

- Task requires multiple round trips with the user (subagents can't ask questions back)
- Task requires the same context the main session has (just-do-it inline)
- Task is genuinely sequential and the result drives the very next decision (subagent
  spinup overhead > work duration)

## Recoverability

Subagent failures don't poison the main session. If a subagent returns BLOCKED or
errors, the orchestrator can:

- Re-spawn with a refined prompt
- Mark the task BLOCKED in the plan and skip it
- Re-route to a different model (e.g., Haiku failed → retry with Sonnet)

Inline failures, by contrast, contaminate main context with the failed reasoning. Prefer
subagents for any work that has a non-trivial chance of failure.
