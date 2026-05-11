-- TASK-144 — Operator-week feedback capture: product feedback table
-- Apply order: 001 → 002
-- Atlas applies via Supabase dashboard or `supabase db push`; Lab does NOT apply.
-- Source: ~/lab/output/TASK-144-operator-week-capture/spec.md §5a

create table if not exists public.operator_feedback (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  protocol_id text,
  surface text not null check (surface in ('gonr-runtime', 'spottingboard')),
  trigger text not null check (trigger in ('post-recommendation', 'manual')),

  -- F1
  recommendation_clarity text check (recommendation_clarity in ('clear', 'partly_clear', 'not_clear', 'wrong')),
  recommendation_note text,

  -- F2
  material_risk_match text check (material_risk_match in ('matched', 'partly_matched', 'didnt_match', 'missing_when_needed')),
  material_risk_note text,

  -- F3
  stop_escalate_clarity text check (stop_escalate_clarity in ('clear', 'unclear', 'missing')),
  stop_escalate_note text,

  -- F4
  provenance_clarity text check (provenance_clarity in ('clear', 'partly_clear', 'not_clear', 'didnt_notice')),
  provenance_note text,

  -- F5
  chemistry_clarity text check (chemistry_clarity in ('clear', 'partly_clear', 'not_clear', 'looked_up')),
  chemistry_note text,

  -- F6 headline PMF
  would_use_real_garment text check (would_use_real_garment in ('yes', 'no')),
  would_use_note text,

  -- meta
  device text check (device in ('phone', 'tablet', 'desktop')),
  app_version text,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists operator_feedback_plant_id_idx on public.operator_feedback(plant_id);
create index if not exists operator_feedback_created_at_idx on public.operator_feedback(created_at desc);
create index if not exists operator_feedback_protocol_id_idx on public.operator_feedback(protocol_id) where protocol_id is not null;

alter table public.operator_feedback enable row level security;

drop policy if exists "operators read own plant feedback" on public.operator_feedback;
create policy "operators read own plant feedback"
  on public.operator_feedback
  for select
  using (
    exists (
      select 1
      from public.plant_users pu
      where pu.plant_id = operator_feedback.plant_id
        and lower(pu.user_email) = lower(auth.jwt() ->> 'email')
    )
  );

drop policy if exists "operators write own plant feedback" on public.operator_feedback;
create policy "operators write own plant feedback"
  on public.operator_feedback
  for insert
  with check (
    exists (
      select 1
      from public.plant_users pu
      where pu.plant_id = operator_feedback.plant_id
        and lower(pu.user_email) = lower(auth.jwt() ->> 'email')
    )
    and user_id = auth.uid()
  );

-- Service role (Atlas/Tyler) can read everything for week-summary export
-- (no policy needed; service role bypasses RLS by default)

comment on table public.operator_feedback is
  'Operator-week product feedback per TASK-144. Five confusion dimensions (F1-F5) plus binary would-use PMF signal (F6). Legal/billing/refund issues live in operator_legal_intake, NOT here.';
-- TASK-144 — Legal/billing/refund intake table (separate from product feedback)
-- Apply order: 001 → 002
-- Atlas applies via Supabase dashboard or `supabase db push`; Lab does NOT apply.
-- Source: ~/lab/output/TASK-144-operator-week-capture/spec.md §5b

create table if not exists public.operator_legal_intake (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  category text not null check (category in (
    'refund',
    'billing-dispute',
    'damaged-garment',
    'terms-question',
    'other-legal'
  )),
  description text not null,
  contact_method text check (contact_method in ('email', 'phone', 'in-app')),
  contact_value text,

  status text not null default 'unread' check (status in (
    'unread',
    'in-review',
    'attorney-routed',
    'resolved'
  )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operator_legal_intake_plant_id_idx on public.operator_legal_intake(plant_id);
create index if not exists operator_legal_intake_status_idx on public.operator_legal_intake(status);
create index if not exists operator_legal_intake_created_at_idx on public.operator_legal_intake(created_at desc);

alter table public.operator_legal_intake enable row level security;

drop policy if exists "operators read own legal" on public.operator_legal_intake;
create policy "operators read own legal"
  on public.operator_legal_intake
  for select
  using (
    exists (
      select 1
      from public.plant_users pu
      where pu.plant_id = operator_legal_intake.plant_id
        and lower(pu.user_email) = lower(auth.jwt() ->> 'email')
    )
  );

drop policy if exists "operators write own legal" on public.operator_legal_intake;
create policy "operators write own legal"
  on public.operator_legal_intake
  for insert
  with check (
    exists (
      select 1
      from public.plant_users pu
      where pu.plant_id = operator_legal_intake.plant_id
        and lower(pu.user_email) = lower(auth.jwt() ->> 'email')
    )
    and user_id = auth.uid()
  );

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists operator_legal_intake_updated_at on public.operator_legal_intake;
create trigger operator_legal_intake_updated_at
  before update on public.operator_legal_intake
  for each row execute function public.set_updated_at();

comment on table public.operator_legal_intake is
  'TASK-144 separate intake for refund/billing/legal. Routed away from operator_feedback to keep product feedback clean from legal-sensitive content. Attorney-visibility expected.';
