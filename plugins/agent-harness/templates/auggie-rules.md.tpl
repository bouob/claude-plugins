# auggie-rules.md.tpl — Auggie .augment/rules/ entry template (v0.5.x)
#
# STATUS: STUB. Full template lands in v0.5.1.
#
# Target path (when deployed by init Step 5):
#   <workspace-root>/.augment/rules/agent-harness.md
#
# Frontmatter contract:
#   ---
#   type: agent_requested
#   description: Run the agent-harness sprint pipeline (planner -> generator -> evaluator)
#   ---
#
# Why agent_requested (not always_apply):
#   Auggie always_apply rules inflate every prompt's token budget.
#   agent_requested rules attach only when the agent decides it's relevant,
#   which matches /sprint's on-demand activation model.

# stub — see commands/init.md Step 5 (v0.5.1) for renderer
