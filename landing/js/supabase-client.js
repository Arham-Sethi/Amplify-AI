// Singleton Supabase browser client.
//
// The URL + anon (publishable) key are safe to embed in the browser — they're
// designed to be public. Row Level Security (RLS) enforces access at the row
// level in Postgres. The service-role key (which bypasses RLS) NEVER appears
// here — it lives only in Vercel env vars for the /api/* functions.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = 'https://lmbsulisdrzxhhvxidlp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtYnN1bGlzZHJ6eGhodnhpZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDM1NTYsImV4cCI6MjA5MTkxOTU1Nn0.unbvn1QKrl6YsW21JF9IywXqF5mV4zqgJMedFwLsrI4';

let client;

export function getSupabase() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export function signInWithProvider(provider, next = '/account') {
  const supabase = getSupabase();
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
}

export function signInWithEmail(email, password) {
  return getSupabase().auth.signInWithPassword({ email, password });
}

export function signUpWithEmail(email, password, next = '/account') {
  const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  return getSupabase().auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
}

export async function getSession() {
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

export async function getUser() {
  const { data } = await getSupabase().auth.getUser();
  return data.user;
}

export async function signOut() {
  await getSupabase().auth.signOut();
}

// Helper: run callback now with the current user (if any), then on every
// auth change. Replaces the getSession() → render flow on pages that want
// to react to login/logout in real time.
export function onAuthChanged(callback) {
  const supabase = getSupabase();
  supabase.auth.getSession().then(({ data }) => {
    callback(data.session?.user || null);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
}
