// normalize-codex-output.mjs — Codex stdout/last-message → sprint-progress schema
//
// STATUS: STUB. Full implementation lands in v0.4.1.
//
// Planned signature:
//   node normalize-codex-output.mjs <raw-text-file> <progress-md-file>
// Behaviour:
//   Wrap codex `--output-last-message` text into the
//   sprint-progress/<task-id>.md schema (see references/sprint-contract.schema.md).
//   For codex this is largely a passthrough — the model returns
//   plain assistant text via --output-last-message.

console.error("normalize-codex-output.mjs stub — implemented in v0.4.1");
process.exit(64);
