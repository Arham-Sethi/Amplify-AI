import type { Artifact, Decision, Entity, Summary, Task } from './schemas.js';
export type ContentCategory = 'message_summary' | 'topic_summary' | 'global_summary' | 'entity' | 'decision' | 'task' | 'artifact';
export interface CompressionResult {
    readonly summaries: readonly Summary[];
    readonly entities: readonly Entity[];
    readonly decisions: readonly Decision[];
    readonly tasks: readonly Task[];
    readonly artifacts: readonly Artifact[];
    readonly total_tokens: number;
    readonly original_tokens: number;
    /** Compressed/original. 1.0 = no compression happened. */
    readonly compression_ratio: number;
    readonly items_dropped: number;
}
/**
 * Truncate an artifact's content to fit within a token budget. Keeps the
 * first N chars and trims back to the most recent newline if at least half
 * the budget has been consumed (preserves whole lines, which matters for
 * code artifacts). Appends a "[truncated]" marker so downstream consumers
 * know there's missing content.
 */
export declare function truncateArtifact(artifact: Artifact, maxTokens: number): Artifact;
export interface CompressionInput {
    summaries?: readonly Summary[];
    entities?: readonly Entity[];
    decisions?: readonly Decision[];
    tasks?: readonly Task[];
    artifacts?: readonly Artifact[];
    /** Map of entity-id → importance score, overrides each entity's own score. */
    importance_scores?: Readonly<Record<string, number>>;
}
export interface CompressionPipelineOptions {
    /** Total token budget for the compressed output. Default: 4000. */
    target_tokens?: number;
    /** Per-artifact ceiling after truncation. Default: 500. */
    artifact_max_tokens?: number;
}
export declare class CompressionPipeline {
    private readonly target_tokens;
    private readonly artifact_max_tokens;
    constructor(options?: CompressionPipelineOptions);
    compress(input?: CompressionInput): CompressionResult;
}
//# sourceMappingURL=compressor.d.ts.map