// app/spottingboard/(workbench)/setup/setup-spine.ts — TASK-189 v0
//
// Deterministic phase spine. The LLM does not invent the product flow —
// it operates inside this lattice. Pure functions only; no I/O.

import type { PlantBuildRecord } from '@/lib/spottingboard/plant-build-engine/types'
import type { PhaseTarget, SetupPhaseId } from './types'

interface PhaseConfig {
  id: SetupPhaseId
  requiredCategories: string[]
  minSignalCount: number
  /** Match function: counts canonical records contributing to this phase. */
  matchRecord: (record: PlantBuildRecord) => boolean
}

const PHASE_CONFIGS: PhaseConfig[] = [
  {
    id: 'plant_profile',
    requiredCategories: ['identity', 'services', 'staff', 'languages'],
    minSignalCount: 1,
    matchRecord: r => r.kind === 'plant_profile',
  },
  {
    id: 'equipment',
    requiredCategories: ['solvent_system', 'spotting_board', 'wetcleaning_setup', 'steam_air_vacuum', 'washer_dryer'],
    minSignalCount: 3,
    matchRecord: r =>
      r.kind === 'inventory'
      && ['solvent_system', 'wetcleaning_setup', 'spotting_board', 'steam_air_vacuum', 'washer_dryer', 'pressing_finishing', 'specialty_tool'].includes(r.category),
  },
  {
    id: 'chemistry_inventory',
    requiredCategories: ['spotting_agent', 'chemical', 'protective', 'exclusion'],
    minSignalCount: 3,
    matchRecord: r =>
      r.kind === 'inventory'
      && ['spotting_agent', 'chemical', 'protective', 'exclusion'].includes(r.category),
  },
  {
    id: 'standard_workflows',
    requiredCategories: ['standard_procedure', 'handoff'],
    minSignalCount: 3,
    matchRecord: r => r.kind === 'rule' && (r.category === 'standard_procedure' || r.category === 'handoff'),
  },
  {
    id: 'exceptions_rules',
    requiredCategories: ['exception', 'forbidden', 'escalation'],
    minSignalCount: 2,
    matchRecord: r => r.kind === 'rule' && (r.category === 'exception' || r.category === 'forbidden' || r.category === 'escalation'),
  },
  {
    id: 'training_knowledge',
    requiredCategories: ['basics', 'sop', 'escalation_path'],
    minSignalCount: 1,
    matchRecord: r => r.kind === 'training',
  },
  {
    id: 'review_publish',
    requiredCategories: [],
    minSignalCount: 0,
    matchRecord: () => false,
  },
]

/** Build per-phase targets from current records. */
export function buildPhaseTargets(records: PlantBuildRecord[]): PhaseTarget[] {
  return PHASE_CONFIGS.map(cfg => {
    const count = records.filter(cfg.matchRecord).length
    return {
      phaseId: cfg.id,
      requiredCategories: cfg.requiredCategories,
      minSignalCount: cfg.minSignalCount,
      currentSignalCount: count,
      isCovered: count >= cfg.minSignalCount,
    }
  })
}

/** Pick the active phase: the first one in spine order that isn't covered.
 *  If all are covered, returns 'review_publish'. */
export function pickCurrentPhase(targets: PhaseTarget[]): SetupPhaseId {
  for (const t of targets) {
    if (!t.isCovered) return t.phaseId
  }
  return 'review_publish'
}

/** Map a SetupPhaseId to operator-facing copy for the progress rail. */
export function phaseDisplayName(id: SetupPhaseId): string {
  switch (id) {
    case 'plant_profile':       return 'Plant Profile'
    case 'equipment':           return 'Equipment'
    case 'chemistry_inventory': return 'Chemistry Inventory'
    case 'standard_workflows':  return 'Standard Workflows'
    case 'exceptions_rules':    return 'Exceptions & Never-do Rules'
    case 'training_knowledge':  return 'Training Knowledge'
    case 'review_publish':      return 'Review & Publish'
  }
}

/** Used by the orchestrator API to pass schema hints to the extractor. */
export function expectedRecordKindForPhase(id: SetupPhaseId): PlantBuildRecord['kind'] | null {
  switch (id) {
    case 'plant_profile':       return 'plant_profile'
    case 'equipment':           return 'inventory'
    case 'chemistry_inventory': return 'inventory'
    case 'standard_workflows':  return 'rule'
    case 'exceptions_rules':    return 'rule'
    case 'training_knowledge':  return 'training'
    case 'review_publish':      return null
  }
}

/** Helper: is the plant brain "build complete" enough to unlock the dashboard?
 *  Phase 1-6 covered (review_publish is a meta phase, doesn't count). */
export function isBuildComplete(targets: PhaseTarget[]): boolean {
  return targets.every(t => t.phaseId === 'review_publish' || t.isCovered)
}
