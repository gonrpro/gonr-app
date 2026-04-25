-- ─────────────────────────────────────────────────────────────────────────────
-- Task #43 — External Protocol Review Portal (shell migration, NOT YET APPLIED).
--
-- This file is committed to source as the technical readiness for the external
-- reviewer portal at /review/protocols. It is INTENTIONALLY NOT APPLIED to
-- production until Tyler explicitly approves the access model and any external
-- collaborator agreements are in place.
--
-- Apply order when ready:
--   1. Tyler signs off on access model (which emails, which roles, NDA status).
--   2. Atlas applies this migration via Supabase Management API.
--   3. Lab flips the route from "shell / coming soon" to live reviewer UI.
--
-- Schema design notes:
-- - `reviewers` is the invite-only allowlist (separate from FOUNDER_EMAILS).
-- - `reviewer_role` namespaces what scope of cards a reviewer sees:
--     dan        — stain/protocol chemistry reviewer
--     nca        — industry/training/wording/safety reviewer
--     other      — placeholder for future external partners
-- - `card_reviews.reviewer_role` (existing column) accepts these values too.
-- - Promotion rule for cross_ref → pro_verified via the external portal is
--   `2 independent pro approvals` per Atlas 8414 — enforced in the API route,
--   not the DB, so the rule stays legible in code.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.reviewers (
  id              uuid        primary key default gen_random_uuid(),
  email           text        not null unique,
  org             text,
  role            text        not null,
  invited_at      timestamptz not null default now(),
  invited_by      text        not null,
  active          boolean     not null default true,
  notes           text
);

alter table public.reviewers
  drop constraint if exists reviewers_role_check;
alter table public.reviewers
  add constraint reviewers_role_check
  check (role in ('dan','nca','other'));

create index if not exists reviewers_email_idx
  on public.reviewers (lower(email));

create index if not exists reviewers_role_idx
  on public.reviewers (role) where active = true;

comment on table public.reviewers is
  'External reviewer allowlist for /review/protocols (Task #43). NOT founder/admin. Per Atlas 8414, external promotion rule is 2 independent pro approvals before pro_verified — enforced in API route. Roles: dan (chemistry), nca (industry/safety), other.';
