import type { Rubric } from './rubric-schema.js';
/**
 * Load a rubric from disk by category name. Throws if the rubric file is
 * missing or fails Zod validation — callers should always pass a known
 * category from the locked §6 set.
 */
export declare function loadRubric(category: string): Rubric;
/**
 * Test-only override. Lets tests (and ad-hoc scripts) inject a fixture
 * rubric without writing to disk. Pass `null` to remove an override and
 * fall back to disk reads on the next `loadRubric` call.
 */
export declare function setRubric(category: string, rubric: Rubric | null): void;
/** Drop the entire cache. Useful between test files that share a process. */
export declare function _resetRubricCacheForTests(): void;
/** Exposed for diagnostics + tests. The actual directory we'll read from. */
export declare function rubricDir(): string;
//# sourceMappingURL=rubric-loader.d.ts.map