-- Amplify AI Waitlist Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  access_code TEXT UNIQUE NOT NULL,
  position INTEGER NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  verification_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist (email);
CREATE INDEX IF NOT EXISTS idx_waitlist_access_code ON waitlist (access_code);
CREATE INDEX IF NOT EXISTS idx_waitlist_verification_token ON waitlist (verification_token)
  WHERE verification_token IS NOT NULL;

-- Row Level Security: only service_role can access (API routes use service key)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- No public access policies — all access goes through API routes with service_role key
-- This means the anon key CANNOT read/write this table (secure by default)

-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- OAuth integration: link waitlist entries to Supabase auth users.
-- Nullable so anonymous email+name signups still work.
-- ----------------------------------------------------------------------------
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON waitlist (user_id);

-- Allow a signed-in user to read only their own waitlist row via the anon key.
-- Service-role writes from /api/* continue to bypass RLS.
DROP POLICY IF EXISTS "users_can_read_own_waitlist_row" ON waitlist;
CREATE POLICY "users_can_read_own_waitlist_row"
  ON waitlist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
