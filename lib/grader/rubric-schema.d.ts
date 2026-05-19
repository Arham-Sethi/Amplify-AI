import { z } from 'zod';
export declare const RubricCheckSchema: z.ZodDiscriminatedUnion<"test", [z.ZodObject<{
    test: z.ZodEnum<["regex", "not_regex"]>;
    pattern: z.ZodString;
    id: z.ZodString;
    /** Points deducted on failure. 0-weight is allowed for advisory checks. */
    weight: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    test: "regex" | "not_regex";
    pattern: string;
    id: string;
    weight: number;
    description?: string | undefined;
}, {
    test: "regex" | "not_regex";
    pattern: string;
    id: string;
    weight: number;
    description?: string | undefined;
}>, z.ZodObject<{
    test: z.ZodEnum<["regex_count_min", "regex_count_max"]>;
    pattern: z.ZodString;
    /** Match-count threshold. */
    value: z.ZodNumber;
    id: z.ZodString;
    /** Points deducted on failure. 0-weight is allowed for advisory checks. */
    weight: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    test: "regex_count_min" | "regex_count_max";
    value: number;
    pattern: string;
    id: string;
    weight: number;
    description?: string | undefined;
}, {
    test: "regex_count_min" | "regex_count_max";
    value: number;
    pattern: string;
    id: string;
    weight: number;
    description?: string | undefined;
}>, z.ZodObject<{
    test: z.ZodEnum<["keyword_any", "keyword_all"]>;
    /** Non-empty list of keywords; case-insensitive substring match. */
    value: z.ZodArray<z.ZodString, "many">;
    id: z.ZodString;
    /** Points deducted on failure. 0-weight is allowed for advisory checks. */
    weight: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    test: "keyword_any" | "keyword_all";
    value: string[];
    id: string;
    weight: number;
    description?: string | undefined;
}, {
    test: "keyword_any" | "keyword_all";
    value: string[];
    id: string;
    weight: number;
    description?: string | undefined;
}>, z.ZodObject<{
    test: z.ZodEnum<["length_min", "length_max"]>;
    value: z.ZodNumber;
    id: z.ZodString;
    /** Points deducted on failure. 0-weight is allowed for advisory checks. */
    weight: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    test: "length_min" | "length_max";
    value: number;
    id: string;
    weight: number;
    description?: string | undefined;
}, {
    test: "length_min" | "length_max";
    value: number;
    id: string;
    weight: number;
    description?: string | undefined;
}>, z.ZodObject<{
    test: z.ZodLiteral<"task_position_max">;
    value: z.ZodNumber;
    id: z.ZodString;
    /** Points deducted on failure. 0-weight is allowed for advisory checks. */
    weight: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    test: "task_position_max";
    value: number;
    id: string;
    weight: number;
    description?: string | undefined;
}, {
    test: "task_position_max";
    value: number;
    id: string;
    weight: number;
    description?: string | undefined;
}>, z.ZodObject<{
    test: z.ZodEnum<["has_format_directive", "has_length_directive", "has_audience_directive", "has_task_verb"]>;
    id: z.ZodString;
    /** Points deducted on failure. 0-weight is allowed for advisory checks. */
    weight: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    test: "has_format_directive" | "has_length_directive" | "has_audience_directive" | "has_task_verb";
    id: string;
    weight: number;
    description?: string | undefined;
}, {
    test: "has_format_directive" | "has_length_directive" | "has_audience_directive" | "has_task_verb";
    id: string;
    weight: number;
    description?: string | undefined;
}>]>;
export type RubricCheck = z.infer<typeof RubricCheckSchema>;
export type CheckTest = RubricCheck['test'];
export declare const RubricSchema: z.ZodObject<{
    version: z.ZodString;
    /** Category slug — must match a value the classifier emits (CLAUDE.md §6). */
    category: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    /** Pass threshold; defaults to 70 if a rubric omits it (matches JS grader). */
    pass_threshold: z.ZodDefault<z.ZodNumber>;
    checks: z.ZodArray<z.ZodDiscriminatedUnion<"test", [z.ZodObject<{
        test: z.ZodEnum<["regex", "not_regex"]>;
        pattern: z.ZodString;
        id: z.ZodString;
        /** Points deducted on failure. 0-weight is allowed for advisory checks. */
        weight: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        test: "regex" | "not_regex";
        pattern: string;
        id: string;
        weight: number;
        description?: string | undefined;
    }, {
        test: "regex" | "not_regex";
        pattern: string;
        id: string;
        weight: number;
        description?: string | undefined;
    }>, z.ZodObject<{
        test: z.ZodEnum<["regex_count_min", "regex_count_max"]>;
        pattern: z.ZodString;
        /** Match-count threshold. */
        value: z.ZodNumber;
        id: z.ZodString;
        /** Points deducted on failure. 0-weight is allowed for advisory checks. */
        weight: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        test: "regex_count_min" | "regex_count_max";
        value: number;
        pattern: string;
        id: string;
        weight: number;
        description?: string | undefined;
    }, {
        test: "regex_count_min" | "regex_count_max";
        value: number;
        pattern: string;
        id: string;
        weight: number;
        description?: string | undefined;
    }>, z.ZodObject<{
        test: z.ZodEnum<["keyword_any", "keyword_all"]>;
        /** Non-empty list of keywords; case-insensitive substring match. */
        value: z.ZodArray<z.ZodString, "many">;
        id: z.ZodString;
        /** Points deducted on failure. 0-weight is allowed for advisory checks. */
        weight: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        test: "keyword_any" | "keyword_all";
        value: string[];
        id: string;
        weight: number;
        description?: string | undefined;
    }, {
        test: "keyword_any" | "keyword_all";
        value: string[];
        id: string;
        weight: number;
        description?: string | undefined;
    }>, z.ZodObject<{
        test: z.ZodEnum<["length_min", "length_max"]>;
        value: z.ZodNumber;
        id: z.ZodString;
        /** Points deducted on failure. 0-weight is allowed for advisory checks. */
        weight: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        test: "length_min" | "length_max";
        value: number;
        id: string;
        weight: number;
        description?: string | undefined;
    }, {
        test: "length_min" | "length_max";
        value: number;
        id: string;
        weight: number;
        description?: string | undefined;
    }>, z.ZodObject<{
        test: z.ZodLiteral<"task_position_max">;
        value: z.ZodNumber;
        id: z.ZodString;
        /** Points deducted on failure. 0-weight is allowed for advisory checks. */
        weight: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        test: "task_position_max";
        value: number;
        id: string;
        weight: number;
        description?: string | undefined;
    }, {
        test: "task_position_max";
        value: number;
        id: string;
        weight: number;
        description?: string | undefined;
    }>, z.ZodObject<{
        test: z.ZodEnum<["has_format_directive", "has_length_directive", "has_audience_directive", "has_task_verb"]>;
        id: z.ZodString;
        /** Points deducted on failure. 0-weight is allowed for advisory checks. */
        weight: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        test: "has_format_directive" | "has_length_directive" | "has_audience_directive" | "has_task_verb";
        id: string;
        weight: number;
        description?: string | undefined;
    }, {
        test: "has_format_directive" | "has_length_directive" | "has_audience_directive" | "has_task_verb";
        id: string;
        weight: number;
        description?: string | undefined;
    }>]>, "many">;
}, "strict", z.ZodTypeAny, {
    version: string;
    category: string;
    pass_threshold: number;
    checks: ({
        test: "regex" | "not_regex";
        pattern: string;
        id: string;
        weight: number;
        description?: string | undefined;
    } | {
        test: "regex_count_min" | "regex_count_max";
        value: number;
        pattern: string;
        id: string;
        weight: number;
        description?: string | undefined;
    } | {
        test: "keyword_any" | "keyword_all";
        value: string[];
        id: string;
        weight: number;
        description?: string | undefined;
    } | {
        test: "length_min" | "length_max";
        value: number;
        id: string;
        weight: number;
        description?: string | undefined;
    } | {
        test: "task_position_max";
        value: number;
        id: string;
        weight: number;
        description?: string | undefined;
    } | {
        test: "has_format_directive" | "has_length_directive" | "has_audience_directive" | "has_task_verb";
        id: string;
        weight: number;
        description?: string | undefined;
    })[];
    description?: string | undefined;
}, {
    version: string;
    category: string;
    checks: ({
        test: "regex" | "not_regex";
        pattern: string;
        id: string;
        weight: number;
        description?: string | undefined;
    } | {
        test: "regex_count_min" | "regex_count_max";
        value: number;
        pattern: string;
        id: string;
        weight: number;
        description?: string | undefined;
    } | {
        test: "keyword_any" | "keyword_all";
        value: string[];
        id: string;
        weight: number;
        description?: string | undefined;
    } | {
        test: "length_min" | "length_max";
        value: number;
        id: string;
        weight: number;
        description?: string | undefined;
    } | {
        test: "task_position_max";
        value: number;
        id: string;
        weight: number;
        description?: string | undefined;
    } | {
        test: "has_format_directive" | "has_length_directive" | "has_audience_directive" | "has_task_verb";
        id: string;
        weight: number;
        description?: string | undefined;
    })[];
    description?: string | undefined;
    pass_threshold?: number | undefined;
}>;
export type Rubric = z.infer<typeof RubricSchema>;
export interface GradeIssue {
    readonly id: string;
    readonly weight: number;
    readonly description?: string;
}
export interface GradeResult {
    /** 0–100 — `100 - sum(weights of failed checks)`, floored at 0. */
    readonly score: number;
    /** Failed checks in rubric order. */
    readonly issues: readonly GradeIssue[];
    /** `score >= rubric.pass_threshold`. */
    readonly passed: boolean;
    readonly category: string;
    readonly rubric_version: string;
}
//# sourceMappingURL=rubric-schema.d.ts.map