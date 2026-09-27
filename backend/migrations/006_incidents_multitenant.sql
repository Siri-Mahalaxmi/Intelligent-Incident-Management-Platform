-- =============================================================================
-- Migration 006: Add multi-tenant columns to incidents table
--
-- Run AFTER migrations 004 and 005.
-- Run in Supabase SQL Editor: Database → SQL Editor → New query
-- Safe to re-run — uses IF NOT EXISTS / DROP IF EXISTS / OR REPLACE.
--
-- Changes:
--   1. Add organization_id FK to incidents
--   2. Add created_by FK to incidents
--   3. Indexes on new columns + created_at
--   4. Enable RLS on incidents
--   5. RLS policies for org isolation (central_admin + org users)
--   6. Update match_incidents() — adds optional org filter (backward-compat)
--   7. Insert 3 demo organizations + assign existing incidents to them
-- =============================================================================

-- ── 1. Add ownership columns ──────────────────────────────────────────────────

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS organization_id uuid
    REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS created_by uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS incidents_organization_id_idx
  ON public.incidents (organization_id);

CREATE INDEX IF NOT EXISTS incidents_created_by_idx
  ON public.incidents (created_by);

CREATE INDEX IF NOT EXISTS incidents_created_at_idx
  ON public.incidents (created_at DESC);

-- ── 3. Enable RLS ─────────────────────────────────────────────────────────────

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- ── 3b. Organizations RLS policies ────────────────────────────────────────────
-- Added here (not in 004) because they reference public.profiles which is
-- created in 005. Profiles must exist before these policies can be created.

-- central_admin: full read on all organizations
DROP POLICY IF EXISTS "central_admin_read_organizations" ON public.organizations;
CREATE POLICY "central_admin_read_organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.role = 'central_admin'
    )
  );

-- org users: read only their own organization
DROP POLICY IF EXISTS "org_user_read_own_organization" ON public.organizations;
CREATE POLICY "org_user_read_own_organization"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- central_admin: insert new organizations
DROP POLICY IF EXISTS "central_admin_insert_organizations" ON public.organizations;
CREATE POLICY "central_admin_insert_organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.role = 'central_admin'
    )
  );

-- central_admin: update organizations
DROP POLICY IF EXISTS "central_admin_update_organizations" ON public.organizations;
CREATE POLICY "central_admin_update_organizations"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.role = 'central_admin'
    )
  );

-- ── 4. RLS policies ───────────────────────────────────────────────────────────
-- Drop first (idempotent), then create.

-- central_admin: read all incidents across all organizations
DROP POLICY IF EXISTS "central_admin_read_incidents" ON public.incidents;
CREATE POLICY "central_admin_read_incidents"
  ON public.incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.role = 'central_admin'
    )
  );

-- org users: read only incidents belonging to their organization
DROP POLICY IF EXISTS "org_user_read_own_org_incidents" ON public.incidents;
CREATE POLICY "org_user_read_own_org_incidents"
  ON public.incidents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- org users: insert incidents into their own organization only
DROP POLICY IF EXISTS "org_user_insert_own_org_incidents" ON public.incidents;
CREATE POLICY "org_user_insert_own_org_incidents"
  ON public.incidents FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- org users: update incidents belonging to their organization
DROP POLICY IF EXISTS "org_user_update_own_org_incidents" ON public.incidents;
CREATE POLICY "org_user_update_own_org_incidents"
  ON public.incidents FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- central_admin: update any incident
DROP POLICY IF EXISTS "central_admin_update_incidents" ON public.incidents;
CREATE POLICY "central_admin_update_incidents"
  ON public.incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.role = 'central_admin'
    )
  );

-- ── 5. Update match_incidents() for org-scoped similarity search ──────────────
-- Added p_organization_id parameter (DEFAULT NULL = no filter = all orgs).
-- Fully backward-compatible: existing callers without this parameter still work.

CREATE OR REPLACE FUNCTION public.match_incidents(
  query_embedding   vector(1536),
  match_threshold   float,
  match_count       int,
  exclude_id        text,
  p_organization_id uuid DEFAULT NULL
)
RETURNS TABLE (
  incident_id   text,
  title         text,
  service       text,
  severity      text,
  status        text,
  created_at    timestamptz,
  similarity    float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    i.incident_id,
    i.title,
    i.service,
    i.severity,
    i.status,
    i.created_at,
    1 - (i.embedding <=> query_embedding) AS similarity
  FROM public.incidents i
  WHERE
    i.embedding IS NOT NULL
    AND i.incident_id <> exclude_id
    AND 1 - (i.embedding <=> query_embedding) >= match_threshold
    AND (p_organization_id IS NULL OR i.organization_id = p_organization_id)
  ORDER BY i.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── 6. Demo organizations ─────────────────────────────────────────────────────
-- Fixed UUIDs so migrations are fully idempotent.
-- ON CONFLICT (id) DO NOTHING makes this safe to re-run.

INSERT INTO public.organizations (id, name, domain, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Acme Corp',   'acmecorp.com', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'Globex Corp', 'globex.com',   'active'),
  ('00000000-0000-0000-0000-000000000003', 'Initech',     'initech.com',  'active')
ON CONFLICT (id) DO NOTHING;

-- ── 7. Assign existing mock incidents to demo organizations ───────────────────
-- Only updates rows that have not yet been assigned (organization_id IS NULL).
-- INC-1001, INC-1002 → Acme Corp
-- INC-1003           → Globex Corp
-- INC-1004, INC-1005 → Initech

UPDATE public.incidents
  SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE incident_id IN ('INC-1001', 'INC-1002')
  AND organization_id IS NULL;

UPDATE public.incidents
  SET organization_id = '00000000-0000-0000-0000-000000000002'
WHERE incident_id = 'INC-1003'
  AND organization_id IS NULL;

UPDATE public.incidents
  SET organization_id = '00000000-0000-0000-0000-000000000003'
WHERE incident_id IN ('INC-1004', 'INC-1005')
  AND organization_id IS NULL;
