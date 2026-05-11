// lib/spottingboard/plant-build-engine/exports.ts — TASK-189 v0 skeleton
//
// Pure DTO builders. Take canonical records + plant profile, produce
// structured export DTOs ready to be passed to PDF/Markdown templates.
// No PDF generation here — that's a downstream concern.
//
// Filtering convention: exports include only review.status === 'approved'
// records by default. Drafts and needs-review rows do not become published
// artifacts. The functions take a `gate` param to allow the dashboard
// "preview as draft" mode to include in-flight records.

import type {
  EmployeeManualDTO,
  InventoryRecord,
  OpsBookDTO,
  PlantBuildRecord,
  PlantProfileRecord,
  QuickSheetDTO,
  ReviewStatus,
  RuleRecord,
  TrainingAudience,
  TrainingExample,
  TrainingGuideDTO,
  TrainingRecord,
} from './types'

export interface ExportGate {
  /** Which review statuses count as publishable. Default: ['approved']. */
  publishableStatuses?: ReviewStatus[]
}

const DEFAULT_GATE: Required<ExportGate> = {
  publishableStatuses: ['approved'],
}

function gateFor(gate?: ExportGate): Required<ExportGate> {
  return { ...DEFAULT_GATE, ...gate }
}

function published<T extends PlantBuildRecord>(records: T[], gate: Required<ExportGate>): T[] {
  return records.filter(r => gate.publishableStatuses.includes(r.review.status))
}

function nowIso(): string {
  return new Date().toISOString()
}

// ──────────────────────────────────────────────────────────────────────────
// Employee Manual
// ──────────────────────────────────────────────────────────────────────────

export function buildEmployeeManual(
  records: PlantBuildRecord[],
  plant: PlantProfileRecord,
  gate?: ExportGate,
): EmployeeManualDTO {
  const g = gateFor(gate)
  const rules = published(records.filter((r): r is RuleRecord => r.kind === 'rule'), g)
  const inventory = published(records.filter((r): r is InventoryRecord => r.kind === 'inventory'), g)
  const training = published(records.filter((r): r is TrainingRecord => r.kind === 'training'), g)

  const stdProcedures = rules.filter(r => r.category === 'standard_procedure')
  const exceptions = rules.filter(r => r.category === 'exception')
  const escalations = rules.filter(r => r.category === 'escalation')
  const forbidden = rules.filter(r => r.category === 'forbidden')
  const basicsTraining = training.filter(t => t.category === 'basics')

  return {
    plant: {
      name: plant.identity.name,
      location: plant.identity.location,
      languages: plant.languages,
    },
    sections: [
      {
        heading: 'Plant overview',
        paragraphs: [
          `Welcome to ${plant.identity.name}. This manual documents the rules, chemistry, and escalation paths the plant operates on.`,
          ...basicsTraining.map(t => t.body),
        ],
      },
      {
        heading: 'Standard procedures',
        paragraphs: stdProcedures.map(r => r.body),
        rules: stdProcedures,
      },
      {
        heading: 'Exceptions and plant-local rules',
        paragraphs: exceptions.map(r => r.body),
        rules: exceptions,
      },
      {
        heading: 'When to escalate',
        paragraphs: escalations.map(r => r.body),
        rules: escalations,
      },
      {
        heading: 'Never do',
        paragraphs: forbidden.map(r => r.body),
        rules: forbidden,
      },
    ],
    appendixInventory: inventory,
    generatedAt: nowIso(),
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Staff Training Guide
// ──────────────────────────────────────────────────────────────────────────

export function buildTrainingGuide(
  records: PlantBuildRecord[],
  plant: PlantProfileRecord,
  audience: TrainingAudience,
  gate?: ExportGate,
): TrainingGuideDTO {
  const g = gateFor(gate)
  const rules = published(records.filter((r): r is RuleRecord => r.kind === 'rule'), g)
  const training = published(records.filter((r): r is TrainingRecord => r.kind === 'training'), g)

  const audienceFilter = (t: TrainingRecord) => t.audience === audience || t.audience === 'all'
  const beginnerPath = training.filter(t => audienceFilter(t) && t.category === 'basics')
  const commonStainRules = rules.filter(r => r.category === 'standard_procedure')
  const escalationPaths = rules.filter(r => r.category === 'escalation')
  const scenarios: TrainingExample[] = training
    .filter(audienceFilter)
    .flatMap(t => t.examples ?? [])

  return {
    plant: {
      name: plant.identity.name,
      languages: plant.languages,
    },
    audience,
    beginnerPath,
    commonStainRules,
    escalationPaths,
    scenarios,
    generatedAt: nowIso(),
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Ops Book
// ──────────────────────────────────────────────────────────────────────────

export function buildOpsBook(
  records: PlantBuildRecord[],
  plant: PlantProfileRecord,
  gate?: ExportGate,
): OpsBookDTO {
  const g = gateFor(gate)
  const rules = published(records.filter((r): r is RuleRecord => r.kind === 'rule'), g)
  const inventory = published(records.filter((r): r is InventoryRecord => r.kind === 'inventory'), g)

  const indexByStain: Record<string, RuleRecord[]> = {}
  const indexByFabric: Record<string, RuleRecord[]> = {}
  for (const r of rules) {
    for (const s of r.scope.stains ?? []) {
      const k = s.trim().toLowerCase()
      if (!k) continue
      if (!indexByStain[k]) indexByStain[k] = []
      indexByStain[k].push(r)
    }
    for (const f of r.scope.fabrics ?? []) {
      const k = f.trim().toLowerCase()
      if (!k) continue
      if (!indexByFabric[k]) indexByFabric[k] = []
      indexByFabric[k].push(r)
    }
  }

  return {
    plant: {
      name: plant.identity.name,
      location: plant.identity.location,
    },
    indexByStain,
    indexByFabric,
    inventory: inventory.filter(i => i.category !== 'exclusion'),
    exclusions: inventory.filter(i => i.category === 'exclusion'),
    safetyWarnings: rules.filter(r => r.category === 'forbidden' || r.category === 'escalation'),
    generatedAt: nowIso(),
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Quick Sheet (floor-use)
// ──────────────────────────────────────────────────────────────────────────

export function buildQuickSheet(
  records: PlantBuildRecord[],
  plant: PlantProfileRecord,
  category: QuickSheetDTO['category'],
  gate?: ExportGate,
): QuickSheetDTO {
  const g = gateFor(gate)
  const rules = published(records.filter((r): r is RuleRecord => r.kind === 'rule'), g)
  const training = published(records.filter((r): r is TrainingRecord => r.kind === 'training'), g)

  let cards: QuickSheetDTO['cards'] = []
  switch (category) {
    case 'common_stains':
      cards = rules
        .filter(r => r.category === 'standard_procedure')
        .map(r => ({ title: r.title, body: r.body }))
      break
    case 'never_do':
      cards = rules
        .filter(r => r.category === 'forbidden')
        .map(r => ({ title: r.title, body: r.body }))
      break
    case 'escalation':
      cards = rules
        .filter(r => r.category === 'escalation')
        .map(r => ({ title: r.title, body: r.body }))
      break
    case 'bilingual_terms': {
      const phrasebooks = training.filter(t => t.category === 'bilingual_phrasebook')
      cards = phrasebooks.map(t => ({
        title: t.title,
        body: t.body,
      }))
      break
    }
  }

  return {
    plant: {
      name: plant.identity.name,
      languages: plant.languages,
    },
    category,
    cards,
    generatedAt: nowIso(),
  }
}
