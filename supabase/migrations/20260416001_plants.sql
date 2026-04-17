-- TASK-023 Phase A — Plants + plant_users tables for the Plant Profile Wizard.
-- Spec: ~/ops-vault/500 Agents/Lab/Tasks/TASK-023.md
-- Apply via: Supabase dashboard SQL editor (or `supabase db push` if linked).

-- ─── plants table ────────────────────────────────────────────────────────
create table if not exists plants (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  owner_email          text not null,
  -- 5 wizard answers (nullable until wizard completed)
  solvent              text,                -- 'perc' | 'hydrocarbon' | 'GreenEarth' | 'wet-only' | other
  board                text,                -- 'spotting-board-steam-vacuum' | 'spotting-board-basic' | 'no-board'
  skill_level          text,                -- 'beginner' | 'intermediate' | 'advanced'
  bleach_allowed       boolean not null default false,
  house_rules          text,                -- free-text operator notes
  wizard_completed_at  timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_plants_owner on plants(owner_email);

-- updated_at trigger
create or replace function set_plants_updated_at()
  returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_plants_updated_at on plants;
create trigger trg_plants_updated_at
  before update on plants
  for each row execute function set_plants_updated_at();

-- ─── plant_users (join, multi-user for Operator tier) ─────────────────────
create table if not exists plant_users (
  plant_id     uuid not null references plants(id) on delete cascade,
  user_email   text not null,
  role         text not null default 'spotter',   -- 'owner' | 'operator' | 'spotter'
  added_at     timestamptz not null default now(),
  primary key (plant_id, user_email)
);

create index if not exists idx_plant_users_email on plant_users(user_email);

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table plants enable row level security;
alter table plant_users enable row level security;

-- plants: SELECT — user must be a member of the plant
drop policy if exists "plant member can read plant" on plants;
create policy "plant member can read plant" on plants
  for select
  using (
    exists (
      select 1 from plant_users
      where plant_users.plant_id = plants.id
        and plant_users.user_email = auth.jwt() ->> 'email'
    )
  );

-- plants: INSERT — anyone can create a plant they own
drop policy if exists "anyone can create plant" on plants;
create policy "anyone can create plant" on plants
  for insert
  with check (owner_email = auth.jwt() ->> 'email');

-- plants: UPDATE — owner role only
drop policy if exists "owner can update plant" on plants;
create policy "owner can update plant" on plants
  for update
  using (
    exists (
      select 1 from plant_users
      where plant_users.plant_id = plants.id
        and plant_users.user_email = auth.jwt() ->> 'email'
        and plant_users.role = 'owner'
    )
  );

-- plant_users: SELECT — user must be in the same plant
drop policy if exists "plant member can read plant_users" on plant_users;
create policy "plant member can read plant_users" on plant_users
  for select
  using (
    user_email = auth.jwt() ->> 'email'
    or exists (
      select 1 from plant_users pu2
      where pu2.plant_id = plant_users.plant_id
        and pu2.user_email = auth.jwt() ->> 'email'
    )
  );

-- plant_users: INSERT — owner role can add members; or self-add as owner via /api/plant POST handler (service role)
drop policy if exists "owner can add member" on plant_users;
create policy "owner can add member" on plant_users
  for insert
  with check (
    exists (
      select 1 from plant_users pu2
      where pu2.plant_id = plant_users.plant_id
        and pu2.user_email = auth.jwt() ->> 'email'
        and pu2.role = 'owner'
    )
  );

-- ─── Rollback ─────────────────────────────────────────────────────────────
-- drop trigger if exists trg_plants_updated_at on plants;
-- drop function if exists set_plants_updated_at();
-- drop table if exists plant_users;
-- drop table if exists plants;
