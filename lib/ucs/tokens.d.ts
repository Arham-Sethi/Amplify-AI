import type { Artifact, Entity } from './schemas.js';
/**
 * Estimate token count for a string. Empty input returns 0; everything else
 * returns at least 1 token (matches the Python `max(1, len(text) // 4)`).
 */
export declare function estimateTokens(text: string): number;
/**
 * Estimate the token cost of an entity in serialized form. Walks the entity's
 * name, aliases, and relationship-type strings — does NOT include UUIDs or
 * importance scores because the wire format inlines those as compact metadata.
 */
export declare function estimateEntityTokens(entity: Entity): number;
/** Estimate the token cost of an artifact (content + title). */
export declare function estimateArtifactTokens(artifact: Artifact): number;
//# sourceMappingURL=tokens.d.ts.map