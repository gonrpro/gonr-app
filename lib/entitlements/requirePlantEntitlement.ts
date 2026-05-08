// lib/entitlements/requirePlantEntitlement.ts
//
// Middleware-style gate for SpottingBoard route handlers.
//
// Two-step verification:
//   1. Email is authenticated AND email is a member of plant_users for plantId
//      (membership check). Without this, an authenticated user with any plantId
//      in URL/header could pass the gate for plants they don't belong to.
//   2. Plant has the required entitlement product active.
//
// Usage in a route handler:
//
//   const gate = await requirePlantEntitlement(email, plantId, 'spottingboard_pro')
//   if (!gate.ok) {
//     return NextResponse.json(gate.body, { status: gate.status })
//   }
//   const { entitlements, role } = gate
//   // ...handler proceeds with verified membership + entitlement context

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

import { resolvePlantEntitlements } from './resolvePlantEntitlements'
import type { PlantEntitlements, SpottingBoardProduct } from './types'

export type RequiredEntitlement = SpottingBoardProduct | 'free'
export type PlantUserRole = 'owner' | 'operator' | 'spotter'

export interface GateAllowed {
  ok: true
  entitlements: PlantEntitlements
  role: PlantUserRole
}

export interface GateBlocked {
  ok: false
  status: 401 | 402 | 403 | 404
  body: {
    error: string
    requires_upgrade?: boolean
    missing_product?: SpottingBoardProduct
    plant_id?: string
  }
}

export type GateResult = GateAllowed | GateBlocked

interface GateOptions {
  /** Override the supabase client for testing (also used by tests of resolver). */
  client?: SupabaseClient
}

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error('[requirePlantEntitlement] Missing Supabase service-role credentials')
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/**
 * Verifies the email belongs to plant_users for plantId.
 * Returns the role on match, or null if not a member.
 *
 * Lowercases the email defensively — plant_users.user_email is lowercased
 * (TASK-144 fix) but session emails sometimes arrive uppercased.
 */
export async function verifyPlantMembership(
  supabase: SupabaseClient,
  plantId: string,
  email: string,
): Promise<PlantUserRole | null> {
  const { data, error } = await supabase
    .from('plant_users')
    .select('role')
    .eq('plant_id', plantId)
    .eq('user_email', email.toLowerCase())
    .maybeSingle()

  if (error) {
    console.error('[verifyPlantMembership] read failed', { plantId, error })
    return null
  }
  if (!data) return null
  return (data as { role: PlantUserRole }).role
}

/**
 * Verifies the plant has the required entitlement AND the user is a member.
 *
 * Always:
 *   1. 401 if email is missing
 *   2. 404 if plantId is missing
 *   3. 403 if email is not a plant_users member for plantId
 *   4. 402 if entitlement check fails (with requires_upgrade + missing_product)
 *   5. 200/ok with { entitlements, role } if all pass
 *
 * For routes that only require membership (any plant member, no paid product),
 * pass `'free'` as required.
 *
 * ⚠️ CALLER MUST VALIDATE ROLE for destructive ops.
 * This gate verifies membership + entitlement but does NOT enforce
 * role-based access. Routes that require write access MUST check:
 *
 *   const gate = await requirePlantEntitlement(email, plantId, 'spottingboard_pro')
 *   if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status })
 *   if (gate.role !== 'owner' && gate.role !== 'operator') {
 *     return NextResponse.json({ error: 'role_insufficient' }, { status: 403 })
 *   }
 *
 * The `role` is returned for this purpose; assuming the gate enforced it
 * silently is a real footgun and will let `spotter` accounts perform
 * owner-only actions like delete/promote.
 */
export async function requirePlantEntitlement(
  email: string | null | undefined,
  plantId: string | null | undefined,
  required: RequiredEntitlement,
  options: GateOptions = {},
): Promise<GateResult> {
  if (!email) {
    return { ok: false, status: 401, body: { error: 'not_authenticated' } }
  }
  if (!plantId) {
    return { ok: false, status: 404, body: { error: 'no_plant_context' } }
  }

  const supabase = options.client ?? getSupabaseAdmin()

  // Step 1 — membership verification. Fix #1 (Atlas review 2026-05-07).
  const role = await verifyPlantMembership(supabase, plantId, email)
  if (!role) {
    return {
      ok: false,
      status: 403,
      body: { error: 'not_a_plant_member', plant_id: plantId },
    }
  }

  // Step 2 — entitlement resolution. Reuse the same client to avoid drift.
  // Pass requesting email so the resolver's stricter founder-bypass check
  // (TASK-157 P1-4) can verify the requester is both a configured founder
  // and a member of this plant.
  const entitlements = await resolvePlantEntitlements(plantId, {
    client: supabase,
    requesting_email: email,
  })

  if (required === 'free') {
    return { ok: true, entitlements, role }
  }

  const has = (() => {
    switch (required) {
      case 'spottingboard_pro':
        return entitlements.hasSpottingBoardPro
      case 'plant_brain_runtime':
        return entitlements.hasPlantBrainRuntime
      case 'starter_pack':
        return entitlements.hasStarterPack
    }
  })()

  if (!has) {
    return {
      ok: false,
      status: 402,
      body: {
        error: 'entitlement_required',
        requires_upgrade: true,
        missing_product: required,
        plant_id: plantId,
      },
    }
  }

  return { ok: true, entitlements, role }
}

/**
 * Convenience: gate for the GONR runtime bridge, which requires BOTH
 * SpottingBoard Pro AND Plant Brain Runtime at the plant level.
 *
 * Reuses the resolved entitlements from the SBPro check so we don't pay for
 * a second DB read on the solve path.
 *
 * ⚠️ Stale-state window: entitlements are resolved ONCE at the start of the
 * request. If a webhook flips an entitlement between the time the resolver
 * runs and the time this gate checks `hasPlantBrainRuntime`, the gate
 * reflects the pre-flip state. This is acceptable because (a) the request
 * window is sub-second, (b) entitlement transitions are idempotent on retry,
 * and (c) re-reading would double the DB cost on every solve. If strong
 * consistency becomes necessary, replace this with two independent
 * `requirePlantEntitlement` calls.
 */
export async function requirePlantBrainRuntime(
  email: string | null | undefined,
  plantId: string | null | undefined,
  options: GateOptions = {},
): Promise<GateResult> {
  const proGate = await requirePlantEntitlement(email, plantId, 'spottingboard_pro', options)
  if (!proGate.ok) return proGate

  if (!proGate.entitlements.hasPlantBrainRuntime) {
    return {
      ok: false,
      status: 402,
      body: {
        error: 'entitlement_required',
        requires_upgrade: true,
        missing_product: 'plant_brain_runtime',
        plant_id: plantId ?? undefined,
      },
    }
  }

  return proGate
}
