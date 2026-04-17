-- TASK-024 — Card Library DB Migration
-- Creates protocol_cards table for 260+ canonical protocol cards.
-- Per Atlas spec at ~/ops-vault/500 Agents/Lab/Tasks/TASK-024.md
--
-- Apply via: Supabase dashboard SQL editor (or `supabase db push` if linked).
-- Rollback: see end of file.

-- ─── Table ────────────────────────────────────────────────────────────────
create table if not exists protocol_cards (
  id                 uuid primary key default gen_random_uuid(),
  card_key           text not null,                       -- "{stainCanonical}_{surfaceCanonical}", e.g. "blood_cotton"
  stain_canonical    text not null,
  surface_canonical  text not null,
  version            integer not null default 1,
  is_active          boolean not null default true,
  data               jsonb not null,                       -- full card payload, same shape as JSON files
  source             text not null default 'core',         -- 'core' | 'nca' | 'plant:{plant_id}'
  plant_id           uuid,                                 -- null = canonical, non-null = plant override (TASK-023)
  created_by         text,                                 -- 'migration' | 'lab' | 'nca' | email
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ─── Constraints ──────────────────────────────────────────────────────────
-- Only one active version of each card per plant context.
-- (Allows historical inactive versions; allows plant overrides; keeps lookup deterministic.)
create unique index if not exists unique_active_card
  on protocol_cards (card_key, coalesce(plant_id::text, 'CANONICAL'))
  where is_active = true;

-- ─── Lookup indexes ───────────────────────────────────────────────────────
create index if not exists idx_protocol_cards_key
  on protocol_cards(card_key)
  where is_active = true;

create index if not exists idx_protocol_cards_plant
  on protocol_cards(plant_id)
  where plant_id is not null and is_active = true;

create index if not exists idx_protocol_cards_stain
  on protocol_cards(stain_canonical)
  where is_active = true;

create index if not exists idx_protocol_cards_surface
  on protocol_cards(surface_canonical)
  where is_active = true;

-- ─── updated_at trigger ───────────────────────────────────────────────────
create or replace function set_protocol_cards_updated_at()
  returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_protocol_cards_updated_at on protocol_cards;
create trigger trg_protocol_cards_updated_at
  before update on protocol_cards
  for each row execute function set_protocol_cards_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────
-- Read: anon role (public solve endpoint) can read active canonical cards.
-- Write: service role only (admin migrations + cron, no user writes).
alter table protocol_cards enable row level security;

drop policy if exists "anon read active canonical" on protocol_cards;
create policy "anon read active canonical" on protocol_cards
  for select
  using (is_active = true and plant_id is null);

-- Plant-scoped reads will be added in TASK-023 alongside the plants table
-- and a plant-membership policy. Out of scope here.

-- ─── Rollback ─────────────────────────────────────────────────────────────
-- drop trigger if exists trg_protocol_cards_updated_at on protocol_cards;
-- drop function if exists set_protocol_cards_updated_at();
-- drop table if exists protocol_cards;
