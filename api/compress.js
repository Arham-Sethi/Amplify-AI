// POST /api/compress
//
// Body: { prompt: string, target_tokens?: number }
// Returns: {
//   success, request_id,
//   compression: {
//     prompt: string,                   // possibly compressed prompt
//     strategy: 'noop' | 'ucs-artifact', // which strategy was applied
//     tokens_before: number,            // estimated input tokens
//     tokens_after: number,             // estimated output tokens
//     ratio: number,                    // tokens_after / tokens_before
//   },
//   latency_ms,
// }
//
// v1 strategy:
//   - If the prompt fits comfortably under target (default 4000 tokens),
//     return it unchanged with strategy='noop'.
//   - Otherwise, wrap it as a single Artifact and run @amplify/ucs's
//     CompressionPipeline. The pipeline truncates artifact content rather
//     than dropping it (decisions/tasks/global summaries — none of which
//     we have for a raw prompt — would never be dropped). Returns the
//     truncated artifact's content with strategy='ucs-artifact'.
//
// The response shape is forward-compatible. When we extend this endpoint
// to accept already-structured UCS input (entities + summaries + tasks)
// from a desktop client that has done its own pre-extraction, the
// strategy enum gains a value but the rest of the wire format doesn't
// change.

import { CompressionPipeline, estimateTokens } from '../lib/ucs/index.js'

import { logPromptEvent } from '../lib/log-prompt.js'
import { getAuthedUser, newRequestId } from '../lib/request-helpers.js'
import { checkRateLimitByKey } from '../lib/validate.js'
import { assertAllowedOrigin } from './_lib/origin.js'

const MIN_PROMPT_LEN = 1
const MAX_PROMPT_LEN = 200000 // compress is the only endpoint that gets long inputs
const DEFAULT_TARGET_TOKENS = 4000
const MIN_TARGET_TOKENS = 100
const MAX_TARGET_TOKENS = 100_000

// Stable UUID for the synthetic "wrap a raw prompt as a single artifact"
// path. The UCS compressor doesn't care what the artifact's id is, but
// it does require a v4-shaped UUID. Using a constant means the result is
// deterministic for any given input — easier to test.
const SYNTHETIC_ARTIFACT_ID = '00000000-0000-4000-8000-000000000001'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  if (!assertAllowedOrigin(req, res)) return

  const authed = await getAuthedUser(req)
  if (!authed) {
    return res.status(401).json({ success: false, error: 'Not signed in.' })
  }

  if (!checkRateLimitByKey(`compress:${authed.id}`, 60, 60 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many requests.' })
  }

  /** @type {{ prompt?: unknown, target_tokens?: unknown }} */
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const prompt = typeof body.prompt === 'string' ? body.prompt : ''
  const requestedTarget = typeof body.target_tokens === 'number' ? body.target_tokens : null

  if (prompt.length < MIN_PROMPT_LEN || prompt.length > MAX_PROMPT_LEN) {
    return res.status(400).json({
      success: false,
      error: `Prompt must be ${MIN_PROMPT_LEN}–${MAX_PROMPT_LEN} characters.`,
    })
  }
  if (
    requestedTarget !== null &&
    (requestedTarget < MIN_TARGET_TOKENS || requestedTarget > MAX_TARGET_TOKENS)
  ) {
    return res.status(400).json({
      success: false,
      error: `target_tokens must be between ${MIN_TARGET_TOKENS} and ${MAX_TARGET_TOKENS}.`,
    })
  }

  const targetTokens = requestedTarget ?? DEFAULT_TARGET_TOKENS
  const requestId = newRequestId()
  const startedAt = Date.now()

  const tokensBefore = estimateTokens(prompt)

  // Short-circuit: under budget → noop. Avoids the artifact-wrap overhead
  // for the common case where compression isn't needed.
  if (tokensBefore <= targetTokens) {
    const latency_ms = Date.now() - startedAt
    const compression = {
      prompt,
      strategy: 'noop',
      tokens_before: tokensBefore,
      tokens_after: tokensBefore,
      ratio: 1,
    }
    logPromptEvent({
      user_id: authed.id,
      request_id: requestId,
      kind: 'compress',
      latency_ms,
      prompt,
    })
    return res.status(200).json({
      success: true,
      request_id: requestId,
      compression,
      latency_ms,
    })
  }

  // Over budget — run the UCS artifact-truncation path.
  const pipeline = new CompressionPipeline({
    target_tokens: targetTokens,
    // Per-artifact ceiling: leave headroom under the total target so the
    // truncated artifact alone doesn't blow the budget.
    artifact_max_tokens: Math.floor(targetTokens * 0.9),
  })

  const result = pipeline.compress({
    artifacts: [
      {
        id: SYNTHETIC_ARTIFACT_ID,
        type: 'document',
        language: '',
        content: prompt,
        title: '',
        metadata: {},
      },
    ],
  })

  const compressedPrompt = result.artifacts[0]?.content ?? prompt
  const tokensAfter = estimateTokens(compressedPrompt)
  const latency_ms = Date.now() - startedAt

  const compression = {
    prompt: compressedPrompt,
    strategy: 'ucs-artifact',
    tokens_before: tokensBefore,
    tokens_after: tokensAfter,
    ratio: tokensBefore > 0 ? Math.round((tokensAfter / tokensBefore) * 10_000) / 10_000 : 1,
  }

  logPromptEvent({
    user_id: authed.id,
    request_id: requestId,
    kind: 'compress',
    latency_ms,
    prompt,
  })

  return res.status(200).json({
    success: true,
    request_id: requestId,
    compression,
    latency_ms,
  })
}
