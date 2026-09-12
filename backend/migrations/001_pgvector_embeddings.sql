-- =============================================================================
-- Migration 001: pgvector embeddings for incident similarity search
--
-- Run this in your Supabase SQL Editor (Database → SQL Editor → New query).
-- Safe to re-run — uses IF NOT EXISTS / CREATE OR REPLACE throughout.
-- =============================================================================

-- 1. Enable the pgvector extension (already available in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop old column if it exists with wrong dimensions, then add correct one
ALTER TABLE incidents DROP COLUMN IF EXISTS embedding;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Create an HNSW index for fast approximate nearest-neighbour search
--    HNSW supports up to 2000 dims; we use 1536 (truncated gemini-embedding-001)
DROP INDEX IF EXISTS incidents_embedding_hnsw_idx;
CREATE INDEX incidents_embedding_hnsw_idx
  ON incidents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Create the match_incidents() function used by the similarity search endpoint
CREATE OR REPLACE FUNCTION match_incidents(
  query_embedding  vector(1536),
  match_threshold  float,
  match_count      int,
  exclude_id       text
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
  FROM incidents i
  WHERE
    i.embedding IS NOT NULL
    AND i.incident_id <> exclude_id
    AND 1 - (i.embedding <=> query_embedding) >= match_threshold
  ORDER BY i.embedding <=> query_embedding
  LIMIT match_count;
$$;
