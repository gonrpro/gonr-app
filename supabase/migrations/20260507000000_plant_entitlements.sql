-- TASK-154 — plant-scoped entitlements + LemonSqueezy webhook idempotency ledger
-- Status: REVIEW DRAFT. Apply lane is Atlas's. Do not run against any cluster
--         until Atlas has cleared this DDL and the LemonSqueezy product layout
--         has been approved by Tyler.
--
-- Atlas wiring decisions folded in (2026-05-07):
--   - Product key for plant-scoped GONR runtime add-on is `plant_brain_runtime`,
--     NOT `gonr_operator_addon`. The user-facing name is "Plant Brain Runtime".
--     The existing user-scoped GONR Operator tier in `subscriptions` is left
--     untouched.
--   - Recurring products require `ls_subscription_id`; one-time products
--     (starter_pack) do not. Enforced via partial CHECK at the table level so
--     the contract is visible from the schema, not buried in app code.
--   - Free caps live in code (`lib/entitlements/free-limits.ts`). NO row count
--     constraint added here for plant_brain_items; that path was rejected.
--   - Idempotency ledger required (Atlas decision 8). Conservative
--     timestamp/period guard is enforced in the webhook handler, not the DDL.
--   - Founder bypass is env-driven in code; no founders table here.
--
-- Dependency: this migration uses public.set_updated_at() defined in
--   ~/lab/output/TASK-150-ddl-rls-review-package/migration-ready.sql
-- If the TASK-150 helper has not been applied yet, copy the function definition
-- from that file to the top of this migration before applying.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- plant_entitlements
-- One row per (plant, product). Plants without any active row are on Free.
-- Service-role writes only (webhook + admin scripts). RLS allows tenant reads.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.plant_entitlements (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,

  -- Product key. Atlas decision 1: rename to plant_brain_runtime.
  product text not null check (product in (
    'spottingboard_pro',
    'starter_pack',
    'plant_brain_runtime'
  )),

  status text not null default 'active' check (status in (
    'active',
    'past_due',
    'cancelled',
    'paused',
    'expired'
  )),

  -- LemonSqueezy customer identity. Not necessarily a plant member.
  billing_email text not null,

  ls_subscription_id text,                  -- null for one-time purchases (starter_pack)
  ls_order_id text,                          -- last successful order
  ls_variant_id text,                        -- LS variant authoritative for product mapping

  started_at timestamptz not null default now(),
  current_period_end_at timestamptz,         -- recurring SKUs only
  cancelled_at timestamptz,

  -- Free-form metadata: past_due_grace_until, refund_reason, plan-change history
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Atlas decision: recurring products MUST carry an ls_subscription_id;
  -- starter_pack (one-time) is exempt. Visible at the schema layer instead of
  -- relying on app-side validation.
  constraint plant_entitlements_recurring_requires_subscription_id check (
    product = 'starter_pack'
    or ls_subscription_id is not null
  ),

  unique (plant_id, product)
);

create index if not exists idx_plant_entitlements_plant
  on public.plant_entitlements (plant_id);

create index if not exists idx_plant_entitlements_billing_email
  on public.plant_entitlements (billing_email);

-- Hot-path: "is this plant entitled to product X right now?"
create index if not exists idx_plant_entitlements_active
  on public.plant_entitlements (plant_id, product)
  where status = 'active';

create index if not exists idx_plant_entitlements_period_end
  on public.plant_entitlements (current_period_end_at)
  where status in ('active', 'past_due');

-- updated_at trigger (uses TASK-150 helper)
drop trigger if exists trg_plant_entitlements_updated_at on public.plant_entitlements;
create trigger trg_plant_entitlements_updated_at
  before update on public.plant_entitlements
  for each row execute function public.set_updated_at();

-- RLS
alter table public.plant_entitlements enable row level security;

-- Service role: full access (webhook + admin scripts)
drop policy if exists plant_entitlements_service_full on public.plant_entitlements;
create policy plant_entitlements_service_full
  on public.plant_entitlements
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Members of the plant: read-only
drop policy if exists plant_entitlements_member_read on public.plant_entitlements;
create policy plant_entitlements_member_read
  on public.plant_entitlements
  for select
  using (
    exists (
      select 1 from public.plant_users pu
      where pu.plant_id = plant_entitlements.plant_id
        and pu.user_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- lemonsqueezy_webhook_events
-- Idempotency ledger. Webhook checks event_id before processing; if present
-- and processed=true, returns 200 immediately without rewriting state.
--
-- Atlas decision 8: also support conservative timestamp/period guard. We store
-- the event timestamp from LS so the handler can refuse stale events that
-- would roll back a more recent state.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.lemonsqueezy_webhook_events (
  event_id text primary key,
  event_name text not null,
  event_ts timestamptz,                      -- LS attributes.updated_at on the row
  received_at timestamptz not null default now(),
  processed boolean not null default false,
  processed_at timestamptz,
  processing_result text,                    -- 'ok', 'unknown_variant', 'missing_plant_id', 'stale_event_skipped', etc.
  payload_digest text                        -- sha256 of raw body for audit
);

create index if not exists idx_ls_webhook_events_event_name
  on public.lemonsqueezy_webhook_events (event_name);

create index if not exists idx_ls_webhook_events_received_at
  on public.lemonsqueezy_webhook_events (received_at desc);

-- RLS: service-role only. No tenant read path.
alter table public.lemonsqueezy_webhook_events enable row level security;

drop policy if exists ls_webhook_events_service_full on public.lemonsqueezy_webhook_events;
create policy ls_webhook_events_service_full
  on public.lemonsqueezy_webhook_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- Apply notes for Atlas
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. set_updated_at() comes from TASK-150 migration. If TASK-150 has not been
--    applied yet, prepend its definition before this migration. Otherwise the
--    create trigger statement at line 92 will fail.
--
-- 2. The member-read RLS policy assumes plant_users.user_email is lowercase.
--    TASK-144 fix already aligned that. If a stray uppercase row exists,
--    reads silently miss. Recommend running:
--      update public.plant_users set user_email = lower(user_email)
--        where user_email != lower(user_email);
--    before applying.
--
-- 3. No plant_entitlements_log table for now. Entitlement history can be
--    reconstructed from lemonsqueezy_webhook_events if needed. Atlas can add a
--    denormalized audit trail later if support workflows require it.
--
-- 4. The recurring-requires-subscription-id constraint will reject any naive
--    insert that forgets to pass ls_subscription_id for an SBPro or
--    Plant Brain Runtime row. This is intentional — the schema enforces the webhook's
--    contract.
