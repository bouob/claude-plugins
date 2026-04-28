// normalize-auggie-output.mjs — Auggie JSON envelope → sprint-progress schema
//
// STATUS: STUB. Full implementation lands in v0.5.0.
//
// Planned signature:
//   node normalize-auggie-output.mjs <raw-json-file> <progress-md-file>
// Behaviour:
//   Parse `auggie --output-format json` envelope, extract the final assistant
//   message, surface tool-call summaries, and serialize into the
//   sprint-progress/<task-id>.md schema (see references/sprint-contract.schema.md).

console.error("normalize-auggie-output.mjs stub — implemented in v0.5.0");
process.exit(64);
