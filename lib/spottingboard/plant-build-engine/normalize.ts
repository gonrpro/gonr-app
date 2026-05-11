// lib/spottingboard/plant-build-engine/normalize.ts — TASK-189 v0 skeleton
//
// Pure converters: storage shape → canonical PlantBuildRecord. This is the
// only file in the engine that touches storage-specific shapes; everything
// downstream (views, exports, gonr-connect) consumes canonical records.
//
// Three input shapes, one canonical output:
//   1. LlmExtractionPayload  → PlantBuildRecord[]  (from interview + extraction)
//   2. PlantBrainItemRow     → PlantBuildRecord    (storage strategy A — current schema)
//   3. PlantInventoryRow     → InventoryRecord     (storage strategy B — future schema)
//
// Strategy decision (recommended in README.md): A for v0 to avoid DDL.
// normalize.ts is built so the switch is local — renderers don't change.

import type {
  CorrectionEntry,
  InventoryCategory,
  InventoryRecord,
  LlmExtractionPayload,
  PlantBrainItemRow,
  PlantBuildRecord,
  PlantInventoryRow,
  PlantProfileRecord,
  ProvenanceState,
  ReviewState,
  RuleCategory,
  RuleRecord,
  SafetyLabel,
  StaffRole,
  TrainingAudience,
  TrainingCategory,
  TrainingRecord,
} from './types'

// ──────────────────────────────────────────────────────────────────────────
// LLM extraction → canonical records
// ──────────────────────────────────────────────────────────────────────────

/** Promotes an LlmExtractionPayload to a list of canonical records. Each
 *  proposed sub-record carries `provenance.source = 'llm_extracted'` and the
 *  payload's `modelConfidence`. The validator (separate layer) decides
 *  whether the record meets the review threshold; this function does no
 *  filtering, just shape conversion. */
export function fromLlmExtraction(payload: LlmExtractionPayload): PlantBuildRecord[] {
  const out: PlantBuildRecord[] = []
  const now = payload.extractedAt
  const provenance: ProvenanceState = {
    source: 'llm_extracted',
    authority: 'plant_local',
    confidence: payload.modelConfidence,
  }
  const review: ReviewState = {
    status: 'needs_review',
    safetyLabel: 'needs_source_review',
  }

  if (payload.extracted.profile) {
    out.push(buildPlantProfile(payload.plantId, payload.extracted.profile, provenance, review, now))
  }
  for (const part of payload.extracted.inventory ?? []) {
    out.push(buildInventory(payload.plantId, part, provenance, review, now))
  }
  for (const part of payload.extracted.rules ?? []) {
    out.push(buildRule(payload.plantId, part, provenance, review, now))
  }
  for (const part of payload.extracted.training ?? []) {
    out.push(buildTraining(payload.plantId, part, provenance, review, now))
  }
  return out
}

function buildPlantProfile(
  plantId: string,
  part: Partial<PlantProfileRecord>,
  provenance: ProvenanceState,
  review: ReviewState,
  now: string,
): PlantProfileRecord {
  return {
    kind: 'plant_profile',
    id: part.id ?? generateId('profile'),
    plantId,
    createdAt: part.createdAt ?? now,
    updatedAt: now,
    provenance: part.provenance ?? provenance,
    review: part.review ?? review,
    correctionHistory: part.correctionHistory,
    identity: part.identity ?? { name: '' },
    services: part.services ?? [],
    customerMix: part.customerMix,
    languages: part.languages ?? [],
    staff: part.staff,
    riskTolerance: part.riskTolerance,
  }
}

function buildInventory(
  plantId: string,
  part: Partial<InventoryRecord>,
  provenance: ProvenanceState,
  review: ReviewState,
  now: string,
): InventoryRecord {
  return {
    kind: 'inventory',
    id: part.id ?? generateId('inv'),
    plantId,
    createdAt: part.createdAt ?? now,
    updatedAt: now,
    provenance: part.provenance ?? provenance,
    review: part.review ?? review,
    correctionHistory: part.correctionHistory,
    category: (part.category as InventoryCategory) ?? 'chemical',
    name: part.name ?? '(unnamed)',
    brand: part.brand,
    purpose: part.purpose,
    onHand: part.onHand ?? false,
    storageLocation: part.storageLocation,
    allowedUsers: part.allowedUsers,
    safetyLimits: part.safetyLimits,
    substitutes: part.substitutes,
    notes: part.notes,
  }
}

function buildRule(
  plantId: string,
  part: Partial<RuleRecord>,
  provenance: ProvenanceState,
  review: ReviewState,
  now: string,
): RuleRecord {
  return {
    kind: 'rule',
    id: part.id ?? generateId('rule'),
    plantId,
    createdAt: part.createdAt ?? now,
    updatedAt: now,
    provenance: part.provenance ?? provenance,
    review: part.review ?? review,
    correctionHistory: part.correctionHistory,
    category: (part.category as RuleCategory) ?? 'standard_procedure',
    scope: part.scope ?? {},
    title: part.title ?? '(untitled rule)',
    body: part.body ?? '',
    steps: part.steps,
    chemicalsUsed: part.chemicalsUsed,
    stopWhen: part.stopWhen,
    escalateWhen: part.escalateWhen,
    appliesToRoles: part.appliesToRoles,
  }
}

function buildTraining(
  plantId: string,
  part: Partial<TrainingRecord>,
  provenance: ProvenanceState,
  review: ReviewState,
  now: string,
): TrainingRecord {
  return {
    kind: 'training',
    id: part.id ?? generateId('train'),
    plantId,
    createdAt: part.createdAt ?? now,
    updatedAt: now,
    provenance: part.provenance ?? provenance,
    review: part.review ?? review,
    correctionHistory: part.correctionHistory,
    category: (part.category as TrainingCategory) ?? 'basics',
    audience: (part.audience as TrainingAudience) ?? 'all',
    title: part.title ?? '(untitled training)',
    body: part.body ?? '',
    examples: part.examples,
    languagesAvailable: part.languagesAvailable ?? [],
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Storage strategy A — plant_brain_items row → canonical record
// ──────────────────────────────────────────────────────────────────────────

/** Maps a plant_brain_items row to a canonical record. The row's `module`
 *  determines the record kind; `tenant_provenance` carries kind-specific
 *  facets when storage strategy A is in use (e.g., inventory facets land in
 *  `tenant_provenance.inventory`). */
export function fromPlantBrainItem(row: PlantBrainItemRow): PlantBuildRecord {
  const provenance: ProvenanceState = readProvenance(row.tenant_provenance)
  const review: ReviewState = {
    status: mapReviewStatus(row.review_status),
    reviewedBy: row.reviewer_email ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    safetyLabel: (row.safety_label as SafetyLabel) ?? 'needs_source_review',
  }
  const correctionHistory = readCorrectionHistory(row.tenant_provenance)

  switch (row.module) {
    case 'inventory': {
      const facets = (row.tenant_provenance.inventory as Partial<InventoryRecord>) ?? {}
      return {
        kind: 'inventory',
        id: row.id,
        plantId: row.plant_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        provenance,
        review,
        correctionHistory,
        category: (facets.category as InventoryCategory) ?? 'chemical',
        name: facets.name ?? row.title ?? '(unnamed)',
        brand: facets.brand,
        purpose: facets.purpose ?? row.body,
        onHand: facets.onHand ?? true,
        storageLocation: facets.storageLocation,
        allowedUsers: facets.allowedUsers,
        safetyLimits: facets.safetyLimits,
        substitutes: facets.substitutes,
        notes: facets.notes,
      }
    }
    case 'training_check': {
      const facets = (row.tenant_provenance.training as Partial<TrainingRecord>) ?? {}
      return {
        kind: 'training',
        id: row.id,
        plantId: row.plant_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        provenance,
        review,
        correctionHistory,
        category: (facets.category as TrainingCategory) ?? 'basics',
        audience: (facets.audience as TrainingAudience) ?? 'all',
        title: row.title ?? facets.title ?? '(untitled training)',
        body: row.body ?? facets.body ?? '',
        examples: facets.examples,
        languagesAvailable: facets.languagesAvailable ?? [],
      }
    }
    case 'plant_profile': {
      const facets = (row.tenant_provenance.profile as Partial<PlantProfileRecord>) ?? {}
      return {
        kind: 'plant_profile',
        id: row.id,
        plantId: row.plant_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        provenance,
        review,
        correctionHistory,
        identity: facets.identity ?? { name: row.title ?? '' },
        services: facets.services ?? [],
        customerMix: facets.customerMix,
        languages: facets.languages ?? [],
        staff: facets.staff,
        riskTolerance: facets.riskTolerance,
      }
    }
    default: {
      // chemistry_rule, escalation_rule, procedure, reference_sop, preference, tribal_note → Rule
      const category: RuleCategory =
        row.module === 'escalation_rule' ? 'escalation'
        : row.module === 'procedure' ? 'standard_procedure'
        : row.module === 'reference_sop' ? 'standard_procedure'
        : row.module === 'preference' ? 'exception'
        : row.module === 'tribal_note' ? 'exception'
        : 'standard_procedure'
      const facets = (row.tenant_provenance.rule as Partial<RuleRecord>) ?? {}
      return {
        kind: 'rule',
        id: row.id,
        plantId: row.plant_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        provenance,
        review,
        correctionHistory,
        category,
        scope: facets.scope ?? {},
        title: row.title ?? facets.title ?? '(untitled rule)',
        body: row.body,
        steps: facets.steps,
        chemicalsUsed: facets.chemicalsUsed,
        stopWhen: facets.stopWhen,
        escalateWhen: facets.escalateWhen,
        appliesToRoles: facets.appliesToRoles as StaffRole[] | undefined,
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Storage strategy B — plant_inventory row → canonical record
// ──────────────────────────────────────────────────────────────────────────

/** Maps a (hypothetical) plant_inventory row to a canonical InventoryRecord.
 *  This is the strategy-B path; renderers do not change. The function is
 *  here to make the storage-swap surface explicit: if Atlas decides to add
 *  a plant_inventory table later, only this file changes. */
export function fromPlantInventoryRow(row: PlantInventoryRow): InventoryRecord {
  const provenance: ProvenanceState = readProvenance(row.provenance)
  return {
    kind: 'inventory',
    id: row.id,
    plantId: row.plant_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    provenance,
    review: {
      status: mapReviewStatus(row.review_status),
      reviewedBy: row.reviewer_email ?? undefined,
      reviewedAt: row.reviewed_at ?? undefined,
      safetyLabel: (row.safety_label as SafetyLabel) ?? 'needs_source_review',
    },
    category: (row.category as InventoryCategory),
    name: row.name,
    brand: row.brand ?? undefined,
    purpose: row.purpose ?? undefined,
    onHand: row.on_hand,
    storageLocation: row.storage_location ?? undefined,
    allowedUsers: row.allowed_users as StaffRole[],
    safetyLimits: row.safety_limits,
    substitutes: row.substitutes,
    notes: row.notes ?? undefined,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers (pure)
// ──────────────────────────────────────────────────────────────────────────

function readProvenance(raw: Record<string, unknown>): ProvenanceState {
  const p = (raw.provenance as Partial<ProvenanceState>) ?? {}
  return {
    source: p.source ?? 'operator_memory',
    authority: p.authority ?? 'plant_local',
    attributedTo: p.attributedTo,
    confidence: p.confidence,
    citation: p.citation,
  }
}

function readCorrectionHistory(raw: Record<string, unknown>): CorrectionEntry[] | undefined {
  const list = raw.correctionHistory as CorrectionEntry[] | undefined
  return Array.isArray(list) && list.length > 0 ? list : undefined
}

function mapReviewStatus(s: string): ReviewState['status'] {
  switch (s) {
    case 'reviewed-accept': return 'approved'
    case 'reviewed-reject': return 'rejected'
    case 'in-review':       return 'needs_review'
    case 'unreviewed':      return 'needs_review'
    default: {
      const allowed: ReviewState['status'][] = ['draft', 'needs_review', 'approved', 'rejected', 'escalated']
      return allowed.includes(s as ReviewState['status']) ? (s as ReviewState['status']) : 'needs_review'
    }
  }
}

let __idCounter = 0
function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}_${crypto.randomUUID()}`
  __idCounter += 1
  return `${prefix}_${Date.now()}_${__idCounter}`
}
