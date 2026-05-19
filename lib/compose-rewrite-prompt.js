// Compose the rewrite system prompt from CLAUDE.md §7.5's 5 layers.
//
// This is the heart of how Amplify earns its keep — what makes our rewrite
// different from "ask Claude to make this better." Every /api/rewrite call
// stitches:
//
//   L1 — Universal rewrite system prompt
//        benchmarks/system-prompts/v1/rewrite.md
//
//   L2 — Category-specific section
//        Already inside rewrite.md (the per-category playbook). Selected
//        at request time by the CATEGORY input the user message carries.
//
//   L3 — Failed-check digest
//        Computed at request time from /api/grade output. Inlined as a
//        <failed_checks> block so the rewriter knows exactly what's broken.
//
//   L4 — Vendor best-practices excerpt
//        benchmarks/best-practices/<target>.md — read at request time.
//        We extract two sections: "Key directives the rewriter should bake
//        in" and "Things to AVOID". The rest of the file is documentation
//        for humans editing the catalogue, not runtime input.
//
//   L5 — Technique suite
//        benchmarks/technique-mapping.json + benchmarks/techniques/<id>.md
//        Lookup is (category, intent, target). Each technique file gets
//        its "Snippet to inject (template)" code block extracted and
//        inlined as part of a <techniques> block.
//
// All five layers are loaded from disk and cached per (file, mtime) — the
// disk reads happen once at boot, then composition is sub-millisecond.
//
// Output is the final composed system prompt as a string. The caller
// (/api/rewrite) passes it to anthropic.js's streamRewrite as the
// `system` arg, replacing the static rewrite.md load that anthropic.js
// used to do on its own.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Resolve benchmarks/ relative to this file: apps/backend/lib → ../../../
const BENCHMARKS_ROOT =
  process.env.AMPLIFY_BENCHMARKS_DIR ??
  path.resolve(__dirname, '..', '..', '..', 'benchmarks')

const PROMPTS_VERSION = process.env.AMPLIFY_PROMPTS_VERSION || 'v1'

// ── File-content cache, keyed by (path, mtime) ───────────────────────────────
// Vercel functions cold-start fresh; per-instance caching is the right level.
// We invalidate when mtime changes so a hot-reload during dev doesn't serve
// stale layer content.

/** @type {Map<string, { mtimeMs: number, text: string }>} */
const fileCache = new Map()

/**
 * Read a file with mtime-aware cache. Throws if the file is missing.
 *
 * @param {string} absPath
 * @returns {string}
 */
function readWithCache(absPath) {
  const stat = fs.statSync(absPath)
  const cached = fileCache.get(absPath)
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.text
  const text = fs.readFileSync(absPath, 'utf8')
  fileCache.set(absPath, { mtimeMs: stat.mtimeMs, text })
  return text
}

// ── Markdown section + code-block extraction ─────────────────────────────────
//
// Tiny, deliberate parser — no `marked`/`remark` dep. We only support the
// shapes the layer files actually use:
//   - "## Heading"  → section delimiter
//   - "```...```"   → fenced code block
// Anything more elaborate (nested headings, frontmatter) is not part of the
// contract; the layer files are written by us, not by users.

/**
 * Extract the body of a `## <heading>` section. Returns null if no such
 * heading exists. The body excludes the heading line itself and stops at
 * the next `## ` heading (or EOF).
 *
 * @param {string} markdown
 * @param {string} headingPrefix  Match by `startsWith` so "Key directives"
 *                                catches "Key directives the rewriter…".
 * @returns {string | null}
 */
export function extractSection(markdown, headingPrefix) {
  const lines = markdown.split('\n')
  let inSection = false
  /** @type {string[]} */
  const collected = []
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (inSection) break // hit the next section — stop
      const title = line.slice(3).trim()
      if (title.startsWith(headingPrefix)) {
        inSection = true
        continue
      }
    }
    if (inSection) collected.push(line)
  }
  if (!inSection) return null
  // Trim leading/trailing whitespace lines but keep internal blank lines.
  return collected.join('\n').replace(/^\s*\n/, '').replace(/\s+$/, '')
}

/**
 * Extract the contents of the FIRST fenced code block in `markdown`. The
 * fence may be ``` or any longer run; we strip the open + close fences
 * including their leading info-string.
 *
 * @param {string} markdown
 * @returns {string | null}
 */
export function extractFirstCodeBlock(markdown) {
  const re = /```[^\n]*\n([\s\S]*?)```/
  const m = markdown.match(re)
  return m ? m[1].replace(/\s+$/, '') : null
}

// ── Layer L4: vendor best-practices excerpt ──────────────────────────────────

/**
 * Load the best-practices excerpt for `target`. Returns the formatted
 * snippet ready to inline as <target_best_practices>. Returns an empty
 * string if the file is missing — that's a soft failure: the rewriter
 * still works, just without vendor-specific guidance.
 *
 * @param {string} target  e.g. 'anthropic', 'openai', 'google'
 * @returns {string}
 */
