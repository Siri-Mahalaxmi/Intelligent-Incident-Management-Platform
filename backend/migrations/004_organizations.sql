-- =============================================================================
-- Migration 004: Create organizations table
--
-- Run in Supabase SQL Editor: Database → SQL Editor → New query
-- Safe to re-run — uses IF NOT EXISTS / DROP IF EXISTS throughout.
--
-- IMPORTANT: RLS policies on organizations that reference the profiles table
-- are added in migration 006 (after profiles is created in 005). This file
-- only creates the table, trigger, and enables RLS — no policies yet.
-- =============================================================================

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  domain      text,
  status      text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── updated_at trigger helper function ────────────────────────────────────────
-- CREATE OR REPLACE is idempotent — safe to re-run.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_updated_at ON public.organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Enable RLS ────────────────────────────────────────────────────────────────
-- Policies are added in migration 006 once the profiles table exists.

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
