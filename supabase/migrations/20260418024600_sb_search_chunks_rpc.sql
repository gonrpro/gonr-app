-- TASK-005 Phase 2 tightening — server-side pgvector search RPC.
--
-- Preview verification showed client-side cosine scan at 4817ms. The HNSW
-- index on sb_chunks.embedding is already in place from the Phase 1 Day 3
-- migration; this RPC uses it via the <=> cosine distance operator.
--
-- Caller invokes via PostgREST:
--   POST /rest/v1/rpc/sb_search_chunks
--   { "query_embedding": [...1536 floats...], "match_count": 5 }
--
-- Apply: Atlas via `supabase db push`. Lab's retrieve.ts switches from
-- fetch-all-then-score to a single RPC call once this function exists.

BEGIN;

-- Raise HNSW search parameters so we get better recall at k=5. Default
-- ef_search=40 is fine for larger k; at k=5 we want ef_search≥20 which
-- the default already satisfies. Leaving defaults for now.

CREATE OR REPLACE FUNCTION sb_search_chunks(
  query_embedding vector(1536),
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id            uuid,
  source_id     uuid,
  content       text,
  section       text,
  similarity    float
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT
    c.id,
    c.source_id,
    c.content,
    c.section,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM sb_chunks c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT greatest(1, match_count);
$$;

-- PostgREST needs EXECUTE grant on the function to expose it as an RPC.
GRANT EXECUTE ON FUNCTION sb_search_chunks(vector(1536), int) TO service_role;

COMMENT ON FUNCTION sb_search_chunks IS 'TASK-005 Phase 2 — server-side HNSW cosine search over sb_chunks. Returns top-N by similarity with source_id for join.';

COMMIT;
