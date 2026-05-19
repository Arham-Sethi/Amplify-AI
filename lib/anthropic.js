// lib/anthropic.js
//
// Thin wrapper around @anthropic-ai/sdk. Two operations:
//
//   classifyPrompt(prompt) → { category, intent, is_vague, confidence }
//     Single non-streaming Haiku call. Strict JSON-only system prompt.
//
//   streamRewrite({ prompt, category, intent, intensity, target_llm,
//                   tone, work_context })
//     Async iterator over text deltas from Sonnet. The caller pumps the
//     deltas to the SSE response.
//
// Design notes:
//
//  - Lazy client: we don't construct `new Anthropic()` at import time.
//    The serverless module loader runs on cold start, but env vars may
//    not be hydrated until the first request. Lazy init also means
//    `node scripts/test-grader.js` can import this file without needing
//    ANTHROPIC_API_KEY set.
//
//  - System prompts are loaded from disk and cached per (kind, version).
//    Versions live under benchmarks/system-prompts/<v>/. The version is
//    env-configurable via AMPLIFY_PROMPTS_VERSION so we can roll a new
//    prompt without redeploying code.
//
//  - Models are env-configurable too — keep the name out of code so the
//    Sonnet/Haiku knob is a config change, not a deploy.
//
//  - Temperature is intensity-driven for rewrite (gentle = colder,
//    aggressive = warmer) and pinned at 0 for classify so we get
//    deterministic JSON.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

import { CATEGORY_SET } from './categories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// apps/backend/lib/anthropic.js → up 3 levels to workspace root, then
// benchmarks/system-prompts. Override via AMPLIFY_SYSTEM_PROMPTS_DIR
// (mirrors the grader's AMPLIFY_RUBRIC_DIR convention).
const PROMPTS_ROOT =
  process.env.AMPLIFY_SYSTEM_PROMPTS_DIR ??
  path.resolve(__dirname, '..', 'benchmarks', 'system-prompts');

const PROMPTS_VERSION = process.env.AMPLIFY_PROMPTS_VERSION || 'v1';
const CLASSIFY_MODEL = process.env.AMPLIFY_CLASSIFY_MODEL || 'claude-haiku-4-5';
const REWRITE_MODEL  = process.env.AMPLIFY_REWRITE_MODEL  || 'claude-sonnet-4-5';

/**
 * Intensity → temperature. Gentle is near-deterministic; aggressive lets
 * the model take more liberties when restructuring.
 */
const INTENSITY_TEMPERATURE = Object.freeze({
  gentle: 0.15,
  medium: 0.3,
  aggressive: 0.5,
});

/** @type {Anthropic | null} */
let client = null;

/**
 * Lazy-init the Anthropic client. Does not throw at module load, so the
 * grader can run in environments without ANTHROPIC_API_KEY.
 *
 * @returns {Anthropic}
 */
function getClient() {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  client = new Anthropic({ apiKey });
  return client;
}

/** @type {Map<string, string>} */
const promptCache = new Map();

/**
 * Read and cache a system prompt from disk.
 *
 * @param {'classify' | 'rewrite'} kind
 * @returns {string}
 */
function loadSystemPrompt(kind) {
  const cacheKey = `${PROMPTS_VERSION}:${kind}`;
  const cached = promptCache.get(cacheKey);
  if (cached) return cached;

  const file = path.join(PROMPTS_ROOT, PROMPTS_VERSION, `${kind}.md`);
  if (!fs.existsSync(file)) {
    throw new Error(`System prompt not found: ${file}`);
  }
  const text = fs.readFileSync(file, 'utf8');
  promptCache.set(cacheKey, text);
  return text;
}

/**
 * @typedef {import('./categories.js').Category} Category
 *
 * @typedef {Object} Classification
 * @property {Category} category
 * @property {string}  intent
 * @property {boolean} is_vague
 * @property {number}  confidence
 */

/**
 * Parse and validate the classifier's JSON response. Falls back to a
 * conservative default rather than throwing — a bad classification
 * shouldn't 500 the API.
 *
 * @param {string} raw
 * @returns {Classification}
 */
