// lib/payments/__tests__/webhook-route.test.ts
//
// Regression tests for the LemonSqueezy webhook route handler.
// Mocks @supabase/supabase-js to exercise the real route module without DB I/O.
// Complements webhook-helpers.test.ts (which covers the pure helpers in
// isolation) by proving the route's end-to-end response codes, retryable-vs-
// non-retryable error handling, and upsert payloads.
//
// Established 2026-05-15 from TASK-209 lane #2 scaffolding. See
// ~/lab/output/TASK-209-checkout-webhook-e2e/README.md for the full E2E
// pass/fail matrix and gated-Supabase next steps.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmac } from 'crypto';

// Env MUST be set before route module is imported (assertRequiredEnv runs at module load).
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'probe-secret-do-not-deploy';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://probe.supabase.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'probe-service-role-key';

type DbCall = { table: string; op: string; args: unknown };
const dbCalls: DbCall[] = [];
let ledgerExisting: { processed: boolean; event_ts?: string | null } | null = null;
let plantMembership: { user_email: string } | null = null;
let entitlementExisting: { updated_at: string | null } | null = null;

function makeQueryBuilder(table: string) {
  const state: { op: string; args: Record<string, unknown> } = { op: '', args: {} };
  const builder: Record<string, unknown> = {
    select: vi.fn((...a: unknown[]) => { state.args.select = a; return builder; }),
    eq: vi.fn((k: string, v: unknown) => { state.args[`eq_${k}`] = v; return builder; }),
    maybeSingle: vi.fn(async () => {
      dbCalls.push({ table, op: 'select.maybeSingle', args: { ...state.args } });
      if (table === 'lemonsqueezy_webhook_events') return { data: ledgerExisting, error: null };
      if (table === 'plant_users') return { data: plantMembership, error: null };
      if (table === 'plant_entitlements') return { data: entitlementExisting, error: null };
      return { data: null, error: null };
    }),
    upsert: vi.fn(async (row: unknown, opts: unknown) => {
      dbCalls.push({ table, op: 'upsert', args: { row, opts } });
      return { data: null, error: null };
    }),
    update: vi.fn((patch: unknown) => {
      dbCalls.push({ table, op: 'update', args: { patch } });
      return { eq: vi.fn(async () => ({ data: null, error: null })) };
    }),
  };
  return builder;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => makeQueryBuilder(table)),
  })),
}));

const { POST } = await import('@/app/api/webhooks/lemonsqueezy/route');

function sign(body: string, secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!) {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function makeReq(body: string, headers: Record<string, string>) {
  return new Request('https://probe.invalid/api/webhooks/lemonsqueezy', {
    method: 'POST',
    headers,
    body,
  }) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  dbCalls.length = 0;
  ledgerExisting = null;
  plantMembership = null;
  entitlementExisting = null;
});

