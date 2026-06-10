-- Brand/Vendor partner inquiry capture for the public /partners form.
-- Apply via Supabase dashboard SQL editor or `supabase db push` BEFORE deploying
-- the hardened /api/partner-inquiry route. Atlas applies; Lab does NOT apply.
-- Safe to re-run (IF NOT EXISTS).
--
-- Why this exists: the prior /api/partner-inquiry route inserted into this table
-- but it was never created, and the route swallowed the "does not exist" error
-- and still returned ok:true — a silent no-op dead submit. The route is now
-- hardened to return a non-200 on storage failure, so this table must exist for
-- the form to genuinely capture leads.

create table if not exists public.partner_inquiries (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  company           text not null,
  email             text not null,
  partnership_type  text,
  message           text,
  source            text default 'partners_page',
  created_at        timestamptz not null default now()
);

create index if not exists partner_inquiries_created_at_idx
  on public.partner_inquiries (created_at desc);

-- Row Level Security: no direct client access. Only the service role
-- (used by the /api/partner-inquiry route) writes; Atlas/Tyler read via
-- service role (which bypasses RLS). Default-deny for anon + authenticated.
alter table public.partner_inquiries enable row level security;

comment on table public.partner_inquiries is
  'Public brand/vendor partner inquiries from gonr.app/partners. Service-role write only; no public read. Lead capture, not legal-sensitive.';
