---
name: comms
description: 'Stakeholder communication templates for IT operations. This skill should be used when writing incident notifications, status page updates, maintenance announcements, or any communication to users, management, or other teams about IT service events. Provides severity-based tone guidance and audience-aware messaging.'
user-invocable: false
---

# IT Operations Communication

Templates and guidance for stakeholder communication during incidents, changes, and maintenance. All output in English by default; preview in the user's language before writing to file.

## Related Skills

- **/incident** — loads this skill for incident notifications
- **/statuspage** — loads this skill for status page updates
- **itil** — provides priority classification that determines communication tone

---

## Core Principles

1. **Impact-focused, not technical** — describe what users experience, not what broke internally
2. **Honest but controlled** — acknowledge the issue without exposing sensitive infrastructure details
3. **Predictable cadence** — always include "Next update by [time]" to reduce anxiety
4. **Severity-appropriate tone** — match urgency to priority level
5. **Audience-aware** — tailor detail level to the recipient group

## Tone by Priority Level

| Priority | Tone | Cadence | Example Opening |
|---|---|---|---|
| **P1** | Urgent, direct, action-oriented | Every 15-30 min | "We are experiencing a major service disruption..." |
| **P2** | Serious, informative | Every 30-60 min | "We are aware of issues affecting..." |
| **P3** | Informative, measured | When meaningful updates occur | "Some users may notice..." |
| **P4** | Routine, brief | At resolution | "A minor issue has been identified..." |

## Audience Adaptation

| Audience | Detail Level | Focus |
|---|---|---|
| **End users** | Minimal technical detail | What is affected, workaround, ETA |
| **Management** | Business impact + timeline | Revenue/productivity impact, resource allocation, ETA |
| **Technical teams** | Full technical detail | Systems affected, error codes, diagnostic steps |
| **External (statuspage)** | Impact-focused, no internal names | Service status, user-facing impact, ETA |

## What to Include vs Exclude

| Include | Exclude |
|---|---|
| Affected service (user-facing name) | Internal system names, IP addresses |
| User impact description | Root cause details during active incidents |
| Current status and actions being taken | Names of individuals responsible |
| Estimated time to resolution (if known) | Security-sensitive information |
| Workaround instructions (if available) | Blame or fault attribution |
| Next update time | Speculative root cause |

## Communication Structure

Every operational communication follows this structure:

```
1. Status — current state (one sentence)
2. Impact — what users experience
3. Action — what is being done
4. ETA — when to expect resolution or next update
5. Workaround — if available
```

## Additional Resources

### Reference Files

- **`references/incident-templates.md`** — Full notification templates for each incident phase (initial, update, resolution), by priority level, for each audience type
- **`references/statuspage-templates.md`** — Status page update templates following the Investigating/Identified/Monitoring/Resolved lifecycle, compatible with Atlassian Statuspage and Instatus
