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

-- ----------------------------------------------------------------------------
-- Security hardening (2026-04-18)
-- ----------------------------------------------------------------------------

-- Tighten RLS surface: hide access_code from the anon key.
-- The browser only ever needs id/name/position/user_id — access_code is a
-- capability and should only leave via /api/signup, never via a direct
-- supabase.from('waitlist').select() from the client.
DROP POLICY IF EXISTS "users_can_read_own_waitlist_row" ON waitlist;

CREATE OR REPLACE VIEW waitlist_public
  WITH (security_invoker = on) AS
    SELECT id, name, position, user_id, created_at
      FROM waitlist;

-- Re-grant the narrow view to authenticated users; leave raw `waitlist`
-- readable only via service-role.
REVOKE ALL ON waitlist FROM authenticated, anon;
GRANT SELECT ON waitlist_public TO authenticated;

-- The view needs its own RLS policy on the underlying table for
-- security_invoker to apply auth.uid() checks.
CREATE POLICY "users_can_read_own_waitlist_row_via_view"
  ON waitlist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- CHECK constraints: defence-in-depth against app-layer validation regressions.
-- `NOT VALID` skips checking existing rows (for rollout safety); new inserts
-- and updates are validated.
ALTER TABLE waitlist
  DROP CONSTRAINT IF EXISTS waitlist_email_nonempty,
  ADD CONSTRAINT waitlist_email_nonempty
  CHECK (email <> '' AND char_length(email) <= 254) NOT VALID;

ALTER TABLE waitlist
  DROP CONSTRAINT IF EXISTS waitlist_access_code_format,
  ADD CONSTRAINT waitlist_access_code_format
  CHECK (access_code ~ '^AMP-[A-Z2-9]{6}$') NOT VALID;

ALTER TABLE waitlist
  DROP CONSTRAINT IF EXISTS waitlist_position_positive,
  ADD CONSTRAINT waitlist_position_positive
  CHECK (position > 0) NOT VALID;

-- ----------------------------------------------------------------------------
-- Atomic position assignment (fixes count-then-insert race in /api/signup).
-- Runs inside a serializable transaction so two concurrent signups cannot
-- both read position=N and both insert as N+1.
-- ----------------------------------------------------------------------------
-- Pure SQL function (no plpgsql) to avoid variable-scoping quirks.
-- pg_advisory_xact_lock serializes concurrent callers on a bigint key and
-- auto-releases at transaction end — correctness-critical so two writers
-- never see the same MAX(position).
DROP FUNCTION IF EXISTS claim_waitlist_spot(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION claim_waitlist_spot(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_access_code TEXT
) RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH locked AS (
    SELECT pg_advisory_xact_lock(874219846) AS ok
  ),
  new_row AS (
    INSERT INTO waitlist (
      email, name, access_code, position, user_id, email_verified,
      verification_token, verification_expires_at
    )
    SELECT
      p_email,
      p_name,
      p_access_code,
      COALESCE((SELECT MAX(w.position) FROM waitlist w), 0) + 1,
      p_user_id,
      TRUE,
      NULL,
      NULL
    FROM locked
    RETURNING position, access_code
  )
  SELECT json_build_object('position', new_row.position, 'access_code', new_row.access_code)
  FROM new_row;
$$;

-- Only the service-role key should call this RPC (service-role is implicitly
-- granted EXECUTE). Lock it down from the anon role.
REVOKE ALL ON FUNCTION claim_waitlist_spot(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
