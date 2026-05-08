// lib/entitlements/free-limits.ts
//
// Free-tier caps for SpottingBoard. Atlas decision (TASK-154 review): caps
// live in code, NOT as DB constraints, because a DB constraint can't easily
// distinguish "Free plant" from "plant whose entitlement lapsed mid-month."
//
// Single source of truth. Route gates and UI badges read from here.

import type { SpottingBoardProduct } from './types'

export const FREE_LIMITS = {
  /** Max chemistry_rule rows per plant on Free */
  maxChemistryRules: 5,
  /** Max procedure rows per plant on Free */
  maxProcedures: 5,
  /** Max combined chemistry+procedure rows; UI shows "X / 5 used" against the relevant cap */
  // Atlas decision: chemistry and procedures are tracked separately, not pooled.
  // If a single combined cap is needed later, derive from these.

  /** Bilingual printout caps */
  maxPrintoutsBeyondPreview: 0,
  /** Training tests available on Free */
  trainingTestsAvailable: false,
  /** Supervisor review queue surface enabled on Free (always read-only banner) */
  supervisorReviewQueueEnabled: false,
  /** Full export available on Free */
  fullExportEnabled: false,
  /** Sample export available on Free (watermarked) */
  sampleExportEnabled: true,
  /** GONR runtime read access on Free */
  runtimeBridgeEnabled: false,
} as const

export type FreeLimitKey = keyof typeof FREE_LIMITS

/**
 * Returns true if the given module has a count cap on Free.
 * Used by /api/spottingboard/items POST handler to gate inserts.
 */
export function moduleHasFreeCap(module: string): boolean {
  return module === 'chemistry_rule' || module === 'procedure'
}

/**
 * Returns the cap for a given module on Free, or null if no cap applies.
 */
export function freeCapForModule(module: string): number | null {
  if (module === 'chemistry_rule') return FREE_LIMITS.maxChemistryRules
  if (module === 'procedure') return FREE_LIMITS.maxProcedures
  return null
}

/**
 * The product label that lifts a given Free cap. UI uses this in upgrade CTAs.
 */
export function productThatLiftsCap(_module: string): SpottingBoardProduct {
  // All free caps lift at SpottingBoard Pro. Plant Brain Runtime and Starter Pack do
  // not, on their own, lift Free caps.
  return 'spottingboard_pro'
}
