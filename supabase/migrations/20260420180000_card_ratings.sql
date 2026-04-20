-- ─────────────────────────────────────────────────────────────────────────────
-- TASK-052 Stage A — Community rating layer
-- Creates the card_ratings table + aggregate view + RLS policies.
-- Phase 1 scope: outcome ratings on canonical cards only.
-- Rollback: see `rollback/20260420180000_card_ratings.down.sql` in this dir.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── card_ratings ────────────────────────────────────────────────────────────
-- One rating row per (card_id, rater_key). Re-rating upserts in place — the
-- unique constraint + ON CONFLICT in the submit endpoint is what prevents
-- vote-bombing. Raw rows are the audit trail; the aggregate view is the
-- public read surface.
create table if not exists public.card_ratings (
  id            uuid primary key default gen_random_uuid(),
  card_id       text not null,
  rater_key     text not null,                                   -- email (authed) or 'anon:<ip>' (rate-limited)
  rater_tier    text not null check (rater_tier in ('anon','free','home','spotter','operator','founder')),
  stars         smallint not null check (stars between 1 and 5),
  worked        text not null check (worked in ('yes','no','partial')),
  note          text,                                            -- optional free-text, moderation-gated for public display
  note_status   text not null default 'private'
                  check (note_status in ('private','pending','approved','rejected')),
  source        text not null default 'user'
                  check (source in ('user','internal_eval','gonr_lab','pilot')),
  correlation_id text,                                           -- solve event that produced this rating, for analytics
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint card_ratings_unique_rater unique (card_id, rater_key)
);

create index if not exists card_ratings_card_id_idx    on public.card_ratings (card_id);
create index if not exists card_ratings_source_idx     on public.card_ratings (source);
create index if not exists card_ratings_created_at_idx on public.card_ratings (created_at desc);
create index if not exists card_ratings_pending_notes_idx
  on public.card_ratings (note_status)
  where note_status = 'pending';

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.touch_card_ratings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists card_ratings_touch_updated_at on public.card_ratings;
create trigger card_ratings_touch_updated_at
before update on public.card_ratings
for each row execute function public.touch_card_ratings_updated_at();

-- ── aggregate view ──────────────────────────────────────────────────────────
-- IMPORTANT: public aggregates render ONLY user-sourced ratings so seed data
-- (internal_eval / gonr_lab / pilot) never blurs into the community number.
-- Seeded signal surfaces separately via the seeded_count column + the
-- "GONR Lab tested" trust badge in the UI.
create or replace view public.card_ratings_agg as
select
  card_id,
  -- public-facing numbers (user ratings only)
  count(*) filter (where source = 'user')                                                                    as user_count,
  avg(stars) filter (where source = 'user')                                                                   as user_avg_stars_raw,
  case
    when count(*) filter (where source = 'user') > 0
      then round(avg(stars) filter (where source = 'user')::numeric, 2)
    else null
  end                                                                                                         as user_avg_stars,
  case
    when count(*) filter (where source = 'user') > 0
      then round(100.0 * sum(case when worked = 'yes' and source = 'user' then 1 else 0 end)::numeric
                 / count(*) filter (where source = 'user'), 0)
    else null
  end                                                                                                         as user_worked_pct,
  -- seed signal (kept separate)
  count(*) filter (where source != 'user')                                                                    as seeded_count,
  array_remove(array_agg(distinct source) filter (where source != 'user'), null)                              as seed_sources
from public.card_ratings
group by card_id;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.card_ratings enable row level security;

-- Read: NO client-side select policy. Raw rows are service-role only (they
-- include private/pending notes, seed rows, and the correlation_id trail).
-- The public surface is the card_ratings_agg view, granted to authenticated
-- + anon below. All client reads of individual ratings flow through the
-- /api/ratings/* handlers, never PostgREST direct. (Per Atlas review of
-- Stage A — a broad `using (true)` select policy leaked pending notes to any
-- authenticated client.)
drop policy if exists card_ratings_read_authed on public.card_ratings;

-- Insert: authenticated users can insert rows only where rater_key matches
-- their email. Anon submissions bypass RLS via the service-role key in the
-- /api/ratings/submit handler (where rate-limiting is enforced).
drop policy if exists card_ratings_insert_self on public.card_ratings;
create policy card_ratings_insert_self on public.card_ratings
  for insert
  to authenticated
  with check (rater_key = lower(auth.jwt() ->> 'email'));

-- Update: only the owner can update their own rating in place. The `using`
-- clause doubles as a read permission for UPDATE operations — it does NOT
-- grant general SELECT. Client-side UIs must still call /api/ratings/* for
-- reading aggregate data; this policy only lets the writer's own UPDATE
-- finish its internal existence check.
drop policy if exists card_ratings_update_self on public.card_ratings;
create policy card_ratings_update_self on public.card_ratings
  for update
  to authenticated
  using (rater_key = lower(auth.jwt() ->> 'email'))
  with check (rater_key = lower(auth.jwt() ->> 'email'));

-- No client-side DELETE policy. Moderators act via service role only.

-- ── Grants on the view ──────────────────────────────────────────────────────
-- Authenticated + anon can read the aggregate view (it's intended public).
grant select on public.card_ratings_agg to authenticated, anon;

comment on table  public.card_ratings       is 'TASK-052 Phase 1 — outcome ratings on canonical protocol cards. Public aggregates in card_ratings_agg exclude non-user sources.';
comment on view   public.card_ratings_agg   is 'Public rating aggregate per card. Includes only source=user rows in user_* columns; seeded (internal_eval/gonr_lab/pilot) counts surface separately for the "GONR Lab tested" badge.';
comment on column public.card_ratings.source is 'user | internal_eval | gonr_lab | pilot. Public counters must filter source=user.';
comment on column public.card_ratings.note_status is 'private (default, submitter-only) | pending (awaiting moderation) | approved (may display publicly) | rejected (hidden).';
