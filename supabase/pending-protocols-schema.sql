-- supabase/pending-protocols-schema.sql
-- Write-through cache: every safe AI-generated protocol lands here for review.
-- Once approved, it enters the protocol library. The library self-fills from real usage.

CREATE TABLE IF NOT EXISTS pending_protocols (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stain_canonical text NOT NULL,
  surface_canonical text NOT NULL,
  card_json jsonb NOT NULL,
  source_model text,
  safety_filtered boolean DEFAULT false,
  safety_violation_count integer DEFAULT 0,
  status text DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_protocols_status
  ON pending_protocols(status);
CREATE INDEX IF NOT EXISTS idx_pending_protocols_stain_surface
  ON pending_protocols(stain_canonical, surface_canonical);
CREATE INDEX IF NOT EXISTS idx_pending_protocols_created
  ON pending_protocols(created_at DESC);
