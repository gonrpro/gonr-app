-- TASK-005 Phase 3 — sb_card_candidates table.
--
-- Holds promoteable candidate protocol cards synthesized from AI-fallback
-- query patterns + grounded retrieval + extracted claims. Each row is a
-- proposed canonical card awaiting Tyler/Nova/Atlas review. On approval,
-- the card is written to data/core/<slug>.json + sb_sources (verified) and
-- this row gets status='promoted'.
--
-- Workflow (per Atlas's point #3 — "fallback → canonical card factory"):
--   1. AI-fallback solves log to events.procedure.served (with retrieval_used=true)
--   2. Nightly cluster job groups repeated fallback queries by stain × surface
--   3. For each cluster with N >= threshold, pull top chunks + claims,
--      synthesize candidate card, insert here at status='pending'
--   4. Review UI surfaces pending candidates
--   5. Approver flips to 'promoted' → Lab writes JSON card to data/core/
--
-- Apply: supabase db push via the CLI path (same as Day 3 + RPC migration).

BEGIN;

CREATE TABLE IF NOT EXISTS sb_card_candidates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stain_canonical     text NOT NULL,
  surface_canonical   text NOT NULL,
  query_pattern       text NOT NULL,
  occurrence_count    int NOT NULL DEFAULT 1,
  first_seen          timestamptz NOT NULL DEFAULT now(),
  last_seen           timestamptz NOT NULL DEFAULT now(),
  candidate_card      jsonb NOT NULL,
  grounded_chunk_ids  uuid[] NOT NULL DEFAULT '{}',
  grounded_claim_ids  uuid[] NOT NULL DEFAULT '{}',
  grounded_source_ids uuid[] NOT NULL DEFAULT '{}',
  avg_similarity      numeric(4,3),
  contradictions_flagged int NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','promoted','deferred')),
  reviewed_by         text,
  reviewed_at         timestamptz,
  review_notes        text,
  promoted_card_key   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sb_card_candidates_pair_idx
  ON sb_card_candidates (stain_canonical, surface_canonical);
CREATE INDEX IF NOT EXISTS sb_card_candidates_status_idx
  ON sb_card_candidates (status, occurrence_count DESC);

DROP TRIGGER IF EXISTS sb_card_candidates_updated ON sb_card_candidates;
CREATE TRIGGER sb_card_candidates_updated
  BEFORE UPDATE ON sb_card_candidates
  FOR EACH ROW EXECUTE FUNCTION sb_set_updated_at();

ALTER TABLE sb_card_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sb_card_candidates_service_all ON sb_card_candidates;
CREATE POLICY sb_card_candidates_service_all
  ON sb_card_candidates FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE sb_card_candidates IS 'TASK-005 Phase 3 — fallback → canonical card promotion queue. Approved candidates become verified data/core cards.';

COMMIT;
