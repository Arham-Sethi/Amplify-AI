// POST /api/grade
//
// Body: { prompt: string, category: string }
// Returns: { success, request_id, grade, latency_ms }
//
// grade = { score, issues, passed, category, rubric_version }
//
// Deterministic rule-based grader. No LLM call; sub-50ms typical. Rate
// limit is generous (120/hr per user) since the work is local.

import { gradePrompt } from '../lib/grader/index.js'

import { CATEGORY_SET, isCategory } from '../lib/categories.js'
import { logPromptEvent } from '../lib/log-prompt.js'
import { getAuthedUser, newRequestId } from '../lib/request-helpers.js'
import { checkRateLimitByKey } from '../lib/validate.js'
import { assertAllowedOrigin } from './_lib/origin.js'

const MIN_PROMPT_LEN = 1
const MAX_PROMPT_LEN = 20000

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  if (!assertAllowedOrigin(req, res)) return

  const authed = await getAuthedUser(req)
  if (!authed) {
    return res.status(401).json({ success: false, error: 'Not signed in.' })
  }

  if (!checkRateLimitByKey(`grade:${authed.id}`, 120, 60 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many requests.' })
  }

  /** @type {{ prompt?: unknown, category?: unknown }} */
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const prompt = typeof body.prompt === 'string' ? body.prompt : ''
  const category = body.category

  if (prompt.length < MIN_PROMPT_LEN || prompt.length > MAX_PROMPT_LEN) {
    return res.status(400).json({
      success: false,
      error: `Prompt must be ${MIN_PROMPT_LEN}–${MAX_PROMPT_LEN} characters.`,
    })
  }
  if (!isCategory(category)) {
    return res.status(400).json({
      success: false,
      error: `Unknown category: ${category}. Expected one of: ${[...CATEGORY_SET].join(', ')}.`,
    })
  }

  const requestId = newRequestId()
  const startedAt = Date.now()

  try {
    // gradePrompt loads the rubric (with cache) and runs all checks.
    // Synchronous + sub-millisecond — no need to await anything.
    const grade = gradePrompt(prompt, category)
    const latency_ms = Date.now() - startedAt

    logPromptEvent({
      user_id: authed.id,
      request_id: requestId,
      kind: 'grade',
      category,
      score_before: grade.score,
      latency_ms,
      prompt,
    })

    return res.status(200).json({
      success: true,
      request_id: requestId,
      grade,
      latency_ms,
    })
  } catch (err) {
    const latency_ms = Date.now() - startedAt
    // eslint-disable-next-line no-console -- intentional: surfaces grader load failures.
    console.error('Grade error:', err)

    logPromptEvent({
      user_id: authed.id,
      request_id: requestId,
      kind: 'grade',
      category,
      latency_ms,
      prompt,
      error: err?.message || 'unknown',
    })

    return res.status(500).json({ success: false, error: 'Grading failed.' })
  }
}