function parseClassification(raw) {
  /** @type {Classification} */
  const fallback = {
    category: 'task_only',
    intent: '',
    is_vague: true,
    confidence: 0.2,
  };

  try {
    const trimmed = raw.trim();
    // Defensive: peel a fence if the model added one despite instructions.
    const unfenced = trimmed.startsWith('```')
      ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
      : trimmed;
    const parsed = JSON.parse(unfenced);

    const category = CATEGORY_SET.has(parsed.category)
      ? parsed.category
      : fallback.category;
    const intent = typeof parsed.intent === 'string'
      ? parsed.intent.slice(0, 120)
      : fallback.intent;
    const is_vague = typeof parsed.is_vague === 'boolean'
      ? parsed.is_vague
      : fallback.is_vague;
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : fallback.confidence;

    return { category, intent, is_vague, confidence };
  } catch {
    return fallback;
  }
}

/**
 * Classify a prompt. Single Haiku call; deterministic (temp 0); JSON-only.
 *
 * @param {string} prompt
 * @returns {Promise<Classification>}
 */
export async function classifyPrompt(prompt) {
  const c = getClient();
  const system = loadSystemPrompt('classify');

  const response = await c.messages.create({
    model: CLASSIFY_MODEL,
    max_tokens: 200,
    temperature: 0,
    system,
    messages: [{ role: 'user', content: prompt }],
  });

  // The SDK returns a content array of blocks; we only ever expect text.
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => /** @type {{ type: 'text', text: string }} */ (b).text)
    .join('');

  return parseClassification(text);
}

/**
 * @typedef {Object} RewriteRequest
 * @property {string} prompt
 * @property {string} category
 * @property {string} intent
 * @property {'gentle'|'medium'|'aggressive'} intensity
 * @property {string} target_llm
 * @property {string} tone
 * @property {string=} work_context
 */

/**
 * Build the user-message envelope the rewrite system prompt expects. See
 * benchmarks/system-prompts/v1/rewrite.md for the contract.
 *
 * @param {RewriteRequest} req
 * @returns {string}
 */
function buildRewriteUserMessage(req) {
  return [
    `CATEGORY: ${req.category}`,
    `INTENT: ${req.intent}`,
    `INTENSITY: ${req.intensity}`,
    `TARGET_LLM: ${req.target_llm}`,
    `TONE: ${req.tone}`,
    `WORK_CONTEXT: ${req.work_context || ''}`,
    '',
    'PROMPT:',
    req.prompt,
  ].join('\n');
}

/**
 * Stream a rewrite. Returns an async iterable of text deltas — the
 * caller is responsible for pumping each delta to the SSE response and
 * closing the stream when done.
 *
 * `system` is REQUIRED and is the already-composed system prompt
 * (typically the output of `composeRewriteSystemPrompt`). Loading the
 * static rewrite.md from this module is intentionally NOT supported any
 * more — the composer is the single entry point so all 5 layers from
 * CLAUDE.md §7.5 are always honoured. Callers that just want the
 * universal-only prompt can do `loadUniversalSystemPrompt()` themselves.
 *
 * @param {RewriteRequest & { system: string }} req
 * @returns {AsyncIterable<string>}
 */
export async function* streamRewrite(req) {
  if (!req.system || typeof req.system !== 'string') {
    throw new Error('streamRewrite: `system` is required (use composeRewriteSystemPrompt).');
  }
  const c = getClient();
  const system = req.system;
  const temperature = INTENSITY_TEMPERATURE[req.intensity] ?? INTENSITY_TEMPERATURE.medium;

  // The SDK's `.stream()` returns an EventEmitter-ish object. We iterate
  // its async iterator, which yields events of various types.
  const stream = c.messages.stream({
    model: REWRITE_MODEL,
    max_tokens: 4096,
    temperature,
    system,
    messages: [
      { role: 'user', content: buildRewriteUserMessage(req) },
    ],
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta &&
      event.delta.type === 'text_delta' &&
      typeof event.delta.text === 'string'
    ) {
      yield event.delta.text;
    }
  }
}

// Exposed for tests / introspection.
export const _internals = Object.freeze({
  PROMPTS_VERSION,
  CLASSIFY_MODEL,
  REWRITE_MODEL,
  INTENSITY_TEMPERATURE,
  parseClassification,
  buildRewriteUserMessage,
});
