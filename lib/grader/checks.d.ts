import type { RubricCheck } from './rubric-schema.js';
/**
 * Run a single check against the prompt. Pure function, no side effects
 * (the unknown-test-type warning is a console.warn — see comment there).
 */
export declare function runCheck(prompt: string, check: RubricCheck): boolean;
//# sourceMappingURL=checks.d.ts.map