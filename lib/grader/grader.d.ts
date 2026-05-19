import type { GradeResult, Rubric } from './rubric-schema.js';
/**
 * Grade a prompt against a category's rubric. Loads the rubric from disk
 * (cached) and dispatches to {@link gradeWithRubric}.
 */
export declare function gradePrompt(prompt: string, category: string): GradeResult;
/**
 * Grade against an explicit rubric — used by tests that inject fixtures
 * and by callers (e.g., the `/api/grade` endpoint) that already loaded
 * the rubric and want to pass it in directly.
 */
export declare function gradeWithRubric(prompt: string, rubric: Rubric): GradeResult;
//# sourceMappingURL=grader.d.ts.map