export function loadBestPracticesExcerpt(target) {
  const file = path.join(BENCHMARKS_ROOT, 'best-practices', `${target}.md`)
  if (!fs.existsSync(file)) return ''

  const md = readWithCache(file)
  const directives = extractSection(md, 'Key directives')
  const avoid = extractSection(md, 'Things to AVOID')

  // Strip TODO placeholders so they don't pollute the system prompt sent
  // to the model. A best-practices file with only `_TODO_` body is not
  // useful — return empty rather than feed the model a literal "TODO".
  const cleanDirectives = stripTodos(directives ?? '')
  const cleanAvoid = stripTodos(avoid ?? '')

  if (!cleanDirectives && !cleanAvoid) return ''

  return [
    cleanDirectives ? `Key directives:\n${cleanDirectives}` : '',
    cleanAvoid ? `Avoid:\n${cleanAvoid}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Drop lines that are nothing but TODO placeholders (`_TODO_`, `TODO`,
 * `_TODO — fill from official docs._`, etc.). We keep this conservative:
 * only drop a line if it's *predominantly* a TODO, not just contains the
 * substring. Otherwise legitimate sentences mentioning "TODO" survive.
 *
 * @param {string} text
 * @returns {string}
 */
function stripTodos(text) {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed) return true // keep blank lines
      // Lines that are mostly a TODO marker — italics or plain.
      if (/^_?TODO[\s_—-]/.test(trimmed)) return false
      if (/^_TODO_?\.?$/.test(trimmed)) return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // collapse runs of blank lines
    .trim()
}

// ── Layer L5: technique suite ────────────────────────────────────────────────

/**
 * @typedef {Object} TechniqueRule
 * @property {string} category
 * @property {string} intent
 * @property {string} target
 * @property {string[]} techniques
 */

/**
 * @typedef {Object} TechniqueMapping
 * @property {string[]} default_techniques_when_no_match
 * @property {TechniqueRule[]} rules
 */

/** @type {TechniqueMapping | null} */
let mappingCache = null
let mappingCacheMtime = 0

/**
 * Load and cache benchmarks/technique-mapping.json.
 *
 * @returns {TechniqueMapping}
 */
function loadMapping() {
  const file = path.join(BENCHMARKS_ROOT, 'technique-mapping.json')
  const stat = fs.statSync(file)
  if (mappingCache && stat.mtimeMs === mappingCacheMtime) return mappingCache
  const raw = fs.readFileSync(file, 'utf8')
  mappingCache = /** @type {TechniqueMapping} */ (JSON.parse(raw))
  mappingCacheMtime = stat.mtimeMs
  return mappingCache
}

/**
 * Pick technique IDs for the (category, intent, target) tuple. The matrix
 * supports wildcards on `intent` and `target` (`*`). Specific matches
 * stack with default-lane matches; we de-dupe at the end.
 *
 * Matching policy (mirrors the JSON's "specificity" intent):
 *   1. Collect every rule whose category equals the request's category.
 *   2. From those, prefer the most specific intent match, then the most
 *      specific target match. "Most specific" = exact > wildcard.
 *   3. Concatenate technique IDs from the winning rule(s), de-duped, in
 *      declaration order.
 *
 * If no rule for the category matches at all, return
 * `default_techniques_when_no_match` from the top-level mapping.
 *
 * @param {{ category: string, intent: string, target: string }} req
 * @returns {string[]}
 */
export function selectTechniques(req) {
  const mapping = loadMapping()
  const categoryRules = mapping.rules.filter((r) => r.category === req.category)
  if (categoryRules.length === 0) {
    return [...mapping.default_techniques_when_no_match]
  }

  // Score each rule by specificity. Higher score = better match.
  const scored = categoryRules
    .map((rule) => {
      let score = 0
      // Intent: exact > wildcard.
      if (rule.intent === req.intent) score += 4
      else if (rule.intent === '*') score += 1
      else return null // intent mismatch — discard
      // Target: exact > wildcard.
      if (rule.target === req.target) score += 2
      else if (rule.target === '*') score += 1
      else return null // target mismatch — discard
      return { rule, score }
    })
    .filter(/** @type {(x: any) => x is {rule: TechniqueRule, score: number}} */ (Boolean))

  if (scored.length === 0) {
    // Category matched but no intent/target combo did — fall back to
    // category default (intent=*, target=*).
    const def = categoryRules.find((r) => r.intent === '*' && r.target === '*')
    return def ? [...def.techniques] : [...mapping.default_techniques_when_no_match]
  }

  // Sort by score desc; collect from the top score band only — otherwise
  // lower-specificity rules would silently double up on the more specific
  // ones. (Within the band, declaration order is preserved.)
  scored.sort((a, b) => b.score - a.score)
  const topScore = scored[0].score
  const winners = scored.filter((s) => s.score === topScore).map((s) => s.rule)

  /** @type {string[]} */
  const ids = []
  const seen = new Set()
  for (const rule of winners) {
    for (const id of rule.techniques) {
      if (seen.has(id)) continue
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

/**
 * Read the technique file and return its "Snippet to inject" code block.
 * Returns empty string if the file or the snippet section is missing.
 *
 * @param {string} techniqueId
 * @returns {string}
 */
export function loadTechniqueSnippet(techniqueId) {
  const file = path.join(BENCHMARKS_ROOT, 'techniques', `${techniqueId}.md`)
  if (!fs.existsSync(file)) return ''

  const md = readWithCache(file)
  const section = extractSection(md, 'Snippet to inject')
  if (!section) return ''
  const code = extractFirstCodeBlock(section)
  return (code ?? '').trim()
}

// ── L3 helper: format the failed-check digest ────────────────────────────────

/**
 * @typedef {Object} GradeIssueLite
 * @property {string} id
 * @property {number} weight
 * @property {string=} description
 */

/**
 * Format the grader's failed checks into a compact, model-friendly digest.
 *
 * @param {readonly GradeIssueLite[]} issues
 * @returns {string}
 */
export function formatFailedChecks(issues) {
  if (!issues || issues.length === 0) return ''
  const lines = issues.map((i) => {
    const desc = i.description ? ` — ${i.description}` : ''
    return `- ${i.id} (weight ${i.weight})${desc}`
  })
  return lines.join('\n')
}

// ── L1+L2: universal rewrite system prompt ───────────────────────────────────
//
// L2 is *inside* L1 (rewrite.md has a per-category section), so they're
// loaded as one file. The category dispatch happens via the user message
// envelope (CATEGORY: ... line), which the prompt's playbook section
// switches on internally.

/**
 * Load the universal rewrite system prompt (L1 + L2). Cached per version.
 *
 * @returns {string}
 */
export function loadUniversalSystemPrompt() {
  const file = path.join(
    BENCHMARKS_ROOT,
    'system-prompts',
    PROMPTS_VERSION,
    'rewrite.md',
  )
  if (!fs.existsSync(file)) {
    throw new Error(`Universal rewrite system prompt missing: ${file}`)
  }
  return readWithCache(file)
}

// ── Public API: compose() ────────────────────────────────────────────────────

/**
 * @typedef {Object} ComposeInput
 * @property {string} category   One of CATEGORIES from ./categories.js
 * @property {string} intent     Free-text from the classifier; '*' if absent
 * @property {string} target     'anthropic' | 'openai' | 'google' | ...
 * @property {readonly GradeIssueLite[]=} failed_checks  L3 input
 */

/**
 * @typedef {Object} ComposeResult
 * @property {string} system_prompt        The final composed prompt
 * @property {string[]} applied_techniques The technique IDs that were inlined
 * @property {boolean} had_best_practices  Whether L4 contributed content
 */

/**
 * Compose the full rewrite system prompt from all 5 layers.
 *
 * @param {ComposeInput} input
 * @returns {ComposeResult}
 */
export function composeRewriteSystemPrompt(input) {
  const universal = loadUniversalSystemPrompt() // L1 + L2

  const failedChecksBlock = formatFailedChecks(input.failed_checks ?? []) // L3
  const bestPractices = loadBestPracticesExcerpt(input.target) // L4

  const techniqueIds = selectTechniques({
    category: input.category,
    intent: input.intent || '*',
    target: input.target,
  })
  const techniqueSnippets = techniqueIds
    .map((id) => ({ id, snippet: loadTechniqueSnippet(id) }))
    .filter((t) => t.snippet.length > 0)

  // Stitch together. Each layer is wrapped in a labelled XML-ish block
  // so the model can attend to them independently — see CLAUDE.md §7.5
  // and benchmarks/techniques/xml-tag-scaffolding.md.

  /** @type {string[]} */
  const blocks = [universal]

  if (failedChecksBlock) {
    blocks.push(
      [
        '',
        '<failed_checks>',
        'The original prompt failed these grader checks. Fix them in the rewrite:',
        failedChecksBlock,
        '</failed_checks>',
      ].join('\n'),
    )
  }

  if (bestPractices) {
    blocks.push(
      [
        '',
        `<target_best_practices target="${input.target}">`,
        bestPractices,
        '</target_best_practices>',
      ].join('\n'),
    )
  }

  if (techniqueSnippets.length > 0) {
    const inner = techniqueSnippets
      .map(
        (t) =>
          [
            `<technique id="${t.id}">`,
            t.snippet,
            '</technique>',
          ].join('\n'),
      )
      .join('\n\n')
    blocks.push(['', '<techniques>', inner, '</techniques>'].join('\n'))
  }

  return {
    system_prompt: blocks.join('\n'),
    applied_techniques: techniqueSnippets.map((t) => t.id),
    had_best_practices: bestPractices.length > 0,
  }
}

// Exposed for tests + diagnostics.
export const _internals = Object.freeze({
  BENCHMARKS_ROOT,
  PROMPTS_VERSION,
  extractSection,
  extractFirstCodeBlock,
  selectTechniques,
  loadTechniqueSnippet,
  loadBestPracticesExcerpt,
  formatFailedChecks,
  loadUniversalSystemPrompt,
  stripTodos,
})
