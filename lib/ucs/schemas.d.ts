import { z } from 'zod';
/** UUID v4 string. The Python source uses uuid4 throughout. */
export declare const UUIDSchema: z.ZodString;
/**
 * ISO-8601 datetime string with timezone offset. The Python `ensure_utc`
 * validator rejects naive datetimes; we mirror that by requiring an offset.
 * Round-trip: `datetime.now(timezone.utc).isoformat()` → "2026-04-30T..."+Z|offset.
 */
export declare const ISODateTimeSchema: z.ZodString;
/**
 * Free-form metadata bag. Matches Pydantic
 * `dict[str, str | int | float | bool]`. Booleans + numbers + strings only;
 * nested objects/arrays are rejected so this stays cheap to serialize.
 */
export declare const MetadataSchema: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
export declare const SessionMetaSchema: z.ZodObject<{
    session_id: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    source_llm: z.ZodDefault<z.ZodEnum<["openai", "anthropic", "google", "opensource", "unknown"]>>;
    source_model: z.ZodDefault<z.ZodString>;
    total_tokens: z.ZodDefault<z.ZodNumber>;
    message_count: z.ZodDefault<z.ZodNumber>;
    /** Compressed/original ratio. 1.0 = uncompressed. */
    compression_ratio: z.ZodDefault<z.ZodNumber>;
    processing_mode: z.ZodDefault<z.ZodEnum<["standard", "local"]>>;
}, "strict", z.ZodTypeAny, {
    session_id: string;
    created_at: string;
    updated_at: string;
    source_llm: "openai" | "anthropic" | "google" | "opensource" | "unknown";
    source_model: string;
    total_tokens: number;
    message_count: number;
    compression_ratio: number;
    processing_mode: "standard" | "local";
}, {
    session_id: string;
    created_at: string;
    updated_at: string;
    source_llm?: "openai" | "anthropic" | "google" | "opensource" | "unknown" | undefined;
    source_model?: string | undefined;
    total_tokens?: number | undefined;
    message_count?: number | undefined;
    compression_ratio?: number | undefined;
    processing_mode?: "standard" | "local" | undefined;
}>;
export type SessionMeta = z.infer<typeof SessionMetaSchema>;
export declare const EntityRelationshipSchema: z.ZodObject<{
    target_id: z.ZodString;
    type: z.ZodEnum<["uses", "created_by", "depends_on", "related_to", "part_of", "implements", "extends", "communicates_with"]>;
    confidence: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    type: "uses" | "created_by" | "depends_on" | "related_to" | "part_of" | "implements" | "extends" | "communicates_with";
    target_id: string;
    confidence: number;
}, {
    type: "uses" | "created_by" | "depends_on" | "related_to" | "part_of" | "implements" | "extends" | "communicates_with";
    target_id: string;
    confidence?: number | undefined;
}>;
export type EntityRelationship = z.infer<typeof EntityRelationshipSchema>;
export declare const EntitySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["person", "code", "concept", "org", "tech", "location", "file_path", "url", "api", "other"]>;
    aliases: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
    /** Message index where this entity first appeared. */
    first_mentioned_at: z.ZodDefault<z.ZodNumber>;
    /** Compression survival weight. 1.0 = critical, 0.0 = trivial. */
    importance: z.ZodDefault<z.ZodNumber>;
    relationships: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodObject<{
        target_id: z.ZodString;
        type: z.ZodEnum<["uses", "created_by", "depends_on", "related_to", "part_of", "implements", "extends", "communicates_with"]>;
        confidence: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        type: "uses" | "created_by" | "depends_on" | "related_to" | "part_of" | "implements" | "extends" | "communicates_with";
        target_id: string;
        confidence: number;
    }, {
        type: "uses" | "created_by" | "depends_on" | "related_to" | "part_of" | "implements" | "extends" | "communicates_with";
        target_id: string;
        confidence?: number | undefined;
    }>, "many">>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
}, "strict", z.ZodTypeAny, {
    type: "code" | "person" | "concept" | "org" | "tech" | "location" | "file_path" | "url" | "api" | "other";
    id: string;
    name: string;
    aliases: readonly string[];
    first_mentioned_at: number;
    importance: number;
    relationships: readonly {
        type: "uses" | "created_by" | "depends_on" | "related_to" | "part_of" | "implements" | "extends" | "communicates_with";
        target_id: string;
        confidence: number;
    }[];
    metadata: Record<string, string | number | boolean>;
}, {
    type: "code" | "person" | "concept" | "org" | "tech" | "location" | "file_path" | "url" | "api" | "other";
    id: string;
    name: string;
    aliases?: readonly string[] | undefined;
    first_mentioned_at?: number | undefined;
    importance?: number | undefined;
    relationships?: readonly {
        type: "uses" | "created_by" | "depends_on" | "related_to" | "part_of" | "implements" | "extends" | "communicates_with";
        target_id: string;
        confidence?: number | undefined;
    }[] | undefined;
    metadata?: Record<string, string | number | boolean> | undefined;
}>;
export type Entity = z.infer<typeof EntitySchema>;
export declare const SummarySchema: z.ZodObject<{
    level: z.ZodEnum<["message", "topic", "global"]>;
    content: z.ZodString;
    token_count: z.ZodDefault<z.ZodNumber>;
    /** Inclusive [start, end] message-index range. */
    covers_messages: z.ZodDefault<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
}, "strict", z.ZodTypeAny, {
    level: "message" | "topic" | "global";
    content: string;
    token_count: number;
    covers_messages: [number, number];
}, {
    level: "message" | "topic" | "global";
    content: string;
    token_count?: number | undefined;
    covers_messages?: [number, number] | undefined;
}>;
export type Summary = z.infer<typeof SummarySchema>;
export declare const DecisionSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    rationale: z.ZodDefault<z.ZodString>;
    decided_at: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["active", "superseded", "reverted"]>>;
    /** ID of the decision that replaced this one (if any). */
    superseded_by: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    status: "active" | "superseded" | "reverted";
    id: string;
    description: string;
    rationale: string;
    decided_at: number;
    superseded_by: string | null;
}, {
    id: string;
    description: string;
    status?: "active" | "superseded" | "reverted" | undefined;
    rationale?: string | undefined;
    decided_at?: number | undefined;
    superseded_by?: string | null | undefined;
}>;
export type Decision = z.infer<typeof DecisionSchema>;
export declare const TaskSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["active", "completed", "blocked", "cancelled"]>>;
    dependencies: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
    assigned_to: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    priority: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    status: "active" | "completed" | "blocked" | "cancelled";
    id: string;
    description: string;
    dependencies: readonly string[];
    assigned_to: string | null;
    priority: number;
}, {
    id: string;
    description: string;
    status?: "active" | "completed" | "blocked" | "cancelled" | undefined;
    dependencies?: readonly string[] | undefined;
    assigned_to?: string | null | undefined;
    priority?: number | undefined;
}>;
export type Task = z.infer<typeof TaskSchema>;
export declare const PreferencesSchema: z.ZodObject<{
    tone: z.ZodDefault<z.ZodEnum<["formal", "casual", "technical"]>>;
    detail_level: z.ZodDefault<z.ZodEnum<["concise", "detailed", "exhaustive"]>>;
    /** e.g. { code_blocks: true, markdown: true } */
    format_preferences: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodBoolean]>>>;
    domain_expertise: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
    /** ISO 639-1 language code. */
    language: z.ZodDefault<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    tone: "formal" | "casual" | "technical";
    detail_level: "concise" | "detailed" | "exhaustive";
    format_preferences: Record<string, string | boolean>;
    domain_expertise: readonly string[];
    language: string;
}, {
    tone?: "formal" | "casual" | "technical" | undefined;
    detail_level?: "concise" | "detailed" | "exhaustive" | undefined;
    format_preferences?: Record<string, string | boolean> | undefined;
    domain_expertise?: readonly string[] | undefined;
    language?: string | undefined;
}>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export declare const ArtifactSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["code", "config", "file", "output", "diagram", "document"]>;
    language: z.ZodDefault<z.ZodString>;
    content: z.ZodString;
    title: z.ZodDefault<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
}, "strict", z.ZodTypeAny, {
    type: "code" | "config" | "file" | "output" | "diagram" | "document";
    id: string;
    metadata: Record<string, string | number | boolean>;
    content: string;
    language: string;
    title: string;
}, {
    type: "code" | "config" | "file" | "output" | "diagram" | "document";
    id: string;
    content: string;
    metadata?: Record<string, string | number | boolean> | undefined;
    language?: string | undefined;
    title?: string | undefined;
}>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export declare const KnowledgeGraphNodeSchema: z.ZodObject<{
    entity_id: z.ZodString;
    label: z.ZodDefault<z.ZodString>;
    /** Visual grouping for graph rendering. */
    group: z.ZodDefault<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    entity_id: string;
    label: string;
    group: string;
}, {
    entity_id: string;
    label?: string | undefined;
    group?: string | undefined;
}>;
export type KnowledgeGraphNode = z.infer<typeof KnowledgeGraphNodeSchema>;
export declare const KnowledgeGraphEdgeSchema: z.ZodObject<{
    source_id: z.ZodString;
    target_id: z.ZodString;
    relationship: z.ZodEnum<["uses", "created_by", "depends_on", "related_to", "part_of", "implements", "extends", "communicates_with"]>;
    weight: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    target_id: string;
    source_id: string;
    relationship: "uses" | "created_by" | "depends_on" | "related_to" | "part_of" | "implements" | "extends" | "communicates_with";
    weight: number;
}, {
    target_id: string;
    source_id: string;
    relationship: "uses" | "created_by" | "depends_on" | "related_to" | "part_of" | "implements" | "extends" | "communicates_with";
    weight?: number | undefined;
}>;
export type KnowledgeGraphEdge = z.infer<typeof KnowledgeGraphEdgeSchema>;
export declare const KnowledgeGraphSchema: z.ZodObject<{
    nodes: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodObject<{
        entity_id: z.ZodString;
        label: z.ZodDefault<z.ZodString>;
        /** Visual grouping for graph rendering. */
        group: z.ZodDefault<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        entity_id: string;
        label: string;
        group: string;
    }, {
        entity_id: string;
        label?: string | undefined;
        group?: string | undefined;
    }>, "many">>>;
    edges: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodObject<{
        source_id: z.ZodString;
        target_id: z.ZodString;
        relationship: z.ZodEnum<["uses", "created_by", "depends_on", "related_to", "part_of", "implements", "extends", "communicates_with"]>;
        weight: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        target_id: string;
        source_id: string;
        relationship: "uses" | "created_by" | "depends_on" | "related_to" | "part_of" | "implements" | "extends" | "communicates_with";
        weight: number;
    }, {
        target_id: string;
        source_id: string;
        relationship: "uses" | "created_by" | "depends_on" | "related_to" | "part_of" | "implements" | "extends" | "communicates_with";
        weight?: number | undefined;
    }>, "many">>>;
}, "strict", z.ZodTypeAny, {
    nodes: readonly {
        entity_id: string;
        label: string;
        group: string;
    }[];
    edges: readonly {
        target_id: string;
        source_id: string;
        relationship: "uses" | "created_by" | "depends_on" | "related_to" | "part_of" | "implements" | "extends" | "communicates_with";
        weight: number;
    }[];
}, {
    nodes?: readonly {
        entity_id: string;
        label?: string | undefined;
        group?: string | undefined;
    }[] | undefined;
    edges?: readonly {
        target_id: string;
        source_id: string;
        relationship: "uses" | "created_by" | "depends_on" | "related_to" | "part_of" | "implements" | "extends" | "communicates_with";
        weight?: number | undefined;
    }[] | undefined;
}>;
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;
export declare const TopicClusterSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    message_indices: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodNumber, "many">>>;
    /** Centroid embedding vector. Empty when not embedded. */
    embedding: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodNumber, "many">>>;
}, "strict", z.ZodTypeAny, {
    id: string;
    label: string;
    message_indices: readonly number[];
    embedding: readonly number[];
}, {
    id: string;
    label: string;
    message_indices?: readonly number[] | undefined;
    embedding?: readonly number[] | undefined;
}>;
export type TopicCluster = z.infer<typeof TopicClusterSchema>;
export declare const SafetyFlagSchema: z.ZodObject<{
    type: z.ZodEnum<["injection", "poisoning", "policy_violation", "pii_detected"]>;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    description: z.ZodString;
    action_taken: z.ZodEnum<["stripped", "flagged", "blocked", "redacted"]>;
    confidence: z.ZodDefault<z.ZodNumber>;
    source_message_index: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
}, "strict", z.ZodTypeAny, {
    type: "injection" | "poisoning" | "policy_violation" | "pii_detected";
    confidence: number;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    action_taken: "blocked" | "stripped" | "flagged" | "redacted";
    source_message_index: number | null;
}, {
    type: "injection" | "poisoning" | "policy_violation" | "pii_detected";
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    action_taken: "blocked" | "stripped" | "flagged" | "redacted";
    confidence?: number | undefined;
    source_message_index?: number | null | undefined;
}>;
export type SafetyFlag = z.infer<typeof SafetyFlagSchema>;
export declare const LLMComparisonSchema: z.ZodObject<{
    query: z.ZodString;
    /** Map of LLM identifier → response text. */
    responses: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    timestamp: z.ZodString;
}, "strict", z.ZodTypeAny, {
    query: string;
    responses: Record<string, string>;
    timestamp: string;
}, {
    query: string;
    timestamp: string;
    responses?: Record<string, string> | undefined;
}>;
export type LLMComparison = z.infer<typeof LLMComparisonSchema>;
//# sourceMappingURL=schemas.d.ts.map