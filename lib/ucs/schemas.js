// UCS sub-model Zod schemas.
//
// Faithful port of the Pydantic v2 models in
// kangaroo/backend/app/core/models/ucs.py. The wire format is identical
// (snake_case fields, ISO-8601 timestamps with offset, UUID strings) so a
// document serialized by the Python implementation parses cleanly here and
// vice-versa — required by the verification suite (CLAUDE.md §15 #1).
//
// All schemas are immutable by convention: the inferred TS types use
// `readonly` where collections are involved, and product code should treat
// every parsed UCS as frozen. We do not call `Object.freeze()` at parse
// time — the cost is non-trivial on deep structures and the immutability
// is already enforced by linting + the typescript rules.
import { z } from 'zod';
import { ArtifactTypeSchema, DecisionStatusSchema, DetailLevelSchema, EntityTypeSchema, ProcessingModeSchema, RelationshipTypeSchema, SafetyActionSchema, SafetyFlagTypeSchema, SafetySeveritySchema, SourceLLMSchema, SummaryLevelSchema, TaskStatusSchema, TonePreferenceSchema, } from './enums.js';
// ── Reusable primitives ───────────────────────────────────────────────────────
/** UUID v4 string. The Python source uses uuid4 throughout. */
export const UUIDSchema = z.string().uuid();
/**
 * ISO-8601 datetime string with timezone offset. The Python `ensure_utc`
 * validator rejects naive datetimes; we mirror that by requiring an offset.
 * Round-trip: `datetime.now(timezone.utc).isoformat()` → "2026-04-30T..."+Z|offset.
 */
export const ISODateTimeSchema = z.string().datetime({ offset: true });
/**
 * Free-form metadata bag. Matches Pydantic
 * `dict[str, str | int | float | bool]`. Booleans + numbers + strings only;
 * nested objects/arrays are rejected so this stays cheap to serialize.
 */
export const MetadataSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
// ── SessionMeta ───────────────────────────────────────────────────────────────
export const SessionMetaSchema = z
    .object({
    session_id: UUIDSchema,
    created_at: ISODateTimeSchema,
    updated_at: ISODateTimeSchema,
    source_llm: SourceLLMSchema.default('unknown'),
    source_model: z.string().default(''),
    total_tokens: z.number().int().min(0).default(0),
    message_count: z.number().int().min(0).default(0),
    /** Compressed/original ratio. 1.0 = uncompressed. */
    compression_ratio: z.number().min(0).max(1).default(1.0),
    processing_mode: ProcessingModeSchema.default('standard'),
})
    .strict();
// ── Entity + EntityRelationship ───────────────────────────────────────────────
export const EntityRelationshipSchema = z
    .object({
    target_id: UUIDSchema,
    type: RelationshipTypeSchema,
    confidence: z.number().min(0).max(1).default(1.0),
})
    .strict();
export const EntitySchema = z
    .object({
    id: UUIDSchema,
    name: z.string().min(1).max(500),
    type: EntityTypeSchema,
    aliases: z.array(z.string()).readonly().default([]),
    /** Message index where this entity first appeared. */
    first_mentioned_at: z.number().int().min(0).default(0),
    /** Compression survival weight. 1.0 = critical, 0.0 = trivial. */
    importance: z.number().min(0).max(1).default(0.5),
    relationships: z.array(EntityRelationshipSchema).readonly().default([]),
    metadata: MetadataSchema.default({}),
})
    .strict();
// ── Summary ───────────────────────────────────────────────────────────────────
export const SummarySchema = z
    .object({
    level: SummaryLevelSchema,
    content: z.string().min(1).max(50_000),
    token_count: z.number().int().min(0).default(0),
    /** Inclusive [start, end] message-index range. */
    covers_messages: z
        .tuple([z.number().int().min(0), z.number().int().min(0)])
        .default([0, 0]),
})
    .strict();
