// POST /api/classify
//
// Body: { prompt: string }
// Returns: { success, request_id, classification, latency_ms }
//
// Classification = { category, intent, is_vague, confidence }.
//
// Rate limit: 60/hr per user. Cheap call (Haiku, ~200 tokens) so the
// limit can be looser than rewrite, but still bounded so a misbehaving
// extension doesn't burn through quota.

import { classifyPrompt, _internals as anthropicInternals } from '../lib/anthropic.js'
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

  if (!checkRateLimitByKey(`classify:${authed.id}`, 60, 60 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many requests.' })
  }

  /** @type {{ prompt?: unknown }} */
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const prompt = typeof body.prompt === 'string' ? body.prompt : ''
  if (prompt.length < MIN_PROMPT_LEN || prompt.length > MAX_PROMPT_LEN) {
    return res.status(400).json({
      success: false,
      error: `Prompt must be ${MIN_PROMPT_LEN}–${MAX_PROMPT_LEN} characters.`,
    })
  }

  const requestId = newRequestId()
  const startedAt = Date.now()

  try {
    const classification = await classifyPrompt(prompt)
    const latency_ms = Date.now() - startedAt

    logPromptEvent({
      user_id: authed.id,
      request_id: requestId,
      kind: 'classify',
      category: classification.category,
      is_vague: classification.is_vague,
      model: anthropicInternals.CLASSIFY_MODEL,
      latency_ms,
      prompt,
    })

    return res.status(200).json({
      success: true,
      request_id: requestId,
      classification,
      latency_ms,
    })
  } catch (err) {
    const latency_ms = Date.now() - startedAt
    // eslint-disable-next-line no-console -- intentional: surfaces classifier failures.
    console.error('Classify error:', err)

    logPromptEvent({
      user_id: authed.id,
      request_id: requestId,
      kind: 'classify',
      model: anthropicInternals.CLASSIFY_MODEL,
      latency_ms,
      prompt,
      error: err?.message || 'unknown',
    })

    return res.status(500).json({ success: false, error: 'Classification failed.' })
  }
}
