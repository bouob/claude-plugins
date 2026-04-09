# Sustainability in IT Service Management — ITIL v5

> **Applies to: Change Enablement, Service Design, Capacity Management**

ITIL v5 integrates sustainability throughout the framework — it is not an optional add-on but a dimension of responsible service management. This reference focuses on where sustainability considerations enter operational workflows.

---

## ITIL v5 Sustainability Definition

> Sustainability in ITIL v5 means managing digital products and services so that their environmental, social, and economic impacts support long-term organizational and societal health — not just short-term operational efficiency.

In practice, this means evaluating the environmental cost of IT decisions alongside technical and business factors.

---

## Three Dimensions in Change Decisions

### 1. Energy Consumption (Compute & Cooling)
Every change that increases workload has an energy footprint.

| Change Type | Sustainability Questions |
|---|---|
| Server provisioning / scaling | Is the new resource in a region powered by renewables? Is on-demand scaling used to avoid idle compute? |
| AI model deployment | What is the inference compute cost at scale? Is a smaller, sufficient model chosen over a larger one? |
| Database migration | Does the new DB configuration reduce unnecessary I/O and query overhead? |
| Cloud region selection | Does the selected region have a low PUE (Power Usage Effectiveness) score? |

### 2. Hardware Lifecycle (Resource Recovery)
Decisions about physical infrastructure have end-of-life implications.

- **Refresh cycles**: Avoid unnecessary hardware replacement when software optimization can extend lifespan
- **E-waste**: Decommissioned hardware should follow certified responsible recycling
- **Virtualization preference**: Prefer virtualization/containerization over dedicated hardware where feasible

### 3. Carbon Impact (Emissions)
For organizations with carbon reduction targets or ESG reporting obligations:

- **Cloud provider carbon data**: Major providers (AWS, Azure, GCP) publish regional carbon intensity metrics — consult before choosing deployment region
- **Embodied carbon**: New hardware purchases carry manufacturing emissions; factored into total cost of ownership
- **Remote work infrastructure**: Video conferencing and collaboration tools have measurable emissions; consider codec efficiency

---

## Integrating Sustainability into Risk Assessment

The standard ITIL risk matrix (Impact × Likelihood) can be extended with an optional Sustainability Score for high-footprint changes:

```
| Dimension           | Rating | Justification |
|---|---|---|
| Impact (if failure) | {1-3}  | {Reason}      |
| Likelihood          | {1-3}  | {Reason}      |
| **Risk Score**      | **{N}**| **{Level}**   |

Sustainability assessment (optional, required for AI/infra changes):
| Dimension           | Rating | Notes |
|---|---|---|
| Energy impact       | Low / Medium / High | {Estimate or region info} |
| Hardware lifecycle  | Low / Medium / High | {New hardware? Virtualized?} |
| Carbon offset       | Covered / Partial / None | {Provider commitment, region} |
```

Sustainability concerns do not block changes — they inform decisions and flag opportunities for greener alternatives.

---

## ESG Reporting Integration

If your organization produces ESG (Environmental, Social, Governance) reports:

- **Change records** are the primary source of IT environmental impact data — maintain accurate energy and hardware fields
- **PIR (Post-Implementation Review)** should include actual vs. estimated energy impact for significant infrastructure changes
- **Annual reporting**: Aggregate change record sustainability fields to estimate IT carbon footprint year-over-year

---

## Quick Reference: When to Apply

| Scenario | Action |
|---|---|
| Deploying new AI model (inference at scale) | Add Sustainability assessment to RFC |
| Provisioning >10 new servers | Note region energy mix in RFC |
| Cloud region selection for new service | Compare carbon intensity data |
| Decommissioning hardware | Confirm certified recycling plan in PIR |
| Routine patching / config changes | No sustainability assessment required |
