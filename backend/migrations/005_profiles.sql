-- =============================================================================
-- Migration 005: Create profiles table (application user records)
--
-- Run AFTER migration 004 (organizations must exist first).
-- Run in Supabase SQL Editor: Database → SQL Editor → New query
-- Safe to re-run — uses IF NOT EXISTS / DROP IF EXISTS throughout.
--
-- profiles links auth.users → organization → role
-- central_admin rows have organization_id = NULL (platform-level)
-- =============================================================================

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid        REFERENCES public.organizations(id) ON DELETE SET NULL,
  role            text        NOT NULL DEFAULT 'organization_member'
                              CHECK (role IN ('central_admin', 'organization_admin', 'organization_member')),
  full_name       text,
  email           text,
  status          text        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'inactive')),
  last_active_at  timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Role/org consistency constraint ──────────────────────────────────────────
-- central_admin must have organization_id = NULL
-- org roles must have organization_id NOT NULL

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_org_role_consistency;
ALTER TABLE public.profiles ADD CONSTRAINT chk_org_role_consistency CHECK (
  (role = 'central_admin' AND organization_id IS NULL)
  OR
  (role <> 'central_admin' AND organization_id IS NOT NULL)
);

-- ── updated_at trigger ────────────────────────────────────────────────────────
-- set_updated_at() was created in migration 004

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS profiles_auth_user_id_idx    ON public.profiles (auth_user_id);
CREATE INDEX IF NOT EXISTS profiles_organization_id_idx ON public.profiles (organization_id);
CREATE INDEX IF NOT EXISTS profiles_role_idx            ON public.profiles (role);

-- ── Enable RLS ────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── RLS policies ──────────────────────────────────────────────────────────────
-- Drop first (idempotent), then create.

-- Every user can always read their own profile
DROP POLICY IF EXISTS "user_read_own_profile" ON public.profiles;
CREATE POLICY "user_read_own_profile"
  ON public.profiles FOR SELECT
  USING (auth_user_id = auth.uid());

-- central_admin: read all profiles
DROP POLICY IF EXISTS "central_admin_read_profiles" ON public.profiles;
CREATE POLICY "central_admin_read_profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.auth_user_id = auth.uid()
        AND p2.role = 'central_admin'
    )
  );

-- org users: read only profiles in their own organization
DROP POLICY IF EXISTS "org_user_read_own_org_profiles" ON public.profiles;
CREATE POLICY "org_user_read_own_org_profiles"
  ON public.profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles p2
      WHERE p2.auth_user_id = auth.uid()
    )
  );

-- Users can update their own profile (name, last_active_at — NOT role, NOT org)
DROP POLICY IF EXISTS "user_update_own_profile" ON public.profiles;
CREATE POLICY "user_update_own_profile"
  ON public.profiles FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid()
    -- role must stay the same — prevents self-escalation
    AND role = (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid())
    -- organization_id must stay the same
    AND organization_id IS NOT DISTINCT FROM
        (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

-- central_admin: insert profiles (for onboarding new users)
DROP POLICY IF EXISTS "central_admin_insert_profiles" ON public.profiles;
CREATE POLICY "central_admin_insert_profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.auth_user_id = auth.uid()
        AND p2.role = 'central_admin'
    )
  );

-- central_admin: update any profile (role changes, status changes)
DROP POLICY IF EXISTS "central_admin_update_profiles" ON public.profiles;
CREATE POLICY "central_admin_update_profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.auth_user_id = auth.uid()
        AND p2.role = 'central_admin'
    )
  );

-- ── Auto-create profile on Supabase Auth signup ───────────────────────────────
-- Fires when a new user is created in auth.users.
-- Creates a minimal profile row; role and org must be assigned separately.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Step : Remove the overly strict constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_org_role_consistency;
