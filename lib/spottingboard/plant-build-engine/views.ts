// lib/spottingboard/plant-build-engine/views.ts — TASK-189 v0 skeleton
//
// Pure render-model builders. Takes a list of canonical records and
// produces the view models consumed by dashboard sections. No I/O, no fetch.
// Every function is total (handles empty input cleanly).

import type {
  DashboardInventoryView,
  DashboardPlantRulesView,
  DashboardReviewQueueView,
  DashboardTrainingView,
  InventoryCategory,
  InventoryRecord,
  PlantBrainCompleteness,
  PlantBrainViewModel,
  PlantBuildRecord,
  PlantProfileRecord,
  RuleCategory,
  RuleRecord,
  TrainingAudience,
  TrainingRecord,
} from './types'

const RULE_CATEGORIES: RuleCategory[] = [
  'standard_procedure',
  'exception',
  'escalation',
  'forbidden',
  'handoff',
]

const INVENTORY_CATEGORIES: InventoryCategory[] = [
  'solvent_system',
  'wetcleaning_setup',
  'spotting_board',
  'steam_air_vacuum',
  'washer_dryer',
  'pressing_finishing',
  'specialty_tool',
  'spotting_agent',
  'chemical',
  'protective',
  'exclusion',
]

const TRAINING_AUDIENCES: TrainingAudience[] = ['new_hire', 'spotter', 'supervisor', 'all']

const MIN_INVENTORY = 3
const MIN_RULES = 5
const MIN_TRAINING = 1

// ──────────────────────────────────────────────────────────────────────────

export function buildDashboardPlantRulesView(records: PlantBuildRecord[]): DashboardPlantRulesView {
  const rules = records.filter((r): r is RuleRecord => r.kind === 'rule')
  const byCategory = emptyCategoryMap<RuleCategory, RuleRecord>(RULE_CATEGORIES)
  const byStain: Record<string, RuleRecord[]> = {}

  for (const r of rules) {
    byCategory[r.category].push(r)
    for (const s of r.scope.stains ?? []) {
      const key = s.trim().toLowerCase()
      if (!key) continue
      if (!byStain[key]) byStain[key] = []
      byStain[key].push(r)
    }
  }

  return {
    totalCount: rules.length,
    byCategory,
    byStain,
  }
}

export function buildDashboardInventoryView(records: PlantBuildRecord[]): DashboardInventoryView {
  const inventory = records.filter((r): r is InventoryRecord => r.kind === 'inventory')
  const byCategory = emptyCategoryMap<InventoryCategory, InventoryRecord>(INVENTORY_CATEGORIES)
  const exclusions: InventoryRecord[] = []
  const onHand: InventoryRecord[] = []
  const offHand: InventoryRecord[] = []

  for (const i of inventory) {
    byCategory[i.category].push(i)
    if (i.category === 'exclusion') exclusions.push(i)
    if (i.onHand) onHand.push(i)
    else offHand.push(i)
  }

  return {
    totalCount: inventory.length,
    byCategory,
    exclusions,
    onHand,
    offHand,
  }
}

export function buildDashboardTrainingView(records: PlantBuildRecord[]): DashboardTrainingView {
  const training = records.filter((r): r is TrainingRecord => r.kind === 'training')
  const byAudience = emptyCategoryMap<TrainingAudience, TrainingRecord>(TRAINING_AUDIENCES)
  const langSet = new Set<string>()

  for (const t of training) {
    byAudience[t.audience].push(t)
    for (const l of t.languagesAvailable) langSet.add(l)
  }

  return {
    totalCount: training.length,
    byAudience,
    bilingualLanguages: [...langSet].sort(),
  }
}

export function buildDashboardReviewQueueView(records: PlantBuildRecord[]): DashboardReviewQueueView {
  const needsReview: PlantBuildRecord[] = []
  const escalated: PlantBuildRecord[] = []
  const unsafe: PlantBuildRecord[] = []
  const drafts: PlantBuildRecord[] = []

  for (const r of records) {
    if (r.review.status === 'draft') drafts.push(r)
    else if (r.review.status === 'needs_review') needsReview.push(r)
    else if (r.review.status === 'escalated') escalated.push(r)
    if (r.review.safetyLabel === 'unsafe_do_not_use' || r.review.safetyLabel === 'escalation_required') {
      unsafe.push(r)
    }
  }

  return {
    needsReview,
    escalated,
    unsafe,
    drafts,
    totalPending: needsReview.length + escalated.length + drafts.length,
  }
}

// ──────────────────────────────────────────────────────────────────────────

export function buildPlantBrainCompleteness(
  records: PlantBuildRecord[],
  profile: PlantProfileRecord | null,
): PlantBrainCompleteness {
  const inventoryCount = records.filter(r => r.kind === 'inventory').length
  const ruleCount = records.filter(r => r.kind === 'rule').length
  const trainingCount = records.filter(r => r.kind === 'training').length

  const plantProfileComplete = !!profile
    && !!profile.identity.name
    && profile.services.length > 0
    && (profile.staff?.length ?? 0) > 0

  const minInventoryCaptured = inventoryCount >= MIN_INVENTORY
  const minRulesCaptured = ruleCount >= MIN_RULES
  const minTrainingCaptured = trainingCount >= MIN_TRAINING

  const readyForDashboard =
    plantProfileComplete && minInventoryCaptured && minRulesCaptured && minTrainingCaptured

  const missingPhases: PlantBrainCompleteness['missingPhases'] = []
  if (!plantProfileComplete) missingPhases.push('profile')
  if (!minInventoryCaptured) missingPhases.push('inventory')
  if (!minRulesCaptured) missingPhases.push('rules')
  if (!minTrainingCaptured) missingPhases.push('training')

  return {
    plantProfileComplete,
    minInventoryCaptured,
    minRulesCaptured,
    minTrainingCaptured,
    readyForDashboard,
    missingPhases,
  }
}

// ──────────────────────────────────────────────────────────────────────────

export function buildPlantBrainViewModel(
  records: PlantBuildRecord[],
  profile: PlantProfileRecord | null,
): PlantBrainViewModel {
  return {
    plant: profile,
    rules: buildDashboardPlantRulesView(records),
    inventory: buildDashboardInventoryView(records),
    training: buildDashboardTrainingView(records),
    reviewQueue: buildDashboardReviewQueueView(records),
    completeness: buildPlantBrainCompleteness(records, profile),
  }
}

// ──────────────────────────────────────────────────────────────────────────

function emptyCategoryMap<K extends string, V>(keys: readonly K[]): Record<K, V[]> {
  const out = {} as Record<K, V[]>
  for (const k of keys) out[k] = []
  return out
}
