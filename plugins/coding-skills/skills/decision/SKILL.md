---
name: decision
description: 'AI-era technology decision framework for tech selection, architecture choices, and build-vs-buy analysis. This skill should be used when comparing frameworks, services, tools, or libraries, evaluating architecture approaches (monorepo vs multi-repo, SSR vs SSG), deciding build vs buy, or assessing whether to upgrade or stay. Trigger phrases: "which should I use", "A vs B", "should I switch to", "build or buy", "upgrade or stay", "compare X and Y", "what is the best option for". Do NOT use for pure implementation tasks where the technology choice is already made.'
argument-hint: [A vs B | technology choice]
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(npm info:*), Bash(pip show:*), WebSearch, WebFetch
---

# Decision — AI-Era Technology Decision Framework

## Core Premise

AI (Claude Opus, etc.) has solved most of the difficulty in writing code. **"Can we build it?"** and **"Is it hard?"** are no longer the primary factors in technology selection.

**The real cost comes later**: maintenance, migration, security patches, rewrites after a technology dies. Decisions should optimize for **lowest long-term total cost**.

## Applicability Rubric

| Scenario | Apply? |
|----------|--------|
| Choosing a framework, service, tool, or library | Yes |
| Architecture approach comparison (monorepo vs multi-repo, SSR vs SSG...) | Yes |
| Evaluating whether to introduce a new dependency | Yes |
| Third-party service selection (SaaS, PaaS, API provider) | Yes |
| Build vs buy decisions | Yes |
| Upgrade vs stay on current version | Yes |
| Technology already decided, just implementing | No — just build |
| Bug fix | No — use /debug |
| Code-level design (interface, pattern) | No — use /principles or /spec |

## Related Skills

- **/principles** — code-level design principles (SOLID, dependency direction)
- **/spec** — define interface contracts
- **/review** — review written code

---

## Decision Process

### Step 1 — List Options

List all candidate approaches. One sentence each.

### Step 2 — Assumption Audit

Before evaluating, explicitly list all implicit assumptions:

```
Assumptions:
1. [assumption] — evidence: [what supports this] | risk: [what if wrong]
2. [assumption] — evidence: [what supports this] | risk: [what if wrong]
...
```

Challenge each assumption: Is it based on data or gut feeling? When was it last verified?

### Step 3 — Four-Dimension Scoring

Evaluate each option across four dimensions:

| Dimension | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| Tech debt | ? | ? | ? |
| Extensibility | ? | ? | ? |
| Security | ? | ? | ? |
| Survival risk | ? | ? | ? |

Score: `Low` / `Medium` / `High` risk. Add/remove option columns as needed. For Dimension 4 (Survival Risk), map tiers: open standards through community OSS = Low, mature commercial = Medium, startup through abandoned = High.

**Scoring criteria for each dimension follow below.**

---

#### Dimension 1: Long-term Tech Debt

> Will this choice become a burden in 6 months?

| Factor | Low | Medium | High |
|--------|-----|--------|------|
| API stability | Strict semver, migration guides | Occasional breaking changes with workarounds | Frequent breaking changes, no migration path |
| Abstraction leakage | Clean boundaries, swappable | Some coupling, replaceable with effort | Deep coupling throughout the project |
| Upgrade path | Incremental (codemod, compat layer) | Major version requires partial rewrite | Full rewrite needed |
| Community maintenance | Active PRs/issues, regular releases | Slower cadence but still maintained | Last release > 6 months ago |

#### Dimension 2: Extensibility

> Can it naturally extend when requirements change? Or does it require a rewrite?

| Factor | Low | Medium | High |
|--------|-----|--------|------|
| Plugin / extension mechanism | Official plugin API or middleware | Community plugins, some gaps | Monolithic, must fork to change behavior |
| Composability | Works with other tools freely | Some integration friction | Requires full ecosystem buy-in |
| Data portability | Standard formats (JSON, SQL, OpenAPI) | Export available but limited | Proprietary format, export restricted |
| Scale adaptation | Works from small to large | Works at current scale, uncertain beyond | Only fits a specific scale |

#### Dimension 3: Security

> Does this introduce unnecessary attack surface?

| Factor | Low | Medium | High |
|--------|-----|--------|------|
| Dependency count | Few (< 10 direct deps) | Moderate (10-30 direct deps) | Many (huge dependency tree) |
| Known vulnerabilities | `npm audit` / `pip audit` clean | Minor/moderate issues, fixable | Unpatched critical/high CVEs |
| Permission scope | Minimal (only needed scopes) | Some extra permissions required | Demands admin/broad access |
| Data flow transparency | Clear where data goes | Some telemetry, documented | Opaque tracking/telemetry |

#### Dimension 4: Technology Survival Risk

> If this technology/company disappeared tomorrow, what's the migration cost?

| Tier | Survival Risk | Examples |
|------|--------------|---------|
| **Open standards** | Lowest | HTML, CSS, SQL, HTTP, WebSocket |
| **Big-corp-backed open source** | Low | React (Meta), TypeScript (Microsoft), Go (Google) |
| **Mature community-driven open source** | Medium-low | Astro, Tailwind CSS, PostgreSQL, Linux |
| **Mature commercial services** | Medium | Stripe, AWS, Cloudflare, GitHub |
| **Startup services** | High | Pre-Series B, < 3 years old, single product |
| **Personal/abandoned projects** | Highest | Last commit > 1 year, maintainer vanished |

**Startup service extra checklist:**

```
[ ] Company older than 3 years?
[ ] Profitable or Series B+ funding?
[ ] Viable alternatives exist? (acceptable migration cost?)
[ ] Core functionality replaceable with open-source self-hosted?
[ ] Data export straightforward? (no lock-in?)
```

If 3+ items are "No" — mark as high risk, must include an exit plan.

### Step 4 — Pre-Mortem

> Assume this decision has failed spectacularly in 6 months. What went wrong?

Focus on the top 2-3 contenders:

1. **List the top 3 failure modes** — what specific scenarios would make you regret this choice?
2. **Assign likelihood** — likely / possible / unlikely
3. **Assess blast radius** — if it fails, is it a minor inconvenience or a full rewrite?

Format:

```
Pre-Mortem for [Option X]:
1. [failure mode] — likelihood: [likely/possible/unlikely] | blast radius: [minor/major/critical]
2. [failure mode] — likelihood: [likely/possible/unlikely] | blast radius: [minor/major/critical]
3. [failure mode] — likelihood: [likely/possible/unlikely] | blast radius: [minor/major/critical]
```

### Step 5 — Recommendation

Based on **lowest long-term total cost**, give a recommendation:

```
Recommendation: Option X
Reason: [one sentence]
Biggest risk: [the single largest risk]
Exit plan: [what to do if migration is needed]
Migration cost: [hours / days / weeks / full rewrite]
```

---

## Common Pitfalls

| Pitfall | Correct Thinking |
|---------|-----------------|
| "This one is easier" | AI makes implementation difficulty roughly equal — difficulty should not be a deciding factor |
| "Use this for now, switch later" | Calculate the real cost of "switching later" — usually 3-5x higher than estimated |
| "Everyone uses it" | Popularity != stability — check actual maintenance status |
| "It's free" | What's the business model of the free service? Are you the product or the customer? |
| "Most features" | More features = larger attack surface + more deps + harder upgrades — only pick what you need |
| "It's the newest" | New != good — check if it's stable (v1.0+ / GA / production-ready) |
| "AI recommended it" | AI training data has a recency bias — verify current status, not just what was popular during training |
