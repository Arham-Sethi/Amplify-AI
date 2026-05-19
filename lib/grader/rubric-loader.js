// Rubric loader — disk read + per-category cache + test-only override.
//
// Resolution order:
//   1. In-memory cache (set via `setRubric` for tests, populated on first
//      `loadRubric` call in production).
//   2. `<rubricDir>/<category>.json` parsed through Zod.
//
// `rubricDir` defaults to:
//   - `process.env.AMPLIFY_RUBRIC_DIR` if set (escape hatch for tests +
//     scripts that point at a fixture directory),
//   - otherwise the canonical `<repo-root>/benchmarks/rubrics/`, resolved
//     by walking up from this file's location: packages/grader/src/ →
//     packages/grader/ → packages/ → <root>/. Five levels up assuming
//     this file lives at packages/grader/dist/rubric-loader.js when built;
//     four levels for the unbuilt src/ layout. We probe both and pick
//     whichever exists.
//
// The cache is per-process (Map). Vercel functions cold-start fresh, which
// is fine — rubric files are small (a few KB each) and loading them is
// sub-millisecond.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RubricSchema } from './rubric-schema.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cache = new Map();
/**
 * Resolve the rubric directory once at module load. Honours
 * `AMPLIFY_RUBRIC_DIR` (test override) and falls back to the canonical
 * location relative to this package.
 */
function resolveRubricDir() {
    if (process.env.AMPLIFY_RUBRIC_DIR) {
        return process.env.AMPLIFY_RUBRIC_DIR;
    }
    // packages/grader/src/rubric-loader.ts → up 3 levels = repo root.
    // (When this file is compiled to packages/grader/dist/, the import.meta.url
    // points there instead, but the relative ../.. chain still resolves to
    // repo root because dist/ is a sibling of src/.)
    return path.resolve(__dirname, '..', '..', 'benchmarks', 'rubrics');
}
const RUBRIC_DIR = resolveRubricDir();
/**
 * Load a rubric from disk by category name. Throws if the rubric file is
 * missing or fails Zod validation — callers should always pass a known
 * category from the locked §6 set.
 */
export function loadRubric(category) {
    const cached = cache.get(category);
    if (cached)
        return cached;
    const file = path.join(RUBRIC_DIR, `${category}.json`);
    if (!fs.existsSync(file)) {
        throw new Error(`No rubric found for category "${category}" at ${file}`);
    }
    const raw = fs.readFileSync(file, 'utf8');
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (err) {
        throw new Error(`Rubric "${category}" at ${file} is not valid JSON: ${err.message}`);
    }
    const validated = RubricSchema.parse(parsed);
    cache.set(category, validated);
    return validated;
}
/**
 * Test-only override. Lets tests (and ad-hoc scripts) inject a fixture
 * rubric without writing to disk. Pass `null` to remove an override and
 * fall back to disk reads on the next `loadRubric` call.
 */
export function setRubric(category, rubric) {
    if (rubric === null) {
        cache.delete(category);
        return;
    }
    // Validate even injected fixtures — catches test bugs early.
    cache.set(category, RubricSchema.parse(rubric));
}
/** Drop the entire cache. Useful between test files that share a process. */
export function _resetRubricCacheForTests() {
    cache.clear();
}
/** Exposed for diagnostics + tests. The actual directory we'll read from. */
export function rubricDir() {
    return RUBRIC_DIR;
}
//# sourceMappingURL=rubric-loader.js.map