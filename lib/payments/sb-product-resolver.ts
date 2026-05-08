// lib/payments/sb-product-resolver.ts
//
// Maps a LemonSqueezy product/variant payload to a SpottingBoard product key.
//
// Variant ID is authoritative when configured; falls back to product-name
// substring matching for legacy events or unconfigured envs.
//
// Atlas review fix #4 (2026-05-07): fallback strings updated to locked
// naming. Order matters — most specific phrases first so e.g.
// "Plant Brain Runtime" doesn't get caught by a generic "spottingboard" check.

import type { SpottingBoardProduct } from '../entitlements/types'

export function resolveSpottingBoardProduct(
  productName: string,
  variantId?: string | null,
): SpottingBoardProduct | null {
  if (variantId) {
    const idStr = String(variantId)
    const SBPRO = process.env.LS_SBPRO_VARIANT_ID
    const SBPRO_ANNUAL = process.env.LS_SBPRO_ANNUAL_VARIANT_ID
    const PBR = process.env.LS_PLANT_BRAIN_RUNTIME_VARIANT_ID
    const PBR_ANNUAL = process.env.LS_PLANT_BRAIN_RUNTIME_ANNUAL_VARIANT_ID
    const STARTER = process.env.LS_STARTER_PACK_VARIANT_ID
    if (SBPRO && idStr === SBPRO) return 'spottingboard_pro'
    if (SBPRO_ANNUAL && idStr === SBPRO_ANNUAL) return 'spottingboard_pro'
    if (PBR && idStr === PBR) return 'plant_brain_runtime'
    if (PBR_ANNUAL && idStr === PBR_ANNUAL) return 'plant_brain_runtime'
    if (STARTER && idStr === STARTER) return 'starter_pack'
  }

  const lower = (productName || '').toLowerCase()
  if (lower.includes('plant brain runtime')) return 'plant_brain_runtime'
  if (lower.includes('plant brain')) return 'plant_brain_runtime'
  if (lower.includes('starter pack')) return 'starter_pack'
  if (lower.includes('spottingboard + gonr')) return 'spottingboard_pro'
  if (lower.includes('spottingboard pro') || lower.includes('spotting board pro')) return 'spottingboard_pro'
  if (lower.includes('spottingboard') || lower.includes('spotting board')) return 'spottingboard_pro'

  return null
}

export const SBPRO_FAMILY: ReadonlySet<SpottingBoardProduct> = new Set([
  'spottingboard_pro',
  'plant_brain_runtime',
  'starter_pack',
])

export function isSpottingBoardProduct(p: string | null): p is SpottingBoardProduct {
  return p !== null && SBPRO_FAMILY.has(p as SpottingBoardProduct)
}
