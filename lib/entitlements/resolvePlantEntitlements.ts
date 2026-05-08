// lib/entitlements/resolvePlantEntitlements.ts
//
// Resolves the active entitlements for a given plant.
//
// Atlas wiring decisions (TASK-154 review 2026-05-07):
//   - No caching in v1. Read per request until traffic proves need.
//   - Founder bypass via env (`PLANT_ENTITLEMENT_FOUNDER_EMAILS`) only.
//   - Past-due grace: 7 days from `metadata.past_due_grace_until`. Resolver
//     treats `is_active=true` while inside grace, false after.
//   - Cancelled but not yet expired: respects `current_period_end_at` —
//     resolver keeps `is_active=true` until that timestamp.
//
// Service-role client is required because the webhook is the writer and the
// resolver needs to read across all plant_users members for the founder
// check. RLS member-read works for member sessions; service-role works for
// server-to-server reads (e.g. the GONR runtime bridge on gonr.app).

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

import {
  type PlantEntitlementRow,
  type PlantEntitlements,
  type ResolvedEntitlement,
  type SpottingBoardProduct,
} from './types'
import { isFounderEmail } from './founders'

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error('[resolvePlantEntitlements] Missing Supabase service-role credentials')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Returns true if the row should be treated as active right now.
 *
 * Active when:
 *   - status === 'active' AND (current_period_end_at is null OR in the future)
 *   - status === 'past_due' AND metadata.past_due_grace_until is in the future
 *   - status === 'cancelled' AND current_period_end_at is in the future
 *     (owner cancelled but the period they paid for hasn't lapsed yet)
 *
 * Inactive when:
 *   - status === 'expired' or 'paused'
 *   - period has lapsed
 *   - past_due grace has lapsed
 */
export function isEntitlementActive(row: PlantEntitlementRow, now: Date = new Date()): boolean {
  const nowMs = now.getTime()
  const periodEndMs = row.current_period_end_at
    ? new Date(row.current_period_end_at).getTime()
    : null

  if (row.status === 'expired' || row.status === 'paused') return false

  if (row.status === 'active') {
    return periodEndMs === null || periodEndMs > nowMs
  }

  if (row.status === 'cancelled') {
    return periodEndMs !== null && periodEndMs > nowMs
  }

  if (row.status === 'past_due') {
    const graceRaw = row.metadata?.past_due_grace_until
    if (typeof graceRaw !== 'string') return false
    const graceMs = new Date(graceRaw).getTime()
    return Number.isFinite(graceMs) && graceMs > nowMs
  }

  return false
}

interface ResolverOptions {
  /** Override the default service-role client for testing */
  client?: SupabaseClient
  /** Override "now" for testing */
  now?: Date
  /**
   * Email of the requesting user. Required for founder bypass to fire.
   *
   * TASK-157 P1-4 (Atlas decision 2026-05-07): bypass requires the REQUESTING
   * user to be (a) a configured founder AND (b) an actual member of the plant.
   * Previous behavior triggered bypass whenever any plant member was a
   * configured founder; the stricter semantics prevent a plant containing a
   * founder for testing from gifting all-features to other members.
   *
   * If `requesting_email` is omitted, founder bypass is disabled (the resolver
   * returns the literal entitlement state). The gate `requirePlantEntitlement`
   * always passes the requesting email through, so production paths get the
   * bypass when applicable.
   */
  requesting_email?: string | null
}

/**
 * Resolves the plant's product entitlements.
 *
 * Returns a frozen result. Caller should not mutate.
 *
 * For a plant with NO entitlement rows: returns `isFreeOnly: true` and all
 * `has*` flags false (unless founder bypass is active).
 *
 * For a founder-bypassed plant: returns all three `has*` flags true and
 * marks `founderBypass: true` so callers can audit the bypass in logs.
 *
 * Founder bypass conditions (Atlas decision 2026-05-07, P1-4 of TASK-157):
 * - `requesting_email` is provided (no anonymous bypass)
 * - `requesting_email` is in `PLANT_ENTITLEMENT_FOUNDER_EMAILS` env list
 * - `requesting_email` is an actual `plant_users` member of `plantId`
 *
 * All three conditions are required. The resolver still verifies (c) inline
 * even if the gate already verified it upstream — defense in depth for
 * server-to-server callers that may bypass the gate.
 */
export async function resolvePlantEntitlements(
  plantId: string,
  options: ResolverOptions = {},
): Promise<PlantEntitlements> {
  const supabase = options.client ?? getSupabaseAdmin()
  const now = options.now ?? new Date()
  const requestingEmail = options.requesting_email?.toLowerCase() ?? null

  // List plant members. Used both for the founder-bypass member check AND
  // for the entitlement read fallback when no rows exist (Free path).
  const { data: members, error: membersErr } = await supabase
    .from('plant_users')
    .select('user_email')
    .eq('plant_id', plantId)

  if (membersErr) {
    console.error('[resolvePlantEntitlements] plant_users read failed', membersErr)
  }

  const memberEmails = (members ?? []).map((m: { user_email: string }) =>
    (m.user_email ?? '').toLowerCase(),
  )

  // Stricter founder bypass (Atlas P1-4): requesting email must be a founder
  // AND a member of this plant. Both conditions required.
  const founderBypass =
    !!requestingEmail &&
    isFounderEmail(requestingEmail) &&
    memberEmails.includes(requestingEmail)

  if (founderBypass) {
    return Object.freeze<PlantEntitlements>({
      plantId,
      entitlements: [
        { product: 'spottingboard_pro', status: 'active', current_period_end_at: null, is_active: true },
        { product: 'plant_brain_runtime', status: 'active', current_period_end_at: null, is_active: true },
        { product: 'starter_pack', status: 'active', current_period_end_at: null, is_active: true },
      ],
      hasSpottingBoardPro: true,
      hasPlantBrainRuntime: true,
      hasStarterPack: true,
      isFreeOnly: false,
      founderBypass: true,
    })
  }

  const { data: rows, error: rowsErr } = await supabase
    .from('plant_entitlements')
    .select('*')
    .eq('plant_id', plantId)

  if (rowsErr) {
    console.error('[resolvePlantEntitlements] plant_entitlements read failed', rowsErr)
  }

  const entitlementRows = (rows ?? []) as PlantEntitlementRow[]

  const entitlements: ResolvedEntitlement[] = entitlementRows.map((row) => ({
    product: row.product,
    status: row.status,
    current_period_end_at: row.current_period_end_at,
    is_active: isEntitlementActive(row, now),
  }))

  const hasActiveProduct = (product: SpottingBoardProduct): boolean =>
    entitlements.some((e) => e.product === product && e.is_active)

  const hasSpottingBoardPro = hasActiveProduct('spottingboard_pro')
  const hasPlantBrainRuntime = hasActiveProduct('plant_brain_runtime')
  const hasStarterPack = hasActiveProduct('starter_pack')
  const isFreeOnly = !hasSpottingBoardPro && !hasPlantBrainRuntime && !hasStarterPack

  return Object.freeze<PlantEntitlements>({
    plantId,
    entitlements,
    hasSpottingBoardPro,
    hasPlantBrainRuntime,
    hasStarterPack,
    isFreeOnly,
    founderBypass: false,
  })
}
