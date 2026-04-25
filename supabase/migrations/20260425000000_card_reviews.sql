-- ─────────────────────────────────────────────────────────────────────────────
-- Task #44 — Internal Verification Actions v1.
--
-- Audit log for protocol-card reviews from /admin/protocol-library and
-- (future) /review/protocols. Captures who approved, flagged, or annotated
-- a card, with an immutable timestamp + the card_key + the version of the
-- card data they reviewed.
--
-- Promotion of `procedures.verification_level` is handled by the API
-- route, not by triggers — keeps the rules legible and auditable in code.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.card_reviews (
  id              uuid        primary key default gen_random_uuid(),
  card_key        text        not null,
  reviewer_email  text        not null,
  reviewer_role   text        not null default 'founder',
  action          text        not null,
  note            text,
  card_version    text,
  reviewed_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

alter table public.card_reviews
  drop constraint if exists card_reviews_action_check;
alter table public.card_reviews
  add constraint card_reviews_action_check
  check (action in ('approve','flag','note'));

alter table public.card_reviews
  drop constraint if exists card_reviews_role_check;
alter table public.card_reviews
  add constraint card_reviews_role_check
  check (reviewer_role in ('founder','admin','dan','nca','other'));

alter table public.card_reviews
  drop constraint if exists card_reviews_flag_note_required;
alter table public.card_reviews
  add constraint card_reviews_flag_note_required
  check (action <> 'flag' or (note is not null and length(trim(note)) > 0));

create index if not exists card_reviews_card_key_idx
  on public.card_reviews (card_key, reviewed_at desc);

create index if not exists card_reviews_reviewer_idx
  on public.card_reviews (reviewer_email, reviewed_at desc);

comment on table public.card_reviews is
  'Audit log of protocol-card reviewer actions (approve/flag/note). Promotion of procedures.verification_level is enforced by the /api/admin/protocol-library/review route, not by triggers, so the promotion rules stay legible in code. Action ''flag'' requires a note.';
