// lib/entitlements/__tests__/requirePlantEntitlement.test.ts — TASK-154 phase 2 fix #1
//
// Verifies the membership check Atlas flagged in his phase-2 review:
// requirePlantEntitlement must reject when email is NOT a plant_users member
// for the requested plantId, even when entitlement rows exist.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { requirePlantEntitlement } from '../requirePlantEntitlement'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlantEntitlementRow, PlantUserRole } from '../types'

const FOUNDER_ENV = 'PLANT_ENTITLEMENT_FOUNDER_EMAILS'
const originalFounderEnv = process.env[FOUNDER_ENV]

beforeEach(() => {
  delete process.env[FOUNDER_ENV]
})

afterEach(() => {
  if (originalFounderEnv === undefined) delete process.env[FOUNDER_ENV]
  else process.env[FOUNDER_ENV] = originalFounderEnv
})

interface FakeRows {
  plant_users: Array<{ plant_id: string; user_email: string; role: PlantUserRole }>
  plant_entitlements: PlantEntitlementRow[]
}

function fakeClient(rows: FakeRows): SupabaseClient {
  // Minimal Postgrest-shaped mock supporting the calls in
  // resolvePlantEntitlements + verifyPlantMembership: from(table).select(...).eq(col, val).eq(col, val)?.maybeSingle()
  function from(table: keyof FakeRows) {
    let working: any[] = (rows[table] ?? []) as any[]
    const builder = {
      select: (_cols: string) => builder,
      eq: (col: string, val: string) => {
        working = working.filter((r: any) => r[col] === val)
        return builder
      },
      maybeSingle: async () => ({ data: working[0] ?? null, error: null }),
      // resolver path: terminal `.eq(...)` then awaited as a thenable
      then: (resolve: (v: { data: any[]; error: null }) => unknown) =>
        resolve({ data: working, error: null }),
    }
    return builder
  }
  return { from } as unknown as SupabaseClient
}

const PLANT_ID = 'plant-uuid-1'
const MEMBER = 'member@plant.com'
const NON_MEMBER = 'outsider@example.com'

const ACTIVE_SBPRO_ROW: PlantEntitlementRow = {
  id: 'r1',
  plant_id: PLANT_ID,
  product: 'spottingboard_pro',
  status: 'active',
  billing_email: 'owner@plant.com',
  ls_subscription_id: 'sub_1',
  ls_order_id: 'ord_1',
  ls_variant_id: '1234',
  started_at: '2026-04-01T00:00:00.000Z',
  current_period_end_at: null,
  cancelled_at: null,
  metadata: {},
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
}

describe('requirePlantEntitlement — input validation', () => {
  it('returns 401 when email is missing', async () => {
    const client = fakeClient({ plant_users: [], plant_entitlements: [] })
    const r = await requirePlantEntitlement(null, PLANT_ID, 'free', { client })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.status).toBe(401)
      expect(r.body.error).toBe('not_authenticated')
    }
  })

  it('returns 404 when plantId is missing', async () => {
    const client = fakeClient({ plant_users: [], plant_entitlements: [] })
    const r = await requirePlantEntitlement(MEMBER, null, 'free', { client })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.status).toBe(404)
      expect(r.body.error).toBe('no_plant_context')
    }
  })
})

describe('requirePlantEntitlement — membership check (Atlas fix #1)', () => {
  it('returns 403 when email is not a plant_users member, even with active entitlement', async () => {
    const client = fakeClient({
      plant_users: [{ plant_id: PLANT_ID, user_email: MEMBER, role: 'owner' }],
      plant_entitlements: [ACTIVE_SBPRO_ROW],
    })
    const r = await requirePlantEntitlement(NON_MEMBER, PLANT_ID, 'spottingboard_pro', { client })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.status).toBe(403)
      expect(r.body.error).toBe('not_a_plant_member')
      expect(r.body.plant_id).toBe(PLANT_ID)
    }
  })

  it('returns 403 even for a free-tier route when not a member', async () => {
    // The membership check applies to BOTH free and paid required values.
    // Without this, a non-member could read tenant-scoped pages just because
    // they pass `'free'` as the required arg.
    const client = fakeClient({
      plant_users: [{ plant_id: PLANT_ID, user_email: MEMBER, role: 'owner' }],
      plant_entitlements: [],
    })
    const r = await requirePlantEntitlement(NON_MEMBER, PLANT_ID, 'free', { client })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(403)
  })

  it('matches membership case-insensitively (defensive on session email casing)', async () => {
    const client = fakeClient({
      plant_users: [{ plant_id: PLANT_ID, user_email: 'member@plant.com', role: 'owner' }],
      plant_entitlements: [],
    })
    const r = await requirePlantEntitlement('MEMBER@PLANT.COM', PLANT_ID, 'free', { client })
    expect(r.ok).toBe(true)
  })
})

