-- 20260424_solve_review_queue.sql
--
-- Review queue for solve requests. Every /api/solve call writes one row here.
-- Two primary uses:
--   1. Telemetry — what queries are hitting the AI fallback? which
--      stain × surface combinations need a canonical card authored next?
--   2. Promotion pipeline — when Nova/Tyler author a replacement card,
--      we can set promoted_card_key on the original row to close the loop.
--
-- Schema locked by Atlas 2026-04-24 (AtlasOps 8088).

create table if not exists public.solve_review_queue (
  id                 uuid        primary key default gen_random_uuid(),
  created_at         timestamptz not null    default now(),

  -- What the user asked for
  query_raw          text        not null,                  -- full raw input as typed
  stain              text,                                   -- resolved/canonical stain
  surface            text,                                   -- resolved/canonical surface
  tier_requested     text,                                   -- 'anon' | 'free' | 'home' | 'spotter' | 'operator' | 'founder'

  -- What happened at solve time
  matched_card_key   text,                                   -- null if no canonical card matched
  used_ai_fallback   boolean     not null default false,     -- true when /api/solve fell back to AI generation

  -- Session attribution (nullable — anon users don't have user_id)
  user_id            text,
  session_id         text,

  -- Outcome signals (writable by downstream events later)
  saved              boolean     not null default false,
  retried            boolean     not null default false,

  -- Promotion closure
  resolved_at        timestamptz,
  promoted_card_key  text,                                   -- when someone authors a verified card, link here
  notes              text
);

-- Hot indexes for the two main read patterns:
--   (a) "which uncovered stain × surface combinations are most common?"
--   (b) "which AI-fallback queries happened in the last N days?"
create index if not exists solve_review_queue_created_at_idx
  on public.solve_review_queue (created_at desc);

create index if not exists solve_review_queue_ai_fallback_idx
  on public.solve_review_queue (used_ai_fallback, created_at desc)
  where used_ai_fallback = true;

create index if not exists solve_review_queue_stain_surface_idx
  on public.solve_review_queue (stain, surface)
  where matched_card_key is null;

-- RLS: service-role only. Anon / authenticated users never read/write this
-- directly — /api/solve writes server-side with the service-role key, and
-- an internal admin surface will read the same way.
alter table public.solve_review_queue enable row level security;

-- Explicit deny-all default policy (service role bypasses RLS automatically).
create policy solve_review_queue_no_client_access
  on public.solve_review_queue
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on table public.solve_review_queue is
  'Per-solve telemetry + promotion queue. Service-role write from /api/solve, service-role read from admin tooling. RLS denies all client access.';
