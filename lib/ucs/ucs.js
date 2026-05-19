// Root Universal Context Schema.
//
// Port of `UniversalContextSchema` from
// kangaroo/backend/app/core/models/ucs.py (Pydantic v2 root model).
//
// Beyond per-field validation (delegated to ./schemas.ts), the root schema
// enforces cross-reference integrity via `superRefine`:
//   1. Every `EntityRelationship.target_id` resolves to an entity in `entities`.
//   2. Every `KnowledgeGraph` node references an entity.
//   3. Every `KnowledgeGraph` edge endpoint is a node in the graph.
//   4. Every `Task.dependencies` entry resolves to a task.
//   5. Every `Decision.superseded_by` resolves to another decision.
//
// These checks are ERRORS (parse fails) — same posture as the Python
// `validate_internal_references` model_validator. Soft warnings (orphaned
// importance scores, circular task deps, duplicate names) live in
// ./validator.ts and never block parsing.
import { z } from 'zod';
import { ArtifactSchema, DecisionSchema, EntitySchema, KnowledgeGraphSchema, LLMComparisonSchema, PreferencesSchema, SafetyFlagSchema, SessionMetaSchema, SummarySchema, TaskSchema, TopicClusterSchema, } from './schemas.js';
// SemVer triple — keeps the wire format pinned to the major.minor.patch
// the Python source emits. Bump when migrating documents forward.
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
export const UniversalContextSchema = z
    .object({
    version: z.string().regex(SEMVER_RE).default('1.0.0'),
    session_meta: SessionMetaSchema,
    entities: z.array(EntitySchema).readonly().default([]),
    summaries: z.array(SummarySchema).readonly().default([]),
    decisions: z.array(DecisionSchema).readonly().default([]),
    tasks: z.array(TaskSchema).readonly().default([]),
    preferences: PreferencesSchema.default({}),
    artifacts: z.array(ArtifactSchema).readonly().default([]),
    knowledge_graph: KnowledgeGraphSchema.default({}),
    topic_clusters: z.array(TopicClusterSchema).readonly().default([]),
    safety_flags: z.array(SafetyFlagSchema).readonly().default([]),
    llm_comparisons: z.array(LLMComparisonSchema).readonly().default([]),
    /** Map of entity UUID string → importance score, for fast lookup. */
    importance_scores: z.record(z.string(), z.number()).default({}),
})
    .strict()
    .superRefine((ucs, ctx) => {
    const entityIds = new Set(ucs.entities.map((e) => e.id));
    // 1. Entity relationships reference existing entities.
    for (const entity of ucs.entities) {
        for (const rel of entity.relationships) {
            if (!entityIds.has(rel.target_id)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['entities'],
                    message: `Entity '${entity.name}' has relationship targeting non-existent entity ID ${rel.target_id}`,
                });
            }
        }
    }
    // 2. Knowledge graph nodes reference existing entities.
    for (const node of ucs.knowledge_graph.nodes) {
        if (!entityIds.has(node.entity_id)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['knowledge_graph', 'nodes'],
                message: `Knowledge graph node references non-existent entity ID ${node.entity_id}`,
            });
        }
    }
    // 3. Knowledge graph edge endpoints are nodes in the graph.
    const nodeEntityIds = new Set(ucs.knowledge_graph.nodes.map((n) => n.entity_id));
    for (const edge of ucs.knowledge_graph.edges) {
        if (!nodeEntityIds.has(edge.source_id)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['knowledge_graph', 'edges'],
                message: `Knowledge graph edge source ${edge.source_id} is not a node in the graph`,
            });
        }
        if (!nodeEntityIds.has(edge.target_id)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['knowledge_graph', 'edges'],
                message: `Knowledge graph edge target ${edge.target_id} is not a node in the graph`,
            });
        }
    }
    // 4. Task dependencies resolve to existing tasks.
    const taskIds = new Set(ucs.tasks.map((t) => t.id));
    for (const task of ucs.tasks) {
        for (const depId of task.dependencies) {
            if (!taskIds.has(depId)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['tasks'],
                    message: `Task '${task.description.slice(0, 50)}' depends on non-existent task ID ${depId}`,
                });
            }
        }
    }
    // 5. Decision supersession chain: superseded_by resolves to a decision.
    const decisionIds = new Set(ucs.decisions.map((d) => d.id));
    for (const decision of ucs.decisions) {
        if (decision.superseded_by !== null && !decisionIds.has(decision.superseded_by)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['decisions'],
                message: `Decision '${decision.description.slice(0, 50)}' superseded by non-existent decision ID ${decision.superseded_by}`,
            });
        }
    }
});
//# sourceMappingURL=ucs.js.map