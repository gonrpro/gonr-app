// lib/spottingboard/types.ts (TASK-158 — unchanged in TASK-160)
//
// Type re-exports for SpottingBoard surfaces. Mirrors the DDL enum from TASK-150
// and the SB review gate v0 labels from TASK-145.

export const PLANT_BRAIN_ITEM_MODULES = [
  'procedure',
  'chemistry_rule',
  'escalation_rule',
  'training_check',
  'reference_sop',
  'printout',
  'preference',
  'tribal_note',
  'plant_profile',
] as const

export type PlantBrainItemModule = (typeof PLANT_BRAIN_ITEM_MODULES)[number]

export type {
  AuthorityClass,
  RiskTier,
  ReviewStatus,
} from '@/components/shared/ThreeBadgeAnchor'

export const SAFETY_LABELS = [
  'source_backed',
  'reviewed_for_plant_use',
  'needs_source_review',
  'escalation_required',
  'unsafe_do_not_use',
] as const

export type SafetyLabel = (typeof SAFETY_LABELS)[number]
