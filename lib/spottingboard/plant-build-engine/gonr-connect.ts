// lib/spottingboard/plant-build-engine/gonr-connect.ts — TASK-189 v0 skeleton
//
// Pure filter + mapper for the optional GONR integration. Spotting Board is
// useful standalone; GONR Connect is a separate toggle, default off.
//
// Eligibility (per record kind):
//   - rule         → review.status === 'approved'
//                  AND review.safetyLabel ∈ {source_backed, reviewed_for_plant_use}
//   - inventory    → review.status === 'approved' (no safety-label gate; even
//                    operator-confirmed presence/absence of a chemical is useful
//                    runtime context)
//   - training     → review.status === 'approved' (used as GONR personalization,
//                    not as a runtime safety gate)
//   - plant_profile → always eligible if `approved`; provides runtime scope
//
// Per-item opt-out: operators can mark specific record IDs in
// `perItemExclusions` to keep them out of the GONR payload even though they
// otherwise meet the eligibility bar.
//
// Toggle granularity (recommended): per-module + per-item opt-out. Per-module
// gives operators a clean coarse switch ("send my rules, don't send training");
// per-item lets them carve out specific sensitive records.

import type {
  GonrConnectModuleConfig,
  GonrConnectPayload,
  InventoryRecord,
  PlantBuildRecord,
  PlantProfileRecord,
  RuleRecord,
  TrainingRecord,
} from './types'

const ELIGIBLE_RULE_SAFETY_LABELS = new Set(['source_backed', 'reviewed_for_plant_use'])

export function isEligibleForGonr(record: PlantBuildRecord): boolean {
  if (record.review.status !== 'approved') return false
  switch (record.kind) {
    case 'rule':
      return ELIGIBLE_RULE_SAFETY_LABELS.has(record.review.safetyLabel)
    case 'inventory':
    case 'training':
    case 'plant_profile':
      return true
    default:
      return false
  }
}

export interface BuildGonrPayloadInput {
  records: PlantBuildRecord[]
  plant: PlantProfileRecord
  modules: GonrConnectModuleConfig
  /** Operator-explicit do-not-flow record ids. */
  perItemExclusions?: string[]
  /** Connection timestamp; defaults to now. */
  connectedAt?: string
  outcomeFeedbackUrl?: string
}

export function buildGonrConnectPayload(input: BuildGonrPayloadInput): GonrConnectPayload {
  const exclusions = new Set(input.perItemExclusions ?? [])
  const filtered = input.records.filter(r => !exclusions.has(r.id) && isEligibleForGonr(r))

  const rules = input.modules.rules
    ? filtered.filter((r): r is RuleRecord => r.kind === 'rule')
    : []
  const inventory = input.modules.inventory
    ? filtered.filter((r): r is InventoryRecord => r.kind === 'inventory')
    : []
  const training = input.modules.training
    ? filtered.filter((r): r is TrainingRecord => r.kind === 'training')
    : []

  return {
    plantId: input.plant.plantId,
    connectedAt: input.connectedAt ?? new Date().toISOString(),
    modulesEnabled: { ...input.modules },
    eligibleRecords: {
      rules,
      inventory,
      training,
    },
    perItemExclusions: [...exclusions],
    outcomeFeedbackUrl: input.outcomeFeedbackUrl,
    generatedAt: new Date().toISOString(),
  }
}

/** Convenience: a disconnected default payload (all modules off, no records).
 *  Use this as the initial state when an operator has not opted into GONR. */
export function disconnectedPayload(plant: PlantProfileRecord): GonrConnectPayload {
  return {
    plantId: plant.plantId,
    connectedAt: '',
    modulesEnabled: { inventory: false, rules: false, training: false },
    eligibleRecords: { rules: [], inventory: [], training: [] },
    perItemExclusions: [],
    generatedAt: new Date().toISOString(),
  }
}
