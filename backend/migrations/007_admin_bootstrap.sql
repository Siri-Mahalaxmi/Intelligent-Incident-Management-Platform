-- =============================================================================
-- Migration 007: Central Admin bootstrap
--
-- Run AFTER migrations 004–006.
-- Run in Supabase SQL Editor: Database → SQL Editor → New query
--
-- INSTRUCTIONS:
-- 1. First create the central admin user in Supabase Auth:
--    Dashboard → Authentication → Users → "Add user"
--    Email: admin@iimp.internal  (or your chosen admin email)
--    Password: (choose a strong password)
--    Click "Create user" — note the UUID shown in the user list.
--
-- 2. Replace <ADMIN_AUTH_USER_UUID> below with that UUID.
--
-- 3. Run this script.
--
-- This creates the central_admin profile record.
-- The trigger from migration 005 creates a basic profile on signup,
-- but this script sets the role to central_admin explicitly.
-- =============================================================================

-- Replace this UUID with the actual auth.users UUID of your admin account:
DO $$
DECLARE
  v_admin_uuid uuid := '<ADMIN_AUTH_USER_UUID>';  -- ← REPLACE THIS
  v_admin_email text := 'admin@iimp.internal';    -- ← match what you used
BEGIN
  -- Upsert the profile — sets role to central_admin, clears any org assignment
  INSERT INTO public.profiles (auth_user_id, email, full_name, role, organization_id, status)
  VALUES (
    v_admin_uuid,
    v_admin_email,
    'Central Administrator',
    'central_admin',
    NULL,   -- central_admin has no organization
    'active'
  )
  ON CONFLICT (auth_user_id)
  DO UPDATE SET
    role            = 'central_admin',
    organization_id = NULL,
    full_name       = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email           = EXCLUDED.email,
    updated_at      = now();

  RAISE NOTICE 'Central admin profile created/updated for %', v_admin_email;
END;
$$;

-- =============================================================================
-- Helper script: Create demo org users
--
-- For each demo organization user:
-- 1. Create them in Supabase Auth (Dashboard → Authentication → Users → Add user)
-- 2. Note their UUID
-- 3. Run one of the INSERT statements below, replacing the UUID.
--
-- Example: Add Srija as organization_admin for Acme Corp
-- =============================================================================

-- Template — uncomment and fill in real UUIDs after creating users in Auth:

/*
-- Acme Corp users
INSERT INTO public.profiles (auth_user_id, email, full_name, role, organization_id, status)
VALUES
  ('<SRIJA_UUID>',   'srija@acmecorp.com',   'Srija',   'organization_admin',  '00000000-0000-0000-0000-000000000001', 'active'),
  ('<RAHUL_UUID>',   'rahul@acmecorp.com',   'Rahul',   'organization_member', '00000000-0000-0000-0000-000000000001', 'active'),
  ('<ANANYA_UUID>',  'ananya@acmecorp.com',  'Ananya',  'organization_member', '00000000-0000-0000-0000-000000000001', 'active'),
  ('<VIKRAM_UUID>',  'vikram@acmecorp.com',  'Vikram',  'organization_member', '00000000-0000-0000-0000-000000000001', 'active'),
  ('<PRIYA_UUID>',   'priya@acmecorp.com',   'Priya',   'organization_member', '00000000-0000-0000-0000-000000000001', 'active')
ON CONFLICT (auth_user_id) DO UPDATE SET
  role = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  updated_at = now();

-- Globex Corp users
INSERT INTO public.profiles (auth_user_id, email, full_name, role, organization_id, status)
VALUES
  ('<GLOBEX_ADMIN_UUID>', 'admin@globex.com', 'Globex Admin', 'organization_admin', '00000000-0000-0000-0000-000000000002', 'active'),
  ('<GLOBEX_USER1_UUID>', 'user1@globex.com', 'Globex User 1', 'organization_member', '00000000-0000-0000-0000-000000000002', 'active')
ON CONFLICT (auth_user_id) DO UPDATE SET
  role = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  updated_at = now();

-- Initech users
INSERT INTO public.profiles (auth_user_id, email, full_name, role, organization_id, status)
VALUES
  ('<INITECH_ADMIN_UUID>', 'admin@initech.com', 'Initech Admin', 'organization_admin', '00000000-0000-0000-0000-000000000003', 'active'),
  ('<INITECH_USER1_UUID>', 'user1@initech.com', 'Initech User 1', 'organization_member', '00000000-0000-0000-0000-000000000003', 'active')
ON CONFLICT (auth_user_id) DO UPDATE SET
  role = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  updated_at = now();
*/
