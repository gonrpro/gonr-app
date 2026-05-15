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
      return { eq: vi.fn(async (_k: string, _v: unknown) => ({ data: null, error: null })) };
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
});
