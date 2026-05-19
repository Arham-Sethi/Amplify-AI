// @amplify/ucs — Universal Context Schema (Zod port of kangaroo/ Pydantic models).
//
// Use this package whenever you cross a boundary that carries conversational
// context: HTTP request/response bodies, Supabase rows, IPC messages between
// the desktop app and the backend, etc. Per CLAUDE.md §17, Zod schemas are
// the source of truth at every boundary — derive your TS types from the
// schemas exported here, never hand-write them.
//
// Public surface:
//   - All enum schemas + their inferred string-literal-union types.
//   - All sub-model schemas (SessionMeta, Entity, Summary, Decision, ...).
//   - The root UniversalContextSchema and its inferred `UniversalContext` type.
//   - The non-fatal `validateUCS` quality checker.
//   - Token-estimation utilities used by the compressor.
//   - The `CompressionPipeline` and its result/options types.
//
// Internal-only: the binary heap inside `compressor.ts`.
export * from './enums.js';
export * from './schemas.js';
export * from './ucs.js';
export * from './validator.js';
export * from './tokens.js';
export * from './compressor.js';
//# sourceMappingURL=index.js.map