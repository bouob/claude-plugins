# Severity and Priority Classification — Detailed Reference

## SEV vs P — Two Independent Axes

| Dimension | Severity (SEV) | Priority (P) |
|---|---|---|
| **Measures** | Objective technical **impact scope** | Subjective business **handling order** |
| **Determined by** | Scope of damage (users affected, breadth) | Impact × Urgency (business context) |
| **Set by** | Formula (Impact breadth × depth) | Management/business decision |
| **Changes?** | Rarely — reflects actual impact | May change based on business context |
| **Assign when** | **First** — objective assessment | **Second** — add urgency context |

**Workflow:** Always assign SEV first (objective), then determine P (adds business urgency).

**Example of divergence:** A database outage affecting all users is SEV-1 and P1. A cosmetic bug on a settings page is SEV-4, but if it appears during a live product demo to the largest customer, it becomes P1 despite low severity.

---

## Severity Levels (SEV-1 to SEV-4) — Impact Scope

Severity is assigned first. It measures the objective technical impact:

### SEV-1 — Critical

**Definition:** Core service completely down. All users or all regions affected. No workaround exists.

**Examples:**
- Production database offline, all users unable to access service
- Authentication service failure, no one can log in
- Data breach or active security incident
- Email system down for entire organization

### SEV-2 — Major

**Definition:** Significant service degradation. Many users or a major function broken. Partial workaround may exist.

**Examples:**
- Payment processing failing for 30% of transactions
- Single-region outage in multi-region deployment
- VPN down for remote workers, office access unaffected
- File server intermittently unavailable

### SEV-3 — Minor

**Definition:** Limited impact on non-critical functionality. Workaround available. Business continues with minor inconvenience.

**Examples:**
- Search suggestions not loading
- Report generation slow but functional
- Non-critical monitoring dashboard offline
- Printer queue backed up for one floor

### SEV-4 — Low

**Definition:** Cosmetic issues, proactive improvements, or negligible user impact. No business disruption.

**Examples:**
- UI alignment bug in admin panel
- Resource utilization approaching threshold (not yet critical)
- Documentation update needed
- Non-urgent feature request for internal tool

---

## Priority Levels (P1-P4) — Handling Order

### P1 — Critical

**Definition:** Core business service completely unavailable. Broad user impact with no workaround. Revenue loss, safety risk, or regulatory exposure.

**Examples:**
- Production database offline, all users unable to access service
- Email system down for entire organization
- Authentication service failure, no one can log in
- Data breach or active security incident

**Response:**
- Immediate 24/7 response (15 min)
- Major Incident process activated
- Bridge/war room established
- Status updates every 15-30 minutes
- All hands until resolved

### P2 — High

**Definition:** Significant service degradation. Business operations materially impaired. Workaround may exist but is inadequate for sustained operation.

**Examples:**
- VPN down for remote workers, office access unaffected
- Payment processing failing for 30% of transactions
- Single-region outage in multi-region deployment
- File server intermittently unavailable

**Response:**
- Prompt response (1 hour)
- Dedicated team assigned
- Status updates every 30-60 minutes
- Escalation if no progress within 2 hours

### P3 — Medium

**Definition:** Limited impact on non-critical functionality. Workaround available and acceptable for business continuity.

**Examples:**
- Search suggestions not loading
- Report generation slow but functional
- Non-critical monitoring dashboard offline
- Printer queue backed up for one floor

**Response:**
- Response within 4 business hours
- Scheduled into team's work queue
- Resolved within 3-5 business days

### P4 — Low

**Definition:** Cosmetic issues, proactive improvements, or negligible user impact. No business disruption.

**Examples:**
- UI alignment bug in admin panel
- Resource utilization approaching threshold (not yet critical)
- Documentation update needed
- Non-urgent feature request for internal tool

**Response:**
- Response within 1 business day
- Resolved in next scheduled maintenance window

---

## SLA Response and Resolution Targets

| Priority | Response (Business Hours) | Response (After Hours) | Resolution Target |
|---|---|---|---|
| P1 | 15 minutes | 30 minutes | 4 hours |
| P2 | 1 hour | 2 hours | 8-24 hours |
| P3 | 4 hours | Next business day | 3-5 business days |
| P4 | 1 business day | Next business day | Next scheduled window |

**Definitions:**
- **Response time:** Time from incident detection to first meaningful action (not just acknowledgment)
- **Resolution time:** Time from detection to confirmed service restoration

---

## Mapping P to SEV

When using both systems:

| Scenario | SEV | Priority | Rationale |
|---|---|---|---|
| Production DB down | SEV-1 | P1 | High impact + high urgency |
| Non-prod DB down | SEV-2 | P3 | High technical impact but low business urgency |
| CEO's laptop slow | SEV-4 | P2 | Low technical impact but high business urgency |
| Routine capacity alert | SEV-3 | P4 | Medium technical but low urgency |
