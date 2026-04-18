-- TASK-005 Phase 1 Day 3 — Stain Brain knowledge tables.
--
-- Creates the four-layer knowledge spine in Supabase:
--   sb_sources        — canonical source registry (mirror of vault _meta.md)
--   sb_chunks         — text chunks + embeddings (pgvector)
--   sb_claims         — structured claims extracted from chunks
--   sb_contradictions — flagged conflicts between claims
--
-- Verification ladder is stored as text (L0..L5) on chunks + claims so the
-- ingestion pipeline can flip status as artifacts move through the pipe.
--
-- RLS: service_role only. Knowledge is internal; no anon/authenticated access.
-- The gonr-app backend uses service-role creds to read from these tables.
--
-- Apply: Atlas. Lab wrote, Atlas reviews + runs.

BEGIN;
-- ── Extensions ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;
-- ── sb_sources ─────────────────────────────────────────────────────────
-- One row per _meta.md in the vault. Seeded by scripts/seed-sb-sources.mjs.
CREATE TABLE IF NOT EXISTS sb_sources (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family            text NOT NULL,                         -- e.g. 'Primary Texts'
  subfamily         text,                                  -- e.g. 'Dan Eisen'
  title             text NOT NULL,
  author            text,
  publisher         text,
  year              int,
  form              text,                                  -- pdf-scan | md | json | ...
  license           text,
  raw_path          text NOT NULL,
  raw_exists        boolean NOT NULL DEFAULT false,
  raw_size_bytes    bigint,
  raw_sha256        text,
  vault_exception   boolean NOT NULL DEFAULT false,
  vault_meta_path   text NOT NULL UNIQUE,                  -- unique key: vault registry path
  ingest_status     text NOT NULL DEFAULT 'pending'
                    CHECK (ingest_status IN ('pending','ocr-done','chunked','embedded','claims-extracted','verified','deprecated')),
  ingest_run        timestamptz,
  chunks_count      int NOT NULL DEFAULT 0,
  claims_count      int NOT NULL DEFAULT 0,
  verified_by       text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sb_sources_family_idx     ON sb_sources (family, subfamily);
CREATE INDEX IF NOT EXISTS sb_sources_status_idx     ON sb_sources (ingest_status);
-- ── sb_chunks ──────────────────────────────────────────────────────────
-- Atomic retrievable units. One row per chunk of source text.
-- Embedding dim = 1536 (OpenAI text-embedding-3-small).
CREATE TABLE IF NOT EXISTS sb_chunks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        uuid NOT NULL REFERENCES sb_sources(id) ON DELETE CASCADE,
  ordinal          int NOT NULL,                           -- chunk position within source
  content          text NOT NULL,
  content_sha256   text NOT NULL,                          -- dedup guard
  embedding        vector(1536),
  token_count      int,
  page             int,                                    -- PDF page, if applicable
  section          text,                                   -- chapter/heading, if applicable
  verified_tier    text NOT NULL DEFAULT 'L0'
                   CHECK (verified_tier IN ('L0','L1','L2','L3','L4','L5')),
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, ordinal)
);
CREATE INDEX IF NOT EXISTS sb_chunks_source_idx   ON sb_chunks (source_id);
CREATE INDEX IF NOT EXISTS sb_chunks_hash_idx     ON sb_chunks (content_sha256);
CREATE INDEX IF NOT EXISTS sb_chunks_tsvector_idx
  ON sb_chunks USING GIN (to_tsvector('english', content));
-- HNSW ANN index for semantic retrieval. Cosine distance.
CREATE INDEX IF NOT EXISTS sb_chunks_embedding_hnsw
  ON sb_chunks USING hnsw (embedding vector_cosine_ops);
