-- ─────────────────────────────────────────────────────────────────────────────
-- TASK-055 — provenance schema.
-- NOTE: live public.protocol_cards is a view over public.procedures, so the
-- physical provenance columns belong on procedures and are then exposed through
-- the compatibility view.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.procedures
  add column if not exists sources            text[] not null default '{}',
  add column if not exists cross_refs         text[] not null default '{}',
  add column if not exists verification_level text   not null default 'draft';

alter table public.procedures
  drop constraint if exists procedures_verification_level_check;
alter table public.procedures
  add constraint procedures_verification_level_check
  check (verification_level in ('draft','single_source','cross_ref','pro_verified'));

create index if not exists procedures_verification_level_idx
  on public.procedures (verification_level);

create index if not exists procedures_sources_gin_idx
  on public.procedures using gin (sources);

comment on column public.procedures.sources is
  'List of source citations this card was built from (labels / URLs / ISBNs). Non-empty expected for any verification_level above draft.';
comment on column public.procedures.cross_refs is
  'External IDs or URIs this card has been cross-referenced against (DLI bulletins, Dan Eisen method numbers, ASTM codes, IFI releases, etc).';
comment on column public.procedures.verification_level is
  'draft | single_source | cross_ref | pro_verified. pro_verified requires a pro-team human review sign-off.';

create or replace view public.protocol_cards as
select
  id,
  card_key,
  stain_canonical,
  surface_canonical,
  version,
  is_active,
  data,
  source,
  plant_id,
  created_by,
  created_at,
  updated_at,
  procedure_type,
  target_schema,
  trigger_schema,
  sources,
  cross_refs,
  verification_level
from public.procedures;
