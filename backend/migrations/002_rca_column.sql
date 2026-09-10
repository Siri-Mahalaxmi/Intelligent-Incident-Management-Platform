-- =============================================================================
-- Migration 002: Add rca_result column for multi-agent RCA pipeline output
--
-- Run this in your Supabase SQL Editor (Database → SQL Editor → New query).
-- =============================================================================

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS rca_result jsonb;