// ── Decision ──────────────────────────────────────────────────────────────────
// Decisions are NEVER dropped during compression (compressor.ts).
export const DecisionSchema = z
    .object({
    id: UUIDSchema,
    description: z.string().min(1).max(5_000),
    rationale: z.string().max(10_000).default(''),
    decided_at: z.number().int().min(0).default(0),
    status: DecisionStatusSchema.default('active'),
    /** ID of the decision that replaced this one (if any). */
    superseded_by: UUIDSchema.nullable().default(null),
})
    .strict();
// ── Task ──────────────────────────────────────────────────────────────────────
// Tasks are NEVER dropped during compression (compressor.ts).
export const TaskSchema = z
    .object({
    id: UUIDSchema,
    description: z.string().min(1).max(5_000),
    status: TaskStatusSchema.default('active'),
    dependencies: z.array(UUIDSchema).readonly().default([]),
    assigned_to: z.string().nullable().default(null),
    priority: z.number().min(0).max(1).default(0.5),
})
    .strict();
// ── Preferences ───────────────────────────────────────────────────────────────
export const PreferencesSchema = z
    .object({
    tone: TonePreferenceSchema.default('technical'),
    detail_level: DetailLevelSchema.default('detailed'),
    /** e.g. { code_blocks: true, markdown: true } */
    format_preferences: z.record(z.string(), z.union([z.string(), z.boolean()])).default({}),
    domain_expertise: z.array(z.string()).readonly().default([]),
    /** ISO 639-1 language code. */
    language: z.string().default('en'),
})
    .strict();
// ── Artifact ──────────────────────────────────────────────────────────────────
export const ArtifactSchema = z
    .object({
    id: UUIDSchema,
    type: ArtifactTypeSchema,
    language: z.string().default(''),
    content: z.string().max(500_000),
    title: z.string().max(500).default(''),
    metadata: MetadataSchema.default({}),
})
    .strict();
// ── KnowledgeGraph ────────────────────────────────────────────────────────────
export const KnowledgeGraphNodeSchema = z
    .object({
    entity_id: UUIDSchema,
    label: z.string().default(''),
    /** Visual grouping for graph rendering. */
    group: z.string().default(''),
})
    .strict();
export const KnowledgeGraphEdgeSchema = z
    .object({
    source_id: UUIDSchema,
    target_id: UUIDSchema,
    relationship: RelationshipTypeSchema,
    weight: z.number().min(0).default(1.0),
})
    .strict();
export const KnowledgeGraphSchema = z
    .object({
    nodes: z.array(KnowledgeGraphNodeSchema).readonly().default([]),
    edges: z.array(KnowledgeGraphEdgeSchema).readonly().default([]),
})
    .strict();
// ── TopicCluster ──────────────────────────────────────────────────────────────
export const TopicClusterSchema = z
    .object({
    id: UUIDSchema,
    label: z.string().min(1).max(500),
    message_indices: z.array(z.number().int().min(0)).readonly().default([]),
    /** Centroid embedding vector. Empty when not embedded. */
    embedding: z.array(z.number()).readonly().default([]),
})
    .strict();
// ── SafetyFlag ────────────────────────────────────────────────────────────────
export const SafetyFlagSchema = z
    .object({
    type: SafetyFlagTypeSchema,
    severity: SafetySeveritySchema,
    description: z.string().max(5_000),
    action_taken: SafetyActionSchema,
    confidence: z.number().min(0).max(1).default(0.0),
    source_message_index: z.number().int().min(0).nullable().default(null),
})
    .strict();
// ── LLMComparison ─────────────────────────────────────────────────────────────
export const LLMComparisonSchema = z
    .object({
    query: z.string(),
    /** Map of LLM identifier → response text. */
    responses: z.record(z.string(), z.string()).default({}),
    timestamp: ISODateTimeSchema,
})
    .strict();
//# sourceMappingURL=schemas.js.map