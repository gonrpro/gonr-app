// lib/entitlements/__tests__/resolvePlantEntitlements.test.ts — TASK-154
//
// Verifies isEntitlementActive() — the time-based gate that determines
// whether a plant_entitlements row counts as active right now.
//
// Resolver-as-a-whole tests with a mock SupabaseClient are out of scope for
// this unit-test pass; integration tests with the real DB live in a later
// ticket once Atlas applies the DDL.

import { describe, it, expect } from 'vitest'
import { isEntitlementActive } from '../resolvePlantEntitlements'
import type { PlantEntitlementRow } from '../types'

function row(overrides: Partial<PlantEntitlementRow>): PlantEntitlementRow {
  return {
    id: 'r1',
    plant_id: 'p1',
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
    ...overrides,
  }
}

const NOW = new Date('2026-05-07T12:00:00.000Z')
const FUTURE = '2026-06-07T12:00:00.000Z'
const PAST = '2026-04-07T12:00:00.000Z'

describe('isEntitlementActive', () => {
  it('active + null period → true (perpetual)', () => {
    expect(isEntitlementActive(row({ status: 'active', current_period_end_at: null }), NOW)).toBe(true)
  })

  it('active + period in future → true', () => {
    expect(isEntitlementActive(row({ status: 'active', current_period_end_at: FUTURE }), NOW)).toBe(true)
  })

  it('active + period in past → false', () => {
    expect(isEntitlementActive(row({ status: 'active', current_period_end_at: PAST }), NOW)).toBe(false)
  })

  it('cancelled + period in future → true (paid time honored)', () => {
    expect(isEntitlementActive(row({ status: 'cancelled', current_period_end_at: FUTURE }), NOW)).toBe(true)
  })

  it('cancelled + period in past → false', () => {
    expect(isEntitlementActive(row({ status: 'cancelled', current_period_end_at: PAST }), NOW)).toBe(false)
  })

  it('cancelled + null period → false (defensive: no paid time to honor)', () => {
    expect(isEntitlementActive(row({ status: 'cancelled', current_period_end_at: null }), NOW)).toBe(false)
  })

  it('past_due + grace in future → true', () => {
    const r = row({
      status: 'past_due',
      metadata: { past_due_grace_until: FUTURE },
    })
    expect(isEntitlementActive(r, NOW)).toBe(true)
  })

  it('past_due + grace in past → false', () => {
    const r = row({
      status: 'past_due',
      metadata: { past_due_grace_until: PAST },
    })
    expect(isEntitlementActive(r, NOW)).toBe(false)
  })

  it('past_due + missing grace metadata → false', () => {
    expect(isEntitlementActive(row({ status: 'past_due', metadata: {} }), NOW)).toBe(false)
  })

  it('past_due + non-string grace metadata → false (defensive)', () => {
    expect(
      isEntitlementActive(row({ status: 'past_due', metadata: { past_due_grace_until: 12345 } }), NOW),
    ).toBe(false)
  })

  it('expired → false regardless of period', () => {
    expect(isEntitlementActive(row({ status: 'expired', current_period_end_at: FUTURE }), NOW)).toBe(false)
  })

  it('paused → false regardless of period', () => {
    expect(isEntitlementActive(row({ status: 'paused', current_period_end_at: FUTURE }), NOW)).toBe(false)
  })
})