describe('LS webhook route handler', () => {
  it('rejects bad signature with 400 before any DB call', async () => {
    const body = JSON.stringify({ event: 'x' });
    const res = await POST(makeReq(body, {
      'X-Event-Name': 'order_created',
      'X-Event-Id': 'evt_bad_sig',
      'X-Signature': 'a'.repeat(64),
    }));
    expect(res.status).toBe(400);
    expect(dbCalls.length).toBe(0);
  });

  it('returns 200 idempotent when ledger reports event already processed', async () => {
    ledgerExisting = { processed: true };
    const evt = { meta: { event_name: 'order_created' }, data: { id: 'ord_1', attributes: { user_email: 'a@b.com', first_order_item: { product_name: 'GONR Spotter' }, updated_at: '2026-05-15T19:00:00Z' } } };
    const body = JSON.stringify(evt);
    const res = await POST(makeReq(body, {
      'X-Event-Name': 'order_created',
      'X-Event-Id': 'evt_replayed',
      'X-Signature': sign(body),
    }));
    const json = await (res as Response).json();
    expect(res.status).toBe(200);
    expect(json.idempotent).toBe(true);
  });

  it('upserts legacy subscriptions on order_created with valid signature', async () => {
    const evt = { meta: { event_name: 'order_created' }, data: { id: 'ord_2', attributes: { order_number: 'GO-1', user_email: 'New@Example.com', status: 'paid', first_order_item: { product_name: 'GONR Spotter' }, updated_at: '2026-05-15T19:00:00Z' } } };
    const body = JSON.stringify(evt);
    const res = await POST(makeReq(body, {
      'X-Event-Name': 'order_created',
      'X-Event-Id': 'evt_legacy_order',
      'X-Signature': sign(body),
    }));
    expect(res.status).toBe(200);
    const subUpsert = dbCalls.find(c => c.table === 'subscriptions' && c.op === 'upsert');
    expect(subUpsert).toBeDefined();
    const row = (subUpsert!.args as { row: { email: string; tier: string; status: string } }).row;
    expect(row.email).toBe('new@example.com');
    expect(row.tier).toBe('spotter');
    expect(row.status).toBe('active');
  });

  it('returns 422 retryable on SB event missing custom_data.plant_id (ledger not marked)', async () => {
    const evt = { meta: { event_name: 'subscription_created' }, data: { id: 'sub_1', attributes: { user_email: 'plant@example.com', status: 'active', product_name: 'SpottingBoard Pro', first_subscription_item: { variant_id: 9000002 }, renews_at: '2026-06-15T00:00:00Z', updated_at: '2026-05-15T19:11:00Z' } } };
    const body = JSON.stringify(evt);
    const res = await POST(makeReq(body, {
      'X-Event-Name': 'subscription_created',
      'X-Event-Id': 'evt_sb_no_plant',
      'X-Signature': sign(body),
    }));
    expect(res.status).toBe(422);
    const json = await (res as Response).json();
    expect(json.error).toBe('missing_plant_id');
    const ledgerUpdate = dbCalls.find(c => c.table === 'lemonsqueezy_webhook_events' && c.op === 'update');
    expect(ledgerUpdate).toBeUndefined();
  });

  it('upserts plant_entitlements on SB subscription_created with valid plant member', async () => {
    plantMembership = { user_email: 'plant@example.com' };
    const evt = { meta: { event_name: 'subscription_created' }, data: { id: 'sub_2', attributes: { user_email: 'Plant@Example.com', status: 'active', product_name: 'SpottingBoard Pro', first_subscription_item: { variant_id: 9000002 }, renews_at: '2026-06-15T00:00:00Z', updated_at: '2026-05-15T19:11:00Z', custom_data: { plant_id: 'plant-uuid-1' } } } };
    const body = JSON.stringify(evt);
    const res = await POST(makeReq(body, {
      'X-Event-Name': 'subscription_created',
      'X-Event-Id': 'evt_sb_happy',
      'X-Signature': sign(body),
    }));
    expect(res.status).toBe(200);
    const peUpsert = dbCalls.find(c => c.table === 'plant_entitlements' && c.op === 'upsert');
    expect(peUpsert).toBeDefined();
    const row = (peUpsert!.args as { row: { plant_id: string; product: string; status: string; billing_email: string } }).row;
    expect(row.plant_id).toBe('plant-uuid-1');
    expect(row.product).toBe('spottingboard_pro');
    expect(row.status).toBe('active');
    expect(row.billing_email).toBe('plant@example.com');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TASK-209 Step B-mock — expanded route-handler matrix (idempotency,
  // plant_users denial, SB lifecycle transitions, ordering guard, legacy
  // updates). Mocked Supabase only — see ~/lab/output/TASK-209-checkout-
  // webhook-e2e/README.md for the legs still blocked on a non-prod project.
  // ───────────────────────────────────────────────────────────────────────────

  // Test helpers ------------------------------------------------------------
  function sbEvt(eventName: string, overrides: Record<string, unknown> = {}, plantId: string | null = 'plant-uuid-1') {
    const attributes: Record<string, unknown> = {
      user_email: 'plant@example.com',
      status: 'active',
      product_name: 'SpottingBoard Pro',
      renews_at: '2026-06-15T00:00:00Z',
      updated_at: '2026-05-15T19:11:00Z',
      ...overrides,
    };
    if (plantId !== null) attributes.custom_data = { plant_id: plantId };
    return { meta: { event_name: eventName }, data: { id: 'sub_test_' + Math.random().toString(36).slice(2, 8), attributes } };
  }

  async function fire(eventName: string, body: string, eventId = 'evt_' + eventName + '_' + Date.now()) {
    return POST(makeReq(body, {
      'X-Event-Name': eventName,
      'X-Event-Id': eventId,
      'X-Signature': sign(body),
    }));
  }

  function peUpsertRow() {
    const call = dbCalls.find(c => c.table === 'plant_entitlements' && c.op === 'upsert');
    expect(call).toBeDefined();
    return (call!.args as { row: Record<string, unknown> }).row;
  }

  // ── plant_users denial paths (TASK-157 P0-2) ─────────────────────────────
  it('returns 422 retryable when billing email is not a member of the target plant', async () => {
    plantMembership = null; // explicit
    const evt = sbEvt('subscription_created');
    const body = JSON.stringify(evt);
    const res = await fire('subscription_created', body, 'evt_sb_not_member');
    expect(res.status).toBe(422);
    const json = await (res as Response).json();
    expect(json.error).toBe('billing_email_not_member_of_plant');
    const ledgerUpdate = dbCalls.find(c => c.table === 'lemonsqueezy_webhook_events' && c.op === 'update');
    expect(ledgerUpdate).toBeUndefined(); // retryable: do not mark processed
  });

  // ── SB lifecycle transitions (status mapping) ────────────────────────────
  it('subscription_payment_failed → past_due with grace metadata', async () => {
    plantMembership = { user_email: 'plant@example.com' };
    const evt = sbEvt('subscription_payment_failed', { status: 'past_due' });
    const res = await fire('subscription_payment_failed', JSON.stringify(evt), 'evt_sb_past_due');
    expect(res.status).toBe(200);
    const row = peUpsertRow();
    expect(row.status).toBe('past_due');
    expect((row.metadata as Record<string, unknown>).past_due_grace_until).toBeTypeOf('string');
  });

  it('subscription_cancelled → cancelled, cancelled_at set, period preserved', async () => {
    plantMembership = { user_email: 'plant@example.com' };
    const evt = sbEvt('subscription_cancelled', { status: 'cancelled' });
    const res = await fire('subscription_cancelled', JSON.stringify(evt), 'evt_sb_cancelled');
    expect(res.status).toBe(200);
    const row = peUpsertRow();
    expect(row.status).toBe('cancelled');
    expect(row.cancelled_at).toBeTypeOf('string');
    expect(row.current_period_end_at).toBe('2026-06-15T00:00:00Z'); // renews_at preserved
  });

  it('subscription_expired → expired, period nulled', async () => {
    plantMembership = { user_email: 'plant@example.com' };
    const evt = sbEvt('subscription_expired', { status: 'expired' });
    const res = await fire('subscription_expired', JSON.stringify(evt), 'evt_sb_expired');
    expect(res.status).toBe(200);
    const row = peUpsertRow();
    expect(row.status).toBe('expired');
    expect(row.current_period_end_at).toBeNull();
  });

  it('subscription_paused → paused', async () => {
    plantMembership = { user_email: 'plant@example.com' };
    const evt = sbEvt('subscription_paused', { status: 'paused' });
    const res = await fire('subscription_paused', JSON.stringify(evt), 'evt_sb_paused');
    expect(res.status).toBe(200);
    const row = peUpsertRow();
    expect(row.status).toBe('paused');
  });

  it('order_refunded → expired', async () => {
    plantMembership = { user_email: 'plant@example.com' };
    const evt = sbEvt('order_refunded', { product_name: 'Starter Pack', refunded_at: '2026-05-15T19:30:00Z' }, 'plant-uuid-1');
    // starter_pack is one-time; route allows order_refunded for it.
    const res = await fire('order_refunded', JSON.stringify(evt), 'evt_sb_refund');
    expect(res.status).toBe(200);
    const row = peUpsertRow();
    expect(row.status).toBe('expired');
  });

  // ── order_created branching (recurring deferred vs one-time applied) ─────
  it('SB order_created for recurring product defers to subscription_created (ledger marked, no upsert)', async () => {
    plantMembership = { user_email: 'plant@example.com' };
    const evt = sbEvt('order_created', { product_name: 'SpottingBoard Pro', order_number: 'SB-100' });
    const res = await fire('order_created', JSON.stringify(evt), 'evt_sb_recur_order');
    expect(res.status).toBe(200);
    const json = await (res as Response).json();
    expect(json.deferred).toBe('subscription_created');
    expect(dbCalls.find(c => c.table === 'plant_entitlements' && c.op === 'upsert')).toBeUndefined();
    const ledgerMark = dbCalls.find(c => c.table === 'lemonsqueezy_webhook_events' && c.op === 'update');
    expect(ledgerMark).toBeDefined();
  });

  it('SB order_created for starter_pack (one-time) upserts with 30-day window', async () => {
    plantMembership = { user_email: 'plant@example.com' };
    const evt = sbEvt('order_created', { product_name: 'Starter Pack', order_number: 'SB-101' });
    const res = await fire('order_created', JSON.stringify(evt), 'evt_sb_starter_order');
    expect(res.status).toBe(200);
    const row = peUpsertRow();
    expect(row.product).toBe('starter_pack');
    expect(row.status).toBe('active');
    expect(row.current_period_end_at).toBeTypeOf('string');
    // 30-day window: end should be ~30 days from now (allow generous slop)
    const endMs = new Date(row.current_period_end_at as string).getTime();
    const expectedMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(endMs - expectedMs)).toBeLessThan(60 * 1000); // within 60s
  });

  // ── Unrecognized-but-looks-like-SB product (TASK-157 P1-8) ───────────────
  it('looks-like-SB product that does not resolve returns 422 unrecognized_sb_product (ledger marked)', async () => {
    plantMembership = { user_email: 'plant@example.com' };
    // "GONR Addon Variant Bundle" matches the route's lookalike regex
    // (`/gonr\s*addon/`) but does not match any substring in
    // resolveSpottingBoardProduct → resolver returns null → 422.
    const evt = sbEvt('subscription_created', { product_name: 'GONR Addon Variant Bundle' });
    const res = await fire('subscription_created', JSON.stringify(evt), 'evt_sb_lookalike');
    expect(res.status).toBe(422);
    const json = await (res as Response).json();
    expect(json.error).toBe('unrecognized_sb_product');
    // Non-retryable: ledger IS marked (so LS does not retry indefinitely).
    const ledgerMark = dbCalls.find(c => c.table === 'lemonsqueezy_webhook_events' && c.op === 'update');
    expect(ledgerMark).toBeDefined();
  });

  // ── Ordering guard (stale event refusal) ─────────────────────────────────
  it('skips upsert when incoming eventTs is older than existing plant_entitlements.updated_at', async () => {
    plantMembership = { user_email: 'plant@example.com' };
    // Existing row was updated AFTER the incoming event's timestamp.
    entitlementExisting = { updated_at: '2026-05-15T20:00:00Z' };
    const evt = sbEvt('subscription_updated', { status: 'active', updated_at: '2026-05-15T19:00:00Z' });
    const res = await fire('subscription_updated', JSON.stringify(evt), 'evt_sb_stale');
    expect(res.status).toBe(200);
    const json = await (res as Response).json();
    expect(json.result).toBe('stale_event_skipped');
    expect(dbCalls.find(c => c.table === 'plant_entitlements' && c.op === 'upsert')).toBeUndefined();
  });

  // ── Legacy GONR consumer path (the other two events) ─────────────────────
  it('legacy subscription_updated (active) writes subscriptions with status=active', async () => {
    const evt = { meta: { event_name: 'subscription_updated' }, data: { id: 'sub_legacy_1', attributes: { user_email: 'legacy@example.com', status: 'active', product_name: 'GONR Spotter', variant_id: 1404897, updated_at: '2026-05-15T19:05:00Z' } } };
    const res = await fire('subscription_updated', JSON.stringify(evt), 'evt_legacy_update_active');
    expect(res.status).toBe(200);
    const sub = dbCalls.find(c => c.table === 'subscriptions' && c.op === 'upsert');
    expect(sub).toBeDefined();
    const row = (sub!.args as { row: { status: string; tier: string } }).row;
    expect(row.status).toBe('active');
    expect(row.tier).toBe('spotter');
  });

  it('legacy subscription_cancelled writes subscriptions.update with status=cancelled (not upsert)', async () => {
    const evt = { meta: { event_name: 'subscription_cancelled' }, data: { id: 'sub_legacy_2', attributes: { user_email: 'legacy@example.com', status: 'cancelled', product_name: 'GONR Spotter', updated_at: '2026-05-15T19:07:00Z' } } };
    const res = await fire('subscription_cancelled', JSON.stringify(evt), 'evt_legacy_cancel');
    expect(res.status).toBe(200);
    const subUpdate = dbCalls.find(c => c.table === 'subscriptions' && c.op === 'update');
    expect(subUpdate).toBeDefined();
    const patch = (subUpdate!.args as { patch: { status: string } }).patch;
    expect(patch.status).toBe('cancelled');
    // The cancellation path uses `.update()` not `.upsert()`.
    expect(dbCalls.find(c => c.table === 'subscriptions' && c.op === 'upsert')).toBeUndefined();
  });
});
