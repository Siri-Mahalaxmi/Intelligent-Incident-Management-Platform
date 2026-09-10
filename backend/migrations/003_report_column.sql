-- =============================================================================
-- Migration 003: Add report_result column for the Report Agent output
--
-- Run this in your Supabase SQL Editor (Database → SQL Editor → New query).
-- Safe to re-run — uses ADD COLUMN IF NOT EXISTS.
-- =============================================================================

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS report_result jsonb;
