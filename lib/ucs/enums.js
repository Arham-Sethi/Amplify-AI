// UCS enums — string literal unions paired with Zod enum schemas.
//
// Why two artifacts per enum (a TS literal-union type AND a Zod schema):
//   - The Zod schema does runtime validation at the wire boundary.
//   - The TS literal-union type is what we want to read in product code
//     (autocomplete, narrowing, exhaustive switch checks).
//   - Inferring the type from the Zod schema (`z.infer<typeof X>`) gives us
//     `string` literals — same effect, but the named exports here are nicer
//     to read and stable when the underlying Zod API changes.
//
// Wire format matches the Python source (kangaroo/backend/app/core/models/ucs.py)
// exactly so a UCS document round-trips between the Python and TS implementations
// — required for the verification suite (CLAUDE.md §15 #1).
import { z } from 'zod';
// ── Source LLM ────────────────────────────────────────────────────────────────
export const SourceLLMSchema = z.enum(['openai', 'anthropic', 'google', 'opensource', 'unknown']);
// ── Processing Mode ───────────────────────────────────────────────────────────
export const ProcessingModeSchema = z.enum(['standard', 'local']);
// ── Entity Type ───────────────────────────────────────────────────────────────
// NOTE: Python source uses ORGANIZATION = "org" — keeping the wire string "org",
// not "organization", so JSON round-trips identically.
export const EntityTypeSchema = z.enum([
    'person',
    'code',
    'concept',
    'org',
    'tech',
    'location',
    'file_path',
    'url',
    'api',
    'other',
]);
// ── Relationship Type ─────────────────────────────────────────────────────────
export const RelationshipTypeSchema = z.enum([
    'uses',
    'created_by',
    'depends_on',
    'related_to',
    'part_of',
    'implements',
    'extends',
    'communicates_with',
]);
// ── Summary Level ─────────────────────────────────────────────────────────────
// Drop priority: MESSAGE first, TOPIC next, GLOBAL never (compressor.ts).
export const SummaryLevelSchema = z.enum(['message', 'topic', 'global']);
// ── Decision Status ───────────────────────────────────────────────────────────
export const DecisionStatusSchema = z.enum(['active', 'superseded', 'reverted']);
// ── Task Status ───────────────────────────────────────────────────────────────
export const TaskStatusSchema = z.enum(['active', 'completed', 'blocked', 'cancelled']);
// ── User Preferences ──────────────────────────────────────────────────────────
export const TonePreferenceSchema = z.enum(['formal', 'casual', 'technical']);
export const DetailLevelSchema = z.enum(['concise', 'detailed', 'exhaustive']);
// ── Artifact Type ─────────────────────────────────────────────────────────────
export const ArtifactTypeSchema = z.enum([
    'code',
    'config',
    'file',
    'output',
    'diagram',
    'document',
]);
// ── Safety ────────────────────────────────────────────────────────────────────
export const SafetyFlagTypeSchema = z.enum([
    'injection',
    'poisoning',
    'policy_violation',
    'pii_detected',
]);
export const SafetySeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const SafetyActionSchema = z.enum(['stripped', 'flagged', 'blocked', 'redacted']);
//# sourceMappingURL=enums.js.map