-- SpottingBoard / Plant Brain v1 DDL + RLS — MIGRATION-READY REVIEW PACKAGE
-- Date: 2026-05-05
-- Owner: Atlas (DDL author) + Lab (SB-002 fixes folded in)
-- Status: review draft for SB-002 second-pass review; do not apply until SB clears.
-- Base chassis: existing public.plants + public.plant_users from TASK-023
-- Scope: manual-only ETL, tenant-scoped by plant_id, RLS enforced, no automatic central promotion
--
-- Changes from Atlas draft 2026-05-05 (~/shared-workspace/spottingboard-plant-brain-ddl-rls-2026-05-05.sql):
--   FIX-1 (SB msg 526) — runtime_eligible default flipped from true → false (fail-closed)
--   FIX-2 (SB msg 526) — added current safety_label column to plant_brain_items (5-label enum)
--   FIX-3 (SB msg 526) — composite check on promotion_status='promoted' requires source-backed + safety_label=source_backed + reviewed-accept + non-empty source_evidence + runtime_eligible
--   FIX-4 (SB msg 526) — composite check on authority_class='source-backed' requires non-empty source_evidence
--
-- App-layer requirements paired with this DDL (Atlas msg 529):
--   - server insert helpers require explicit actor email/id; never rely on auth.jwt() for service-role writes
--   - server insert helpers reject empty tenant_provenance; minimum shape = {plant_id, captured_by, captured_at, capture_method}
--   - runtime context builder splits recommendation-eligible vs warning-eligible queries
-- See lib/db-helpers.ts and api-stubs/runtime-context.ts.

begin;

-- Optional but expected in Supabase projects. Safe if already present.
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: updated_at
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- plant_brain_items
-- One tenant-owned captured item: rule, chemistry, escalation, training check, reference, printout, etc.
-- All 9 contamination-control fields + current safety_label are preserved on every row.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.plant_brain_items (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,

  -- Module classification (SB requirement msg 522): early classification at intake.
  module text not null check (module in (
    'procedure',
    'chemistry_rule',
    'escalation_rule',
    'training_check',
    'reference_sop',
    'printout',
    'preference',
    'tribal_note',
    'plant_profile'
  )),
  title text,
  body text not null,

  -- 1/9: authority/provenance class. Not the same as review status.
  authority_class text not null default 'unverified-tribal' check (authority_class in (
    'source-backed',
    'plant-local',
    'unverified-tribal',
    'supervisor-only',
    'rejected'
  )),

  -- 2/9: where this row may flow. v1 only writes private-only/review-candidate manually.
  feed_mode text not null default 'private-only' check (feed_mode in (
    'private-only',
    'anonymous-signal',
    'review-candidate',
    'promoted-central'
  )),

  -- 3/9: consent record. Required object; app validates shape more strictly.
  consent jsonb not null default '{"mode":"private-only"}'::jsonb,

  -- 4/9: tenant provenance. Required object.
  -- App layer (lib/db-helpers.ts) rejects writes with empty tenant_provenance and requires
  -- minimum shape {plant_id, captured_by, captured_at, capture_method}.
  tenant_provenance jsonb not null default '{}'::jsonb,

  -- 5/9: review state. Review acceptance never changes authority_class by itself.
  review_status text not null default 'unreviewed' check (review_status in (
    'unreviewed',
    'in-review',
    'reviewed-accept',
    'reviewed-reject'
  )),

  -- 6/9: central-promotion lifecycle. No automation in v1.
  promotion_status text not null default 'never-promoted' check (promotion_status in (
    'never-promoted',
    'promoted',
    'demoted'
  )),

  -- 7/9: safety/business risk tier.
  risk_tier text not null default 'safe-default' check (risk_tier in (
    'safe-default',
    'requires-supervisor',
    'high-risk',
    'claim-sensitive'
  )),

  -- 8/9: source/protocol/safety evidence array.
  source_evidence jsonb not null default '[]'::jsonb,

  -- 9/9: conflicts detected against source-backed defaults / safety taxonomy.
  conflict_flags jsonb not null default '[]'::jsonb,

  -- SB FIX-2: current safety label. Brain Library / export / GONR bridge query this directly.
  -- Distinct from review_status: a row can be reviewed-accept yet still safety_label = needs_source_review.
  safety_label text not null default 'needs_source_review' check (safety_label in (
    'source_backed',
    'reviewed_for_plant_use',
    'needs_source_review',
    'escalation_required',
    'unsafe_do_not_use'
  )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- App layer (lib/db-helpers.ts) requires explicit actor on service-role inserts. The default
  -- below is a fallback for user-context inserts only; service routes must pass created_by.
  created_by text not null default (auth.jwt() ->> 'email'),
  reviewer_email text,
  reviewed_at timestamptz,

  constraint plant_brain_items_consent_is_object check (jsonb_typeof(consent) = 'object'),
  constraint plant_brain_items_tenant_provenance_is_object check (jsonb_typeof(tenant_provenance) = 'object'),
  constraint plant_brain_items_source_evidence_is_array check (jsonb_typeof(source_evidence) = 'array'),
  constraint plant_brain_items_conflict_flags_is_array check (jsonb_typeof(conflict_flags) = 'array'),

  -- Existing constraint: a row cannot be promoted while still unreviewed/rejected.
  constraint plant_brain_items_promoted_requires_review_accept check (
    promotion_status != 'promoted' or review_status = 'reviewed-accept'
  ),

  -- Existing constraint: rejected authority cannot look accepted.
  constraint plant_brain_items_rejected_not_accepted check (
    authority_class != 'rejected' or review_status = 'reviewed-reject'
  ),

  -- SB FIX-1 + Atlas msg 524: runtime_eligible defaults to false (fail-closed).
  -- A row can be runtime_eligible = true ONLY when authority/review/risk/conflict gates all pass.
  runtime_eligible boolean not null default false,
  constraint plant_brain_items_runtime_requires_safe_state check (
    runtime_eligible = false
    or (
      authority_class in ('source-backed', 'plant-local')
      and review_status = 'reviewed-accept'
      and risk_tier in ('safe-default', 'requires-supervisor')
      and jsonb_array_length(conflict_flags) = 0
      and safety_label in ('source_backed', 'reviewed_for_plant_use')
    )
  ),

  -- SB FIX-3: central promotion is the strongest gate. Promoted rows must be source-backed,
  -- safety_label=source_backed, review-accepted, have evidence, and be runtime-eligible.
  constraint plant_brain_items_promoted_requires_source_backed check (
    promotion_status != 'promoted'
    or (
      authority_class = 'source-backed'
      and safety_label = 'source_backed'
      and review_status = 'reviewed-accept'
      and jsonb_array_length(source_evidence) > 0
      and runtime_eligible = true
    )
  ),

  -- SB FIX-4: source-backed authority must carry source evidence. Otherwise the label is unearned.
  constraint plant_brain_items_source_backed_requires_evidence check (
    authority_class != 'source-backed'
    or jsonb_array_length(source_evidence) > 0
  ),

  -- SB second-pass FIX-5 (Atlas msg 539): feed_mode='promoted-central' must satisfy the same
  -- source-backed gate as promotion_status='promoted'. Without this, a reviewer could set
  -- feed_mode='promoted-central' on a tribal/unverified row and it would land in any aggregate
  -- consumer that filters on feed_mode alone.
  constraint plant_brain_items_promoted_central_feed_requires_source_backed check (
    feed_mode != 'promoted-central'
    or (
      authority_class = 'source-backed'
      and safety_label = 'source_backed'
      and review_status = 'reviewed-accept'
      and jsonb_array_length(source_evidence) > 0
      and runtime_eligible = true
    )
  )
);

create index if not exists idx_plant_brain_items_plant_id
  on public.plant_brain_items (plant_id);

create index if not exists idx_plant_brain_items_plant_module
  on public.plant_brain_items (plant_id, module);

create index if not exists idx_plant_brain_items_review_queue
  on public.plant_brain_items (plant_id, review_status, risk_tier)
  where review_status in ('unreviewed', 'in-review');

create index if not exists idx_plant_brain_items_authority
  on public.plant_brain_items (plant_id, authority_class);

create index if not exists idx_plant_brain_items_safety_label
  on public.plant_brain_items (plant_id, safety_label);

create index if not exists idx_plant_brain_items_runtime
  on public.plant_brain_items (plant_id, runtime_eligible)
  where runtime_eligible = true;

create index if not exists idx_plant_brain_items_conflicts_gin
  on public.plant_brain_items using gin (conflict_flags);

create index if not exists idx_plant_brain_items_source_evidence_gin
  on public.plant_brain_items using gin (source_evidence);

drop trigger if exists trg_plant_brain_items_updated_at on public.plant_brain_items;
create trigger trg_plant_brain_items_updated_at
  before update on public.plant_brain_items
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- plant_brain_promotion_log
-- Append-only audit trail for review/promotion/demotion decisions.
-- Records who/why/source basis/safety-label changed, not just status transitions.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.plant_brain_promotion_log (
  id uuid primary key default gen_random_uuid(),
  plant_brain_item_id uuid not null references public.plant_brain_items(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  change_type text not null check (change_type in (
    'authority_class',
    'risk_tier',
    'review_status',
    'promotion_status',
    'source_evidence',
    'runtime_eligibility',
    'conflict_flags',
    'safety_label'
  )),
  from_value jsonb,
  to_value jsonb not null,
  decided_by text not null default (auth.jwt() ->> 'email'),
  reason text not null,
  source_basis jsonb not null default '[]'::jsonb,
  safety_label text not null check (safety_label in (
    'source_backed',
    'reviewed_for_plant_use',
    'needs_source_review',
    'escalation_required',
    'unsafe_do_not_use'
  )),
  metadata jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null default now(),

  constraint plant_brain_promotion_log_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint plant_brain_promotion_log_source_basis_is_array check (jsonb_typeof(source_basis) = 'array')
);

create index if not exists idx_plant_brain_promotion_log_plant
  on public.plant_brain_promotion_log (plant_id, decided_at desc);

create index if not exists idx_plant_brain_promotion_log_item
  on public.plant_brain_promotion_log (plant_brain_item_id, decided_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- Existing role model: plant_users.role in ('owner','operator','spotter')
-- owner: read/insert/update/delete/export/promote
-- operator: read/insert/update non-destructive capture/review fields; no delete
-- spotter: read-only
-- service role bypasses RLS for ETL/review routes; insert helpers enforce app-layer gates.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.plant_brain_items enable row level security;
alter table public.plant_brain_promotion_log enable row level security;

-- plant_brain_items SELECT: any member of the plant.
drop policy if exists "plant brain member can read items" on public.plant_brain_items;
create policy "plant brain member can read items" on public.plant_brain_items
  for select
  using (
    exists (
      select 1
      from public.plant_users pu
      where pu.plant_id = plant_brain_items.plant_id
        and pu.user_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- INSERT: owner/operator only for their plant. Spotter cannot author plant-brain rows.
drop policy if exists "plant brain owner operator can insert items" on public.plant_brain_items;
create policy "plant brain owner operator can insert items" on public.plant_brain_items
  for insert
  with check (
    exists (
      select 1
      from public.plant_users pu
      where pu.plant_id = plant_brain_items.plant_id
        and pu.user_email = lower(coalesce(auth.jwt() ->> 'email', ''))
        and pu.role in ('owner', 'operator')
    )
  );

-- UPDATE: owner/operator only for their plant.
drop policy if exists "plant brain owner operator can update items" on public.plant_brain_items;
create policy "plant brain owner operator can update items" on public.plant_brain_items
  for update
  using (
    exists (
      select 1
      from public.plant_users pu
      where pu.plant_id = plant_brain_items.plant_id
        and pu.user_email = lower(coalesce(auth.jwt() ->> 'email', ''))
        and pu.role in ('owner', 'operator')
    )
  )
  with check (
    exists (
      select 1
      from public.plant_users pu
      where pu.plant_id = plant_brain_items.plant_id
        and pu.user_email = lower(coalesce(auth.jwt() ->> 'email', ''))
        and pu.role in ('owner', 'operator')
    )
  );

-- DELETE: owner only.
drop policy if exists "plant brain owner can delete items" on public.plant_brain_items;
create policy "plant brain owner can delete items" on public.plant_brain_items
  for delete
  using (
    exists (
      select 1
      from public.plant_users pu
      where pu.plant_id = plant_brain_items.plant_id
        and pu.user_email = lower(coalesce(auth.jwt() ->> 'email', ''))
        and pu.role = 'owner'
    )
  );

-- promotion_log SELECT: any member of the plant.
drop policy if exists "plant brain member can read promotion log" on public.plant_brain_promotion_log;
create policy "plant brain member can read promotion log" on public.plant_brain_promotion_log
  for select
  using (
    exists (
      select 1
      from public.plant_users pu
      where pu.plant_id = plant_brain_promotion_log.plant_id
        and pu.user_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- promotion_log INSERT: owner/operator only for their plant.
drop policy if exists "plant brain owner operator can insert promotion log" on public.plant_brain_promotion_log;
create policy "plant brain owner operator can insert promotion log" on public.plant_brain_promotion_log
  for insert
  with check (
    exists (
      select 1
      from public.plant_users pu
      where pu.plant_id = plant_brain_promotion_log.plant_id
        and pu.user_email = lower(coalesce(auth.jwt() ->> 'email', ''))
        and pu.role in ('owner', 'operator')
    )
    and exists (
      select 1
      from public.plant_brain_items pbi
      where pbi.id = plant_brain_promotion_log.plant_brain_item_id
        and pbi.plant_id = plant_brain_promotion_log.plant_id
    )
  );

-- No update/delete policies for promotion log. Treat as append-only from client perspective.

-- ─────────────────────────────────────────────────────────────────────────────
-- apply_plant_brain_item_change RPC (SB second-pass FIX-3 / Atlas msg 539)
-- Server-controlled atomic helper: updates plant_brain_items + appends promotion log
-- in one transaction. Replaces the insert-as-update placeholder in db-helpers.ts.
-- Called by API routes via supabase.rpc('apply_plant_brain_item_change', {...}).
-- security definer + explicit plant membership check inside the function.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.apply_plant_brain_item_change(
  p_item_id uuid,
  p_plant_id uuid,
  p_change_type text,
  p_to_value jsonb,
  p_reason text,
  p_source_basis jsonb,
  p_safety_label text,
  p_decided_by text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.plant_brain_items%rowtype;
  v_from_value jsonb;
begin
  -- 1. Validate actor is non-empty (defense in depth; app layer also checks).
  if p_decided_by is null or btrim(p_decided_by) = '' then
    raise exception 'apply_plant_brain_item_change: decided_by required (no anonymous changes)';
  end if;

  -- 2. Lock the row + verify plant scope.
  select * into v_item
  from public.plant_brain_items
  where id = p_item_id and plant_id = p_plant_id
  for update;

  if not found then
    raise exception 'apply_plant_brain_item_change: item % not found in plant %', p_item_id, p_plant_id;
  end if;

  -- 3. Verify caller has owner/operator membership in the plant.
  -- SECURITY DEFINER hardening: authenticated callers may not spoof p_decided_by.
  -- service_role has no end-user JWT and is allowed only when server code supplies explicit p_decided_by.
  if auth.role() = 'authenticated'
    and lower(p_decided_by) != lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'apply_plant_brain_item_change: decided_by must match authenticated caller';
  end if;

  -- TASK-157 fix P0-1: lowercase the comparison since plant_users.user_email is canonically
  -- lowercase (TASK-144 fix) but caller-supplied emails may arrive mixed-case.
  if not exists (
    select 1 from public.plant_users
    where plant_id = p_plant_id
      and user_email = lower(p_decided_by)
      and role in ('owner', 'operator')
  ) then
    raise exception 'apply_plant_brain_item_change: % is not owner/operator of plant %', p_decided_by, p_plant_id;
  end if;

  -- 4. Capture the from_value before update.
  case p_change_type
    when 'authority_class' then v_from_value := to_jsonb(v_item.authority_class);
    when 'risk_tier' then v_from_value := to_jsonb(v_item.risk_tier);
    when 'review_status' then v_from_value := to_jsonb(v_item.review_status);
    when 'promotion_status' then v_from_value := to_jsonb(v_item.promotion_status);
    when 'source_evidence' then v_from_value := v_item.source_evidence;
    when 'runtime_eligibility' then v_from_value := to_jsonb(v_item.runtime_eligible);
    when 'conflict_flags' then v_from_value := v_item.conflict_flags;
    when 'safety_label' then v_from_value := to_jsonb(v_item.safety_label);
    else raise exception 'apply_plant_brain_item_change: unknown change_type %', p_change_type;
  end case;

  -- 5. Apply the change. Composite check constraints fire if invariants violated.
  -- SB third-pass hardening: every UPDATE includes `and plant_id = p_plant_id` belt-and-suspenders
  -- on top of the row already being locked/verified above.
  case p_change_type
    when 'authority_class' then
      update public.plant_brain_items set authority_class = p_to_value #>> '{}', reviewer_email = p_decided_by, reviewed_at = now() where id = p_item_id and plant_id = p_plant_id;
    when 'risk_tier' then
      update public.plant_brain_items set risk_tier = p_to_value #>> '{}' where id = p_item_id and plant_id = p_plant_id;
    when 'review_status' then
      update public.plant_brain_items set review_status = p_to_value #>> '{}', reviewer_email = p_decided_by, reviewed_at = now() where id = p_item_id and plant_id = p_plant_id;
    when 'promotion_status' then
      update public.plant_brain_items set promotion_status = p_to_value #>> '{}' where id = p_item_id and plant_id = p_plant_id;
    when 'source_evidence' then
      update public.plant_brain_items set source_evidence = p_to_value where id = p_item_id and plant_id = p_plant_id;
    when 'runtime_eligibility' then
      update public.plant_brain_items set runtime_eligible = (p_to_value #>> '{}')::boolean where id = p_item_id and plant_id = p_plant_id;
    when 'conflict_flags' then
      -- Atlas policy Q3: adding a conflict_flag must auto-flip runtime_eligible=false.
      -- Caller is expected to pass the new conflict_flags array (with the addition included).
      update public.plant_brain_items set conflict_flags = p_to_value, runtime_eligible = false where id = p_item_id and plant_id = p_plant_id;
    when 'safety_label' then
      update public.plant_brain_items set safety_label = p_to_value #>> '{}' where id = p_item_id and plant_id = p_plant_id;
  end case;

  -- 6. Append promotion log entry (atomic with the update).
  insert into public.plant_brain_promotion_log (
    plant_brain_item_id, plant_id, change_type, from_value, to_value,
    decided_by, reason, source_basis, safety_label, metadata
  ) values (
    p_item_id, p_plant_id, p_change_type, v_from_value, p_to_value,
    p_decided_by, p_reason, p_source_basis, p_safety_label, p_metadata
  );

  -- TASK-157 fix P1-10: conflict_flags change auto-flips runtime_eligible=false (line above).
  -- Write a SECOND promotion_log entry recording the runtime_eligibility transition so the
  -- audit trail surfaces both effects. Only emit when runtime_eligible was previously true
  -- (no-op log row otherwise would be noise).
  if p_change_type = 'conflict_flags' and (v_from_value::text not in ('null', 'false')) then
    -- Probe the row's previous runtime_eligible via v_item (captured before update).
    if v_item.runtime_eligible = true then
      insert into public.plant_brain_promotion_log (
        plant_brain_item_id, plant_id, change_type, from_value, to_value,
        decided_by, reason, source_basis, safety_label, metadata
      ) values (
        p_item_id, p_plant_id, 'runtime_eligibility',
        to_jsonb(true), to_jsonb(false),
        p_decided_by,
        coalesce(p_reason, '') || ' [auto: conflict_flags addition forced runtime_eligible=false]',
        p_source_basis, p_safety_label,
        jsonb_build_object('triggered_by', 'conflict_flags_change')
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'item_id', p_item_id,
    'change_type', p_change_type,
    'from_value', v_from_value,
    'to_value', p_to_value,
    'decided_by', p_decided_by,
    'decided_at', now()
  );
end;
$$;

revoke all on function public.apply_plant_brain_item_change(
  uuid, uuid, text, jsonb, text, jsonb, text, text, jsonb
) from public;
grant execute on function public.apply_plant_brain_item_change(
  uuid, uuid, text, jsonb, text, jsonb, text, text, jsonb
) to authenticated, service_role;

commit;

-- Verification after apply:
-- select table_name from information_schema.tables where table_schema='public' and table_name in ('plant_brain_items','plant_brain_promotion_log');
-- select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('plant_brain_items','plant_brain_promotion_log');
-- select policyname, tablename, cmd from pg_policies where schemaname='public' and tablename in ('plant_brain_items','plant_brain_promotion_log') order by tablename, policyname;
-- select column_name, column_default, is_nullable from information_schema.columns where table_name='plant_brain_items' and column_name in ('runtime_eligible','safety_label') order by column_name;

-- Default insert smoke test (should succeed and produce a fail-closed row).
-- SB second-pass FIX-4 (Atlas msg 539): include explicit created_by because auth.jwt() may be null
-- outside user-context inserts and the not-null constraint will reject the default in that case.
-- insert into plant_brain_items (plant_id, module, body, tenant_provenance, created_by) values (
--   '<a real plant id>', 'procedure', 'test',
--   '{"plant_id":"<id>","captured_by":"a@b.com","captured_at":"2026-05-05T00:00:00Z","capture_method":"ai-intake"}',
--   'a@b.com'
-- );
-- expected: row inserted with authority_class='unverified-tribal', review_status='unreviewed',
-- safety_label='needs_source_review', runtime_eligible=false (fail-closed default), feed_mode='private-only'.

-- promoted-central feed_mode without source-backed gate test (should FAIL — SB FIX-5)
-- update plant_brain_items set feed_mode='promoted-central' where body='test';
-- expected: ERROR: violates plant_brain_items_promoted_central_feed_requires_source_backed
