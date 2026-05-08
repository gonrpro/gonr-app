// lib/entitlements/types.ts
//
// Plant-scoped entitlement types for SpottingBoard products.
//
// Atlas wiring decisions (TASK-154 review 2026-05-07):
//   - Product key for plant-scoped GONR runtime add-on is `plant_brain_runtime`,
//     NOT `gonr_operator_addon`. The user-facing label is "Plant Brain Runtime".
//   - Existing user-scoped GONR Operator tier in `subscriptions` is untouched.
//   - These types are independent of the GONR Tier enum in `lib/types.ts` —
//     plant entitlements layer over user tiers without coupling.

export const SPOTTING_BOARD_PRODUCTS = [
  'spottingboard_pro',
  'starter_pack',
  'plant_brain_runtime',
] as const

export type SpottingBoardProduct = (typeof SPOTTING_BOARD_PRODUCTS)[number]

export const ENTITLEMENT_STATUSES = [
  'active',
  'past_due',
  'cancelled',
  'paused',
  'expired',
] as const

export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number]

export type PlantUserRole = 'owner' | 'operator' | 'spotter'

export interface PlantEntitlementRow {
  id: string
  plant_id: string
  product: SpottingBoardProduct
  status: EntitlementStatus
  billing_email: string
  ls_subscription_id: string | null
  ls_order_id: string | null
  ls_variant_id: string | null
  started_at: string                 // ISO datetime
  current_period_end_at: string | null
  cancelled_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ResolvedEntitlement {
  product: SpottingBoardProduct
  status: EntitlementStatus
  current_period_end_at: string | null
  is_active: boolean
}

export interface PlantEntitlements {
  plantId: string
  entitlements: ResolvedEntitlement[]
  hasSpottingBoardPro: boolean
  hasPlantBrainRuntime: boolean
  hasStarterPack: boolean
  isFreeOnly: boolean
  founderBypass: boolean             // true => all entitlements treated active
}

export const RECURRING_PRODUCTS: readonly SpottingBoardProduct[] = [
  'spottingboard_pro',
  'plant_brain_runtime',
] as const

export function isRecurringProduct(product: SpottingBoardProduct): boolean {
  return RECURRING_PRODUCTS.includes(product)
}
