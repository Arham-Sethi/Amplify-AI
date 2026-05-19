import { z } from 'zod';
export declare const UniversalContextSchema: z.ZodEffects<z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    session_meta: z.ZodObject<{
        session_id: z.ZodString;
        created_at: z.ZodString;
        updated_at: z.ZodString;
        source_llm: z.ZodDefault<z.ZodEnum<["openai", "anthropic", "google", "opensource", "unknown"]>>;
        source_model: z.ZodDefault<z.ZodString>;
        total_tokens: z.ZodDefault<z.ZodNumber>;
        message_count: z.ZodDefault<z.ZodNumber>;
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
    entities: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["person", "code", "concept", "org", "tech", "location", "file_path", "url", "api", "other"]>;
        aliases: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
        first_mentioned_at: z.ZodDefault<z.ZodNumber>;
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
    }>, "many">>>;
    summaries: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodObject<{
        level: z.ZodEnum<["message", "topic", "global"]>;
        content: z.ZodString;
        token_count: z.ZodDefault<z.ZodNumber>;
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
    }>, "many">>>;
    decisions: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        rationale: z.ZodDefault<z.ZodString>;
        decided_at: z.ZodDefault<z.ZodNumber>;
        status: z.ZodDefault<z.ZodEnum<["active", "superseded", "reverted"]>>;
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
    }>, "many">>>;
    tasks: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodObject<{
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
    }>, "many">>>;
    preferences: z.ZodDefault<z.ZodObject<{
        tone: z.ZodDefault<z.ZodEnum<["formal", "casual", "technical"]>>;
        detail_level: z.ZodDefault<z.ZodEnum<["concise", "detailed", "exhaustive"]>>;
        format_preferences: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodBoolean]>>>;
        domain_expertise: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodString, "many">>>;
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
    }>>;
    artifacts: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodObject<{
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
    }>, "many">>>;
    knowledge_graph: z.ZodDefault<z.ZodObject<{
        nodes: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodObject<{
            entity_id: z.ZodString;
            label: z.ZodDefault<z.ZodString>;
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
    }>>;
    topic_clusters: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        message_indices: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodNumber, "many">>>;
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
    }>, "many">>>;
    safety_flags: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodObject<{
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
    }>, "many">>>;
    llm_comparisons: z.ZodDefault<z.ZodReadonly<z.ZodArray<z.ZodObject<{
        query: z.ZodString;
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
    }>, "many">>>;
    /** Map of entity UUID string → importance score, for fast lookup. */
    importance_scores: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, "strict", z.ZodTypeAny, {
    version: string;
    session_meta: {
        session_id: string;
        created_at: string;
        updated_at: string;
        source_llm: "openai" | "anthropic" | "google" | "opensource" | "unknown";
        source_model: string;
        total_tokens: number;
        message_count: number;
        compression_ratio: number;
        processing_mode: "standard" | "local";
    };
    entities: readonly {
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
    }[];
    summaries: readonly {
        level: "message" | "topic" | "global";
        content: string;
        token_count: number;
        covers_messages: [number, number];
    }[];
    decisions: readonly {
        status: "active" | "superseded" | "reverted";
        id: string;
        description: string;
        rationale: string;
        decided_at: number;
        superseded_by: string | null;
    }[];
    tasks: readonly {
        status: "active" | "completed" | "blocked" | "cancelled";
        id: string;
        description: string;
        dependencies: readonly string[];
        assigned_to: string | null;
        priority: number;
    }[];
    preferences: {
        tone: "formal" | "casual" | "technical";
        detail_level: "concise" | "detailed" | "exhaustive";
        format_preferences: Record<string, string | boolean>;
        domain_expertise: readonly string[];
        language: string;
    };
    artifacts: readonly {
        type: "code" | "config" | "file" | "output" | "diagram" | "document";
        id: string;
        metadata: Record<string, string | number | boolean>;
        content: string;
        language: string;
        title: string;
    }[];
    knowledge_graph: {
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
    };
    topic_clusters: readonly {
        id: string;
        label: string;
        message_indices: readonly number[];
        embedding: readonly number[];
    }[];
    safety_flags: readonly {
        type: "injection" | "poisoning" | "policy_violation" | "pii_detected";
        confidence: number;
        description: string;
        severity: "low" | "medium" | "high" | "critical";
        action_taken: "blocked" | "stripped" | "flagged" | "redacted";
        source_message_index: number | null;
    }[];
    llm_comparisons: readonly {
        query: string;
        responses: Record<string, string>;
        timestamp: string;
    }[];
    importance_scores: Record<string, number>;
}, {
    session_meta: {
        session_id: string;
        created_at: string;
        updated_at: string;
        source_llm?: "openai" | "anthropic" | "google" | "opensource" | "unknown" | undefined;
        source_model?: string | undefined;
        total_tokens?: number | undefined;
        message_count?: number | undefined;
        compression_ratio?: number | undefined;
        processing_mode?: "standard" | "local" | undefined;
    };
    version?: string | undefined;
    entities?: readonly {
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
    }[] | undefined;
    summaries?: readonly {
        level: "message" | "topic" | "global";
        content: string;
        token_count?: number | undefined;
        covers_messages?: [number, number] | undefined;
    }[] | undefined;
    decisions?: readonly {
        id: string;
        description: string;
        status?: "active" | "superseded" | "reverted" | undefined;
        rationale?: string | undefined;
        decided_at?: number | undefined;
        superseded_by?: string | null | undefined;
    }[] | undefined;
    tasks?: readonly {
        id: string;
        description: string;
        status?: "active" | "completed" | "blocked" | "cancelled" | undefined;
        dependencies?: readonly string[] | undefined;
        assigned_to?: string | null | undefined;
        priority?: number | undefined;
    }[] | undefined;
    preferences?: {
        tone?: "formal" | "casual" | "technical" | undefined;
        detail_level?: "concise" | "detailed" | "exhaustive" | undefined;
        format_preferences?: Record<string, string | boolean> | undefined;
        domain_expertise?: readonly string[] | undefined;
        language?: string | undefined;
    } | undefined;
    artifacts?: readonly {
        type: "code" | "config" | "file" | "output" | "diagram" | "document";
        id: string;
        content: string;
        metadata?: Record<string, string | number | boolean> | undefined;
        language?: string | undefined;
        title?: string | undefined;
    }[] | undefined;
    knowledge_graph?: {
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
    } | undefined;
    topic_clusters?: readonly {
        id: string;
        label: string;
        message_indices?: readonly number[] | undefined;
        embedding?: readonly number[] | undefined;
    }[] | undefined;
    safety_flags?: readonly {
        type: "injection" | "poisoning" | "policy_violation" | "pii_detected";
        description: string;
        severity: "low" | "medium" | "high" | "critical";
        action_taken: "blocked" | "stripped" | "flagged" | "redacted";
        confidence?: number | undefined;
        source_message_index?: number | null | undefined;
    }[] | undefined;
    llm_comparisons?: readonly {
        query: string;
        timestamp: string;
        responses?: Record<string, string> | undefined;
    }[] | undefined;
    importance_scores?: Record<string, number> | undefined;
}>, {
    version: string;
    session_meta: {
        session_id: string;
        created_at: string;
        updated_at: string;
        source_llm: "openai" | "anthropic" | "google" | "opensource" | "unknown";
        source_model: string;
        total_tokens: number;
        message_count: number;
        compression_ratio: number;
        processing_mode: "standard" | "local";
    };
    entities: readonly {
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
    }[];
    summaries: readonly {
        level: "message" | "topic" | "global";
        content: string;
        token_count: number;
        covers_messages: [number, number];
    }[];
    decisions: readonly {
        status: "active" | "superseded" | "reverted";
        id: string;
        description: string;
        rationale: string;
        decided_at: number;
        superseded_by: string | null;
    }[];
    tasks: readonly {
        status: "active" | "completed" | "blocked" | "cancelled";
        id: string;
        description: string;
        dependencies: readonly string[];
        assigned_to: string | null;
        priority: number;
    }[];
    preferences: {
        tone: "formal" | "casual" | "technical";
        detail_level: "concise" | "detailed" | "exhaustive";
        format_preferences: Record<string, string | boolean>;
        domain_expertise: readonly string[];
        language: string;
    };
    artifacts: readonly {
        type: "code" | "config" | "file" | "output" | "diagram" | "document";
        id: string;
        metadata: Record<string, string | number | boolean>;
        content: string;
        language: string;
        title: string;
    }[];
    knowledge_graph: {
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
    };
    topic_clusters: readonly {
        id: string;
        label: string;
        message_indices: readonly number[];
        embedding: readonly number[];
    }[];
    safety_flags: readonly {
        type: "injection" | "poisoning" | "policy_violation" | "pii_detected";
        confidence: number;
        description: string;
        severity: "low" | "medium" | "high" | "critical";
        action_taken: "blocked" | "stripped" | "flagged" | "redacted";
        source_message_index: number | null;
    }[];
    llm_comparisons: readonly {
        query: string;
        responses: Record<string, string>;
        timestamp: string;
    }[];
    importance_scores: Record<string, number>;
}, {
    session_meta: {
        session_id: string;
        created_at: string;
        updated_at: string;
        source_llm?: "openai" | "anthropic" | "google" | "opensource" | "unknown" | undefined;
        source_model?: string | undefined;
        total_tokens?: number | undefined;
        message_count?: number | undefined;
        compression_ratio?: number | undefined;
        processing_mode?: "standard" | "local" | undefined;
    };
    version?: string | undefined;
    entities?: readonly {
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
    }[] | undefined;
    summaries?: readonly {
        level: "message" | "topic" | "global";
        content: string;
        token_count?: number | undefined;
        covers_messages?: [number, number] | undefined;
    }[] | undefined;
    decisions?: readonly {
        id: string;
        description: string;
        status?: "active" | "superseded" | "reverted" | undefined;
        rationale?: string | undefined;
        decided_at?: number | undefined;
        superseded_by?: string | null | undefined;
    }[] | undefined;
    tasks?: readonly {
        id: string;
        description: string;
        status?: "active" | "completed" | "blocked" | "cancelled" | undefined;
        dependencies?: readonly string[] | undefined;
        assigned_to?: string | null | undefined;
        priority?: number | undefined;
    }[] | undefined;
    preferences?: {
        tone?: "formal" | "casual" | "technical" | undefined;
        detail_level?: "concise" | "detailed" | "exhaustive" | undefined;
        format_preferences?: Record<string, string | boolean> | undefined;
        domain_expertise?: readonly string[] | undefined;
        language?: string | undefined;
    } | undefined;
    artifacts?: readonly {
        type: "code" | "config" | "file" | "output" | "diagram" | "document";
        id: string;
        content: string;
        metadata?: Record<string, string | number | boolean> | undefined;
        language?: string | undefined;
        title?: string | undefined;
    }[] | undefined;
    knowledge_graph?: {
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
    } | undefined;
    topic_clusters?: readonly {
        id: string;
        label: string;
        message_indices?: readonly number[] | undefined;
        embedding?: readonly number[] | undefined;
    }[] | undefined;
    safety_flags?: readonly {
        type: "injection" | "poisoning" | "policy_violation" | "pii_detected";
        description: string;
        severity: "low" | "medium" | "high" | "critical";
        action_taken: "blocked" | "stripped" | "flagged" | "redacted";
        confidence?: number | undefined;
        source_message_index?: number | null | undefined;
    }[] | undefined;
    llm_comparisons?: readonly {
        query: string;
        timestamp: string;
        responses?: Record<string, string> | undefined;
    }[] | undefined;
    importance_scores?: Record<string, number> | undefined;
}>;
export type UniversalContext = z.infer<typeof UniversalContextSchema>;
//# sourceMappingURL=ucs.d.ts.map