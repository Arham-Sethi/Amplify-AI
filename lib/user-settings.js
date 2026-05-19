// lib/user-settings.js
//
// Server-side reader for public.user_settings.
//
// Uses the service-role client (lib/supabase.js), so RLS is bypassed —
// callers must already have authenticated the user out-of-band (i.e.
// with `supabase.auth.getUser(token)` from a Bearer token).
//
// Returns null on any failure path: missing row, transient DB error,
// invalid input. The /api/* handlers treat null as "use defaults", so
// degraded settings reads fall back gracefully without breaking a
// rewrite or classify call.

import { supabase } from './supabase.js';

/**
 * @typedef {Object} UserSettings
 * @property {string} target_llm        - 'claude' | 'gpt' | 'gemini' | 'grok' | 'other'
 * @property {string} tone              - 'work' | 'casual' | 'technical' | 'warm' | 'neutral'
 * @property {string} work_context      - up to 1000 chars
 * @property {number} token_budget      - 256..200000
 * @property {string} default_intensity - 'gentle' | 'medium' | 'aggressive'
 */

/**
 * Load a user's settings row, or null if none exists yet (or on error).
 *
 * @param {string} userId
 * @returns {Promise<UserSettings | null>}
 */
export async function loadUserSettings(userId) {
  if (!userId || typeof userId !== 'string') return null;
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('target_llm, tone, work_context, token_budget, default_intensity')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.debug('[user-settings] load failed:', error.message || error);
      return null;
    }
    return data || null;
  } catch (err) {
    console.debug('[user-settings] load exception:', err?.message || err);
    return null;
  }
}