describe('requirePlantEntitlement — entitlement gate', () => {
  it('returns 200/ok with role for member with required SBPro entitlement', async () => {
    const client = fakeClient({
      plant_users: [{ plant_id: PLANT_ID, user_email: MEMBER, role: 'owner' }],
      plant_entitlements: [ACTIVE_SBPRO_ROW],
    })
    const r = await requirePlantEntitlement(MEMBER, PLANT_ID, 'spottingboard_pro', { client })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.role).toBe('owner')
      expect(r.entitlements.hasSpottingBoardPro).toBe(true)
    }
  })

  it('returns 402 with requires_upgrade for member without required entitlement', async () => {
    const client = fakeClient({
      plant_users: [{ plant_id: PLANT_ID, user_email: MEMBER, role: 'operator' }],
      plant_entitlements: [],
    })
    const r = await requirePlantEntitlement(MEMBER, PLANT_ID, 'spottingboard_pro', { client })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.status).toBe(402)
      expect(r.body.requires_upgrade).toBe(true)
      expect(r.body.missing_product).toBe('spottingboard_pro')
    }
  })

  it('returns 200/ok for free required when member has no entitlement', async () => {
    const client = fakeClient({
      plant_users: [{ plant_id: PLANT_ID, user_email: MEMBER, role: 'spotter' }],
      plant_entitlements: [],
    })
    const r = await requirePlantEntitlement(MEMBER, PLANT_ID, 'free', { client })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.role).toBe('spotter')
      expect(r.entitlements.isFreeOnly).toBe(true)
    }
  })

  it('returns role accurately so route handlers can do role-based gating', async () => {
    const client = fakeClient({
      plant_users: [{ plant_id: PLANT_ID, user_email: MEMBER, role: 'spotter' }],
      plant_entitlements: [ACTIVE_SBPRO_ROW],
    })
    const r = await requirePlantEntitlement(MEMBER, PLANT_ID, 'spottingboard_pro', { client })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.role).toBe('spotter')
  })
})

describe('requirePlantEntitlement — founder bypass interaction (TASK-157 P1-4 stricter semantics)', () => {
  it('founder requesting their own plant gets bypass', async () => {
    process.env[FOUNDER_ENV] = 'tyler@nexshift.co'
    const client = fakeClient({
      plant_users: [{ plant_id: PLANT_ID, user_email: 'tyler@nexshift.co', role: 'owner' }],
      plant_entitlements: [],
    })
    const r = await requirePlantEntitlement('tyler@nexshift.co', PLANT_ID, 'spottingboard_pro', { client })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.entitlements.founderBypass).toBe(true)
      expect(r.entitlements.hasSpottingBoardPro).toBe(true)
    }
  })

  it('non-member founder still gets 403 on membership check', async () => {
    // Founder bypass requires the requester to be both a configured founder
    // AND a member of the plant. A founder who isn't a plant_users member of
    // plantId still can't access that plant.
    process.env[FOUNDER_ENV] = 'tyler@nexshift.co'
    const client = fakeClient({
      plant_users: [{ plant_id: PLANT_ID, user_email: MEMBER, role: 'owner' }],
      plant_entitlements: [],
    })
    const r = await requirePlantEntitlement('tyler@nexshift.co', PLANT_ID, 'spottingboard_pro', { client })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(403)
  })

  it('non-founder member of a plant containing a founder does NOT get bypass (Atlas P1-4 lock)', async () => {
    // Atlas wiring decision 2026-05-07: bypass is for the requesting verified
    // member who is themselves a configured founder. Previous behavior gifted
    // bypass to anyone in a plant that happened to contain a founder. Stricter
    // semantics close that loophole.
    process.env[FOUNDER_ENV] = 'tyler@nexshift.co'
    const client = fakeClient({
      plant_users: [
        { plant_id: PLANT_ID, user_email: 'tyler@nexshift.co', role: 'owner' },
        { plant_id: PLANT_ID, user_email: MEMBER, role: 'operator' },
      ],
      plant_entitlements: [],
    })
    // alice (non-founder, but a member of a plant tyler is also in) requests
    const r = await requirePlantEntitlement(MEMBER, PLANT_ID, 'spottingboard_pro', { client })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.status).toBe(402)
      expect(r.body.requires_upgrade).toBe(true)
    }
  })

  it('founder bypass matches case-insensitively', async () => {
    process.env[FOUNDER_ENV] = 'TYLER@NEXSHIFT.CO'
    const client = fakeClient({
      plant_users: [{ plant_id: PLANT_ID, user_email: 'tyler@nexshift.co', role: 'owner' }],
      plant_entitlements: [],
    })
    const r = await requirePlantEntitlement('Tyler@Nexshift.co', PLANT_ID, 'spottingboard_pro', { client })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.entitlements.founderBypass).toBe(true)
  })

  it('founder bypass disabled when env unset (founder loses elevated access)', async () => {
    // Sanity: if env is unset, even tyler@nexshift.co requesting his own plant
    // gets normal entitlement resolution (Free in this test, no plant_entitlements rows).
    delete process.env[FOUNDER_ENV]
    const client = fakeClient({
      plant_users: [{ plant_id: PLANT_ID, user_email: 'tyler@nexshift.co', role: 'owner' }],
      plant_entitlements: [],
    })
    const r = await requirePlantEntitlement('tyler@nexshift.co', PLANT_ID, 'spottingboard_pro', { client })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(402)
  })
})