-- ── sb_claims ──────────────────────────────────────────────────────────
-- Structured facts extracted from chunks. One chunk produces N claims.
CREATE TABLE IF NOT EXISTS sb_claims (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_chunk_id   uuid NOT NULL REFERENCES sb_chunks(id) ON DELETE CASCADE,
  source_id         uuid NOT NULL REFERENCES sb_sources(id) ON DELETE CASCADE,
  claim_type        text NOT NULL
                    CHECK (claim_type IN ('technique','safety-rule','chemistry-fact','procedure','warning','classification','contraindication')),
  claim_text        text NOT NULL,
  subjects          jsonb NOT NULL DEFAULT '{}'::jsonb,    -- { stain, fiber, agent, surface }
  confidence        numeric(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  verified_tier     text NOT NULL DEFAULT 'L1'
                    CHECK (verified_tier IN ('L1','L2','L3','L4','L5','deprecated')),
  verified_by       text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sb_claims_chunk_idx    ON sb_claims (source_chunk_id);
CREATE INDEX IF NOT EXISTS sb_claims_source_idx   ON sb_claims (source_id);
CREATE INDEX IF NOT EXISTS sb_claims_type_idx     ON sb_claims (claim_type);
CREATE INDEX IF NOT EXISTS sb_claims_subjects_idx ON sb_claims USING GIN (subjects);
-- ── sb_contradictions ──────────────────────────────────────────────────
-- Flagged conflicts between claims. Populated by the contradiction detector
-- in Phase 3; reviewed + resolved by Nova/Atlas/Tyler.
CREATE TABLE IF NOT EXISTS sb_contradictions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_a_id         uuid NOT NULL REFERENCES sb_claims(id) ON DELETE CASCADE,
  claim_b_id         uuid NOT NULL REFERENCES sb_claims(id) ON DELETE CASCADE,
  conflict_type      text NOT NULL,                         -- e.g. 'opposing-rule', 'different-agent'
  subject_match      jsonb NOT NULL DEFAULT '{}'::jsonb,    -- the shared (stain, fiber) that caused the collision
  resolution_status  text NOT NULL DEFAULT 'open'
                     CHECK (resolution_status IN ('open','resolved-a','resolved-b','both-contextual','escalated')),
  resolved_by        text,
  resolved_at        timestamptz,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (claim_a_id <> claim_b_id)
);
CREATE INDEX IF NOT EXISTS sb_contradictions_claim_a_idx ON sb_contradictions (claim_a_id);
CREATE INDEX IF NOT EXISTS sb_contradictions_claim_b_idx ON sb_contradictions (claim_b_id);
CREATE INDEX IF NOT EXISTS sb_contradictions_status_idx  ON sb_contradictions (resolution_status);
-- ── updated_at triggers ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sb_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS sb_sources_updated ON sb_sources;
CREATE TRIGGER sb_sources_updated
  BEFORE UPDATE ON sb_sources
  FOR EACH ROW EXECUTE FUNCTION sb_set_updated_at();
-- ── RLS — service_role only ────────────────────────────────────────────
ALTER TABLE sb_sources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_chunks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_claims         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_contradictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sb_sources_service_all        ON sb_sources;
DROP POLICY IF EXISTS sb_chunks_service_all         ON sb_chunks;
DROP POLICY IF EXISTS sb_claims_service_all         ON sb_claims;
DROP POLICY IF EXISTS sb_contradictions_service_all ON sb_contradictions;
CREATE POLICY sb_sources_service_all
  ON sb_sources        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY sb_chunks_service_all
  ON sb_chunks         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY sb_claims_service_all
  ON sb_claims         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY sb_contradictions_service_all
  ON sb_contradictions FOR ALL TO service_role USING (true) WITH CHECK (true);
-- ── Column comments (for anyone poking the schema) ─────────────────────
COMMENT ON TABLE  sb_sources IS 'TASK-005 Phase 1 — Stain Brain canonical source registry. Mirror of vault Sources/**/_meta.md.';
COMMENT ON TABLE  sb_chunks  IS 'TASK-005 Phase 1 — chunked source text with pgvector embeddings for hybrid retrieval.';
COMMENT ON TABLE  sb_claims  IS 'TASK-005 Phase 3 — structured claims extracted from chunks, with provenance.';
COMMENT ON TABLE  sb_contradictions IS 'TASK-005 Phase 3 — flagged conflicts between claims for Nova/Atlas/Tyler review.';
COMMIT;
