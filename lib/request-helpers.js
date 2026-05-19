// Shared request-handling helpers used by every /api/* endpoint.
//
// Previously inlined in classify.js, grade.js, rewrite.js, compress.js —
// extracted here so a fix to (e.g.) the Bearer-token regex propagates to
// every endpoint at once instead of getting fixed in 3 of 4 places.

import { supabase } from './supabase.js'

/**
 * @typedef {{ id: string, email?: string }} AuthedUser
 */

/**
 * Verify a `Authorization: Bearer <jwt>` header against Supabase Auth.
 * Returns the user on success, null on any failure (missing header, bad
 * token, network blip). The handler should treat null as 401.
 *
 * @param {{ headers: Record<string, string | string[] | undefined> }} req
 * @returns {Promise<AuthedUser | null>}
 */
export async function getAuthedUser(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization']
  if (!authHeader || typeof authHeader !== 'string') return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) return null
  const token = match[1].trim()
  if (!token) return null
  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return null
    return /** @type {AuthedUser} */ (data.user)
  } catch (err) {
    // eslint-disable-next-line no-console -- intentional: surfaces auth flakiness in dev logs.
    console.error('Token verification failed:', err)
    return null
  }
}

/**
 * Generate a per-request id used for log correlation. Format is opaque to
 * clients — they get it back in the response and quote it when reporting
 * issues so we can grep prompt_history.
 *
 * @returns {string}
 */
export function newRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
