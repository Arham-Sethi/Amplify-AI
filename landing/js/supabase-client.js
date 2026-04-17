// Singleton Supabase client for the browser.
// Fetches public config from /api/config (no keys committed to source).
// Uses the anon/publishable key only — service-role key NEVER touches the browser.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

let clientPromise;

export function getSupabase() {
  if (!clientPromise) {
    clientPromise = fetch('/api/config', { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load public config');
        return r.json();
      })
      .then(({ supabaseUrl, supabaseAnonKey }) => {
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Public config missing required fields');
        }
        return createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
      });
  }
  return clientPromise;
}

export async function signInWithProvider(provider, next = '/account') {
  const supabase = await getSupabase();
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
}

export async function signInWithEmail(email, password) {
  const supabase = await getSupabase();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password, next = '/account') {
  const supabase = await getSupabase();
  const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
}

export async function getSession() {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser() {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
}
