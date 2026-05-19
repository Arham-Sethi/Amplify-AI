// Approximate token-count utilities used by the compressor.
//
// We deliberately avoid a real tokenizer dependency here:
//   - The compressor only needs token counts for budget arithmetic — the
//     final wire format gets re-tokenized by whichever provider receives
//     it (Anthropic does its own counting on the server).
//   - The 4-chars-per-token heuristic is well-known to be within ~10% of
//     real tokenizers for English prose, which is more than enough fidelity
//     for "drop the lowest-priority items until under N tokens" decisions.
//   - Bringing in `gpt-tokenizer` here would pull in a 3MB BPE table and
//     slow cold starts. Real token counting lives in `packages/tokenizer`,
//     which the API endpoints use when they need accuracy.
//
// Behaviour matches kangaroo/backend/app/core/engine/compressor.py exactly
// (including the `max(1, len(text) // 4)` quirk that gives empty-but-present
// strings a 1-token floor).
/**
 * Estimate token count for a string. Empty input returns 0; everything else
 * returns at least 1 token (matches the Python `max(1, len(text) // 4)`).
 */
export function estimateTokens(text) {
    if (!text)
        return 0;
    return Math.max(1, Math.floor(text.length / 4));
}
/**
 * Estimate the token cost of an entity in serialized form. Walks the entity's
 * name, aliases, and relationship-type strings — does NOT include UUIDs or
 * importance scores because the wire format inlines those as compact metadata.
 */
export function estimateEntityTokens(entity) {
    const parts = [entity.name, ...entity.aliases];
    for (const rel of entity.relationships) {
        parts.push(rel.type);
    }
    return estimateTokens(parts.join(' '));
}
/** Estimate the token cost of an artifact (content + title). */
export function estimateArtifactTokens(artifact) {
    return estimateTokens(artifact.content) + estimateTokens(artifact.title);
}
//# sourceMappingURL=tokens.js.map