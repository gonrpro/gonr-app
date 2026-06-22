// lib/consumer-safety/progressive.ts
// TASK-228 — pure helpers for the /solve-v2 progressive intake.
//
// Goal: lead with "what happened?", classify instantly for a provisional safe
// verdict, then ask ONLY the highest-impact facts still unknown — instead of
// forcing all eight fields up front.
//
// Why we key off unknown fields (not verdict.missingFacts): the classifier
// collapses to `stop_use_pro` with `card = null` whenever a gating fact is
// unknown, and missingFactsForCard(null) returns [] — so the verdict's own
// missingFacts is empty in exactly the cases we'd want to ask. Instead we ask
// for the fields that actually gate a confident DIY result, mirroring the
// classifier's own gates: material / colorfastness / careStatus drive
// requiresReferral + low confidence (classifier.ts confidenceFor /
// buildVerdict), and stainAge / heatExposure gate canUseDiyCard. Ordered by
// impact and capped so we never rebuild the 8-field wall.
//
// Pure + framework-free so it can be unit-tested without a DOM harness.

import { inferColorfastnessFromText } from './display-context'
import { inferMaterialFromDescription } from '@/lib/solve/material-inference'
import type {
  CareStatus,
  Colorfastness,
  Material,
  SafetyVerdict,
  SolveInput,
  StainAge,
  StainType,
  HeatExposure,
  ItemValue,
} from './types'

/** All structured fields the intake can collect (free text + the 8 selects). */
export interface SolveFields {
  description: string
  stainType: StainType | 'auto'
  material: Material
  careStatus: CareStatus
  heatExposure: HeatExposure
  colorfastness: Colorfastness
  stainAge: StainAge
  itemValue: ItemValue
  priorTreatment: string[]
  locationText: string
}

export type FollowupField = 'material' | 'colorfastness' | 'careStatus' | 'stainAge' | 'heatExposure'

export interface FollowupOption {
  value: string
  label: string
}

export interface Followup {
  field: FollowupField
  question: string
  options: FollowupOption[]
}

// Ordered by impact on the verdict — material first (biggest confidence lever),
// then the colorfast/care facts that drive referral, then the DIY-card gates.
const FOLLOWUPS_BY_FIELD: Record<FollowupField, Followup> = {
  material: {
    field: 'material',
    // Common chips only; the full 13-value list stays in the optional details.
    question: 'What is it made of?',
    options: [
      { value: 'cotton', label: 'Cotton' },
      { value: 'polyester', label: 'Polyester' },
      { value: 'denim', label: 'Denim' },
      { value: 'wool', label: 'Wool' },
      { value: 'silk', label: 'Silk' },
      { value: 'leather', label: 'Leather' },
    ],
  },
  colorfastness: {
    field: 'colorfastness',
    question: 'Is the fabric white or colorfast?',
    options: [
      { value: 'colorfast', label: 'White / colorfast' },
      { value: 'prone_to_bleed', label: 'Dark or might bleed' },
    ],
  },
  careStatus: {
    field: 'careStatus',
    question: 'What does the care label say?',
    options: [
      { value: 'machine_washable', label: 'Machine washable' },
      { value: 'hand_wash', label: 'Hand wash' },
      { value: 'dry_clean_only', label: 'Dry clean only' },
    ],
  },
  stainAge: {
    field: 'stainAge',
    question: 'How old is the stain?',
    options: [
      { value: 'fresh', label: 'Fresh' },
      { value: 'hours_old', label: 'Hours old' },
      { value: 'set_in', label: 'Set in / already washed' },
    ],
  },
  heatExposure: {
    field: 'heatExposure',
    question: 'Has any heat touched it yet?',
    options: [
      { value: 'none', label: 'No heat yet' },
      { value: 'warm_hot_wash', label: 'Warm / hot water' },
      { value: 'machine_dried', label: 'Machine dried' },
      { value: 'ironed', label: 'Ironed' },
    ],
  },
}

const FOLLOWUP_PRIORITY: FollowupField[] = ['material', 'colorfastness', 'careStatus', 'stainAge', 'heatExposure']

/** Maximum follow-ups shown at once — keeps the ask to the top blockers. */
export const MAX_FOLLOWUPS = 3

/** Material after free-text inference — what the engine will actually classify on. */
export function effectiveMaterial(fields: SolveFields): Material {
  return inferMaterialFromDescription(fields.description, fields.material)
}

/** Colorfastness after free-text inference. */
export function effectiveColorfastness(fields: SolveFields): Colorfastness {
  return inferColorfastnessFromText(fields.description, fields.colorfastness)
}

/** Build the engine SolveInput from the collected fields, applying the same
 * free-text inference the shell relied on (material + colorfastness). */
export function buildSolveInputFrom(fields: SolveFields): SolveInput {
  return {
    stainDescription: fields.description,
    stainType: fields.stainType === 'auto' ? undefined : fields.stainType,
    material: effectiveMaterial(fields),
    careStatus: fields.careStatus,
    heatExposure: fields.heatExposure,
    colorfastness: effectiveColorfastness(fields),
    stainAge: fields.stainAge,
    priorTreatment: fields.priorTreatment,
    itemValue: fields.itemValue,
    locationText: fields.locationText,
  }
}

function isUnknown(fields: SolveFields, field: FollowupField): boolean {
  if (field === 'material') return effectiveMaterial(fields) === 'unknown'
  if (field === 'colorfastness') return effectiveColorfastness(fields) === 'unknown'
  return fields[field] === 'unknown'
}

/**
 * Ordered, minimal follow-ups to ask next: the highest-impact fields still
 * unknown, capped at MAX_FOLLOWUPS. Returns [] for a hard `do_not_attempt`
 * verdict — that result is final, so more facts won't unlock DIY and we don't
 * pester. The user always has the provisional safe-first-move regardless;
 * these are sharpeners, never a gate.
 */
export function deriveFollowups(verdict: SafetyVerdict | null, fields: SolveFields): Followup[] {
  if (verdict?.verdict === 'do_not_attempt') return []

  const out: Followup[] = []
  for (const field of FOLLOWUP_PRIORITY) {
    if (isUnknown(fields, field)) out.push(FOLLOWUPS_BY_FIELD[field])
    if (out.length >= MAX_FOLLOWUPS) break
  }
  return out
}
