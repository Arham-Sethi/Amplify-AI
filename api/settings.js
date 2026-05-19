// GET /api/settings
//
// Returns the authenticated user's row from public.user_settings. The
// extension calls this once at startup so the popup can default to the
// user's preferred intensity (instead of always 'medium'), and so that
// any field the user set via /onboarding.html flows back into rewrite
// requests without a round trip through the client.
//
// Why a dedicated endpoint instead of "the extension queries Supabase
// directly":
//   - The extension would need the SUPABASE_URL + anon key embedded.
//     Today only the JWT is embedded; nothing else.
//   - Centralising auth + rate-limiting in /api keeps the surface tight.
//   - Future fields (notification preferences, telemetry consent, etc.)
//     can be served from the same endpoint without changing the
//     extension's transport.
//
// Returns:
//   { success: true, request_id, settings }   — settings may be `null`
//   { success: false, error }                 — auth / rate limit / DB
//
// settings is the same UserSettings shape lib/user-settings.js returns:
//   { target_llm, tone, work_context, token_budget, default_intensity }
//
// Rate-limited generously since this is read-only and read-mostly: at
// most a handful of calls per session per user.

import { logPromptEvent } from '../lib/log-prompt.js'
import { getAuthedUser, newRequestId } from '../lib/request-helpers.js'
import { loadUserSettings } from '../lib/user-settings.js'
import { checkRateLimitByKey } from '../lib/validate.js'
import { assertAllowedOrigin } from './_lib/origin.js'

export default async function handler(req, res) {
  // Only GET. Anything else is a usage error worth surfacing loudly so
  // a future caller doesn't try to POST and silently get nothing back.
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  if (!assertAllowedOrigin(req, res)) return

  const authed = await getAuthedUser(req)
  if (!authed) {
    return res.status(401).json({ success: false, error: 'Not signed in.' })
  }

  // 240/hr is plenty: even a chatty extension that re-fetches on every
  // popup open would burn at most a few per minute.
  if (!checkRateLimitByKey(`settings:${authed.id}`, 240, 60 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many requests.' })
  }

  const requestId = newRequestId()
  const startedAt = Date.now()

  try {
    const settings = await loadUserSettings(authed.id)
    const latency_ms = Date.now() - startedAt

    // We do NOT log the prompt body here — there is none. Prompt-logs
    // metadata is reserved for classify/grade/rewrite/compress per the
    // migration's CHECK constraint. A read of user-settings is a different
    // class of event and doesn't belong in that table.

    return res.status(200).json({
      success: true,
      request_id: requestId,
      settings: settings ?? null,
      latency_ms,
    })
  } catch (err) {
    const latency_ms = Date.now() - startedAt
    // eslint-disable-next-line no-console -- intentional: surfaces DB outages.
    console.error('Settings read error:', err)

    // Log to the user's own row so they can see "weird thing happened
    // on this date" if they ever ask. Use kind='compress' as a placeholder
    // since that's the lowest-impact entry already covered by the schema's
    // CHECK constraint — adding 'settings' would require a migration.
    // Actually: skip the log entirely. The migration's CHECK constraint
    // doesn't include 'settings' and we don't want to silently coerce.
    void logPromptEvent
    void latency_ms

    return res.status(500).json({ success: false, error: 'Could not load settings.' })
  }
}
