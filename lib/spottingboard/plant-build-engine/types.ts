// lib/spottingboard/plant-build-engine/types.ts — TASK-189 v0 skeleton
//
// Canonical app-facing model for the Spotting Board plant-build engine.
// Renderers (dashboard, exports, GONR connect) consume these types; they
// never reach into the underlying storage layer. This is the boundary that
// lets storage strategy A (everything inside plant_brain_items + jsonb) or
// strategy B (dedicated plant_inventory + plant_training tables) swap
// without touching consumers.
//
// Architecture (Atlas + Tyler, 2026-05-11):
//   1. Interview model (frontier LLM)   — natural conversation
//   2. Extraction model (frontier LLM)  — transcript → structured records
//   3. Validator (deterministic code)   — schema, safety, confidence
//   4. Human review                     — nothing published until confirmed
//
// Tyler's feedback-loop directive: every operator correction/verification is
// itself data. Records carry `correctionHistory[]`; sessions emit
// `FeedbackEvent`s so the system can be measured and improved.
//
// This file defines types only. Pure data, no runtime.

// ──────────────────────────────────────────────────────────────────────────
// Common metadata
// ──────────────────────────────────────────────────────────────────────────

export type RecordKind = 'plant_profile' | 'inventory' | 'rule' | 'training'

export type SafetyLabel =
  | 'source_backed'
  | 'reviewed_for_plant_use'
  | 'needs_source_review'
  | 'escalation_required'
  | 'unsafe_do_not_use'

export type ReviewStatus =
  | 'draft'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'escalated'

export interface ReviewState {
  status: ReviewStatus
  reviewedBy?: string
  reviewedAt?: string
  safetyLabel: SafetyLabel
  /** Free-text reviewer note (optional). */
  reviewerNote?: string
}

export type ProvenanceSource =
  | 'operator_memory'        // operator stated it directly
  | 'plant_rule'             // captured via guided interview chip/text
  | 'gonr_source_backed'     // came from the GONR protocol library
  | 'outcome_backed'         // confirmed by a recorded outcome
  | 'llm_extracted'          // proposed by the extraction model; needs review

export type ProvenanceAuthority =
  | 'plant_local'            // local to this plant, not for broad guidance
  | 'plant_confirmed'        // plant operator/supervisor signed off
  | 'source_backed'          // backed by external source (e.g., SB library)

export interface ProvenanceState {
  source: ProvenanceSource
  authority: ProvenanceAuthority
  /** Email of the operator/supervisor attributed to this record. */
  attributedTo?: string
  /** 0..1; meaningful for `llm_extracted` records, set by the extractor. */
  confidence?: number
  /** Free-text source citation when applicable (e.g., "SB protocol library 2026-04"). */
  citation?: string
}

/** Per-correction event metadata. Atlas 2026-05-11 lock: every correction
 *  must store the full delta so the system can learn from operator feedback.
 *  Plant-only vs globally useful is the signal-quality discriminator: an
 *  operator renaming a brand they use is plant-only; an operator flagging
 *  that "POG" is a category name not a brand is globally useful. */
export type CorrectionSignalScope = 'plant_only' | 'globally_useful' | 'unknown'

export interface CorrectionEntry {
  at: string
  by: string                 // operator/supervisor email
  field: string              // which field changed
  prev: unknown
  next: unknown
  reason?: string
  confidenceBefore?: number  // model confidence at the time of extraction
  confidenceAfter?: number   // post-correction confidence (typically 1.0 if operator-confirmed)
  signalScope?: CorrectionSignalScope
}

export interface BaseRecord {
  id: string
  plantId: string
  kind: RecordKind
  createdAt: string
  updatedAt: string
  provenance: ProvenanceState
  review: ReviewState
  /** Append-only edits operators have made since first extraction. */
  correctionHistory?: CorrectionEntry[]
}

// ──────────────────────────────────────────────────────────────────────────
// Plant Profile
// ──────────────────────────────────────────────────────────────────────────

export type PlantService =
  | 'dryclean'
  | 'laundry'
  | 'wetclean'
  | 'household'
  | 'restoration'
  | 'alterations'

export type CustomerMixSegment =
  | 'retail'
  | 'route'
  | 'hotel_linen'
  | 'commercial'

export type StaffRole = 'owner' | 'supervisor' | 'spotter' | 'operator'

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export interface StaffSlot {
  role: StaffRole
  count?: number
  primarySkill?: SkillLevel
}

export type RiskTolerance = 'conservative' | 'standard' | 'aggressive'

export interface PlantProfileRecord extends BaseRecord {
  kind: 'plant_profile'
  identity: {
    name: string
    location?: string
  }
  services: PlantService[]
  customerMix?: CustomerMixSegment[]
  languages: string[]               // ISO 639-1 codes; empty array if monolingual default
  staff?: StaffSlot[]
  riskTolerance?: RiskTolerance
}

// ──────────────────────────────────────────────────────────────────────────
// Inventory
// ──────────────────────────────────────────────────────────────────────────

export type InventoryCategory =
  | 'solvent_system'
  | 'wetcleaning_setup'
  | 'spotting_board'
  | 'steam_air_vacuum'
  | 'washer_dryer'
  | 'pressing_finishing'
  | 'specialty_tool'
  | 'spotting_agent'
  | 'chemical'
  | 'protective'
  | 'exclusion'              // explicit "we don't use this" entries

export interface InventoryRecord extends BaseRecord {
  kind: 'inventory'
  category: InventoryCategory
  name: string
  brand?: string
  purpose?: string
  onHand: boolean
  storageLocation?: string
  allowedUsers?: StaffRole[]
  safetyLimits?: string[]
  substitutes?: string[]
  notes?: string
}

// ──────────────────────────────────────────────────────────────────────────
// Rules + Protocols
// ──────────────────────────────────────────────────────────────────────────

export type RuleCategory =
  | 'standard_procedure'
  | 'exception'
  | 'escalation'
  | 'forbidden'
  | 'handoff'

export interface RuleScope {
  stains?: string[]
  fabrics?: string[]
  conditions?: string[]      // free-text qualifiers ("if customer used heat")
}

export interface RuleRecord extends BaseRecord {
  kind: 'rule'
  category: RuleCategory
  scope: RuleScope
  title: string
  body: string
  steps?: string[]
  /** References to InventoryRecord.name (or canonical chemical name). */
  chemicalsUsed?: string[]
  stopWhen?: string
  escalateWhen?: string
  appliesToRoles?: StaffRole[]
}

// ──────────────────────────────────────────────────────────────────────────
// Training Knowledge
// ──────────────────────────────────────────────────────────────────────────

export type TrainingCategory =
  | 'basics'
  | 'sop'
  | 'escalation_path'
  | 'opening_checklist'
  | 'closing_checklist'
  | 'safety_warning'
  | 'bilingual_phrasebook'

export type TrainingAudience = 'new_hire' | 'spotter' | 'supervisor' | 'all'

export interface TrainingExample {
  scenario: string
  correctAction: string
  mistakeToAvoid?: string
}

export interface TrainingRecord extends BaseRecord {
  kind: 'training'
  category: TrainingCategory
  audience: TrainingAudience
  title: string
  body: string
  examples?: TrainingExample[]
  languagesAvailable: string[]      // ISO 639-1 codes
}

// ──────────────────────────────────────────────────────────────────────────
// Discriminated union
// ──────────────────────────────────────────────────────────────────────────

export type PlantBuildRecord =
  | PlantProfileRecord
  | InventoryRecord
  | RuleRecord
  | TrainingRecord

// ──────────────────────────────────────────────────────────────────────────
// View models — what dashboard sections render
// ──────────────────────────────────────────────────────────────────────────

export interface DashboardPlantRulesView {
  totalCount: number
  byCategory: Record<RuleCategory, RuleRecord[]>
  byStain: Record<string, RuleRecord[]>     // grouped key = lowercased stain
}

export interface DashboardInventoryView {
  totalCount: number
  byCategory: Record<InventoryCategory, InventoryRecord[]>
  exclusions: InventoryRecord[]
  onHand: InventoryRecord[]
  offHand: InventoryRecord[]
}

export interface DashboardTrainingView {
  totalCount: number
  byAudience: Record<TrainingAudience, TrainingRecord[]>
  bilingualLanguages: string[]              // union of languages_available
}

export interface DashboardReviewQueueView {
  needsReview: PlantBuildRecord[]
  escalated: PlantBuildRecord[]
  unsafe: PlantBuildRecord[]
  drafts: PlantBuildRecord[]
  totalPending: number
}

export interface PlantBrainCompleteness {
  plantProfileComplete: boolean
  minInventoryCaptured: boolean      // ≥ 3 inventory entries
  minRulesCaptured: boolean          // ≥ 5 rule entries
  minTrainingCaptured: boolean       // ≥ 1 training entry
  readyForDashboard: boolean         // all four AND review-state thresholds met
  missingPhases: Array<'profile' | 'inventory' | 'rules' | 'training'>
}

export interface PlantBrainViewModel {
  plant: PlantProfileRecord | null
  rules: DashboardPlantRulesView
  inventory: DashboardInventoryView
  training: DashboardTrainingView
  reviewQueue: DashboardReviewQueueView
  completeness: PlantBrainCompleteness
}

// ──────────────────────────────────────────────────────────────────────────
// Export artifact DTOs (no PDF generation here — these go to templates)
// ──────────────────────────────────────────────────────────────────────────

export interface EmployeeManualDTO {
  plant: {
    name: string
    location?: string
    languages: string[]
  }
  sections: Array<{
    heading: string
    paragraphs: string[]
    rules?: RuleRecord[]
    inventory?: InventoryRecord[]
  }>
  appendixInventory: InventoryRecord[]
  generatedAt: string
}

export interface TrainingGuideDTO {
  plant: {
    name: string
    languages: string[]
  }
  audience: TrainingAudience
  beginnerPath: TrainingRecord[]
  commonStainRules: RuleRecord[]
  escalationPaths: RuleRecord[]
  scenarios: TrainingExample[]
  generatedAt: string
}

export interface OpsBookDTO {
  plant: {
    name: string
    location?: string
  }
  indexByStain: Record<string, RuleRecord[]>
  indexByFabric: Record<string, RuleRecord[]>
  inventory: InventoryRecord[]
  exclusions: InventoryRecord[]
  safetyWarnings: RuleRecord[]
  generatedAt: string
}

export interface QuickSheetDTO {
  plant: {
    name: string
    languages: string[]
  }
  category: 'common_stains' | 'never_do' | 'escalation' | 'bilingual_terms'
  cards: Array<{
    title: string
    body: string
    bilingual?: Record<string, string>      // language code → translated body
  }>
  generatedAt: string
}

// ──────────────────────────────────────────────────────────────────────────
// GONR connect payload
// ──────────────────────────────────────────────────────────────────────────

export interface GonrConnectModuleConfig {
  inventory: boolean
  rules: boolean
  training: boolean
}

export interface GonrConnectPayload {
  plantId: string
  connectedAt: string
  modulesEnabled: GonrConnectModuleConfig
  eligibleRecords: {
    rules: RuleRecord[]
    inventory: InventoryRecord[]
    training: TrainingRecord[]
  }
  /** Operator-explicit do-not-flow record ids (per-item opt-out). */
  perItemExclusions: string[]
  outcomeFeedbackUrl?: string
  generatedAt: string
}

// ──────────────────────────────────────────────────────────────────────────
// LLM extraction payload (input to normalize.ts)
// ──────────────────────────────────────────────────────────────────────────

export interface LlmExtractionPayload {
  plantId: string
  rawTranscript: string
  /** Partial records the extractor proposes; validator promotes them to full records. */
  extracted: {
    profile?: Partial<PlantProfileRecord>
    inventory?: Array<Partial<InventoryRecord>>
    rules?: Array<Partial<RuleRecord>>
    training?: Array<Partial<TrainingRecord>>
  }
  /** Global confidence the model has in its own extraction. 0..1. */
  modelConfidence: number
  model: string
  extractedAt: string
}

// ──────────────────────────────────────────────────────────────────────────
// Feedback loop (Tyler 2026-05-11: corrections improve the system)
// ──────────────────────────────────────────────────────────────────────────

export type FeedbackEventType =
  | 'extraction_accepted'        // operator approved an LLM-extracted record as-is
  | 'extraction_corrected'       // operator edited an LLM-extracted record before approving
  | 'extraction_rejected'        // operator rejected the extraction entirely
  | 'rule_outcome_reported'      // a recorded outcome confirmed/contradicted a rule
  | 'review_completed'           // supervisor cleared a review queue item

export interface FeedbackEvent {
  type: FeedbackEventType
  at: string
  plantId: string
  recordId: string
  recordKind: RecordKind
  by?: string                                // operator/supervisor email
  /** Confidence the extractor reported at time of proposal (if available). */
  confidenceBefore?: number
  /** Post-correction confidence — typically 1.0 after operator confirmation. */
  confidenceAfter?: number
  /** Whether this correction is local to this plant or a globally useful signal. */
  signalScope?: CorrectionSignalScope
  /** Free-text reason from the operator (e.g., "wrong brand name"). */
  reason?: string
  /** Snapshot of the fields the operator changed, if `extraction_corrected`. */
  fieldDelta?: Record<string, { prev: unknown; next: unknown }>
}

// ──────────────────────────────────────────────────────────────────────────
// Storage-shape adapters (engine consumes these via normalize.ts)
//
// Strategy A: every record (including inventory + training) lives in
// plant_brain_items; tenant_provenance jsonb carries the inventory/training
// shape. No DDL beyond extending the module check constraint by a value.
//
// Strategy B: separate plant_inventory + plant_training tables. Cleaner
// long-term, requires DDL approval.
//
// The renderer side of the engine doesn't see either shape — only canonical
// PlantBuildRecord. normalize.ts is the only place these shapes appear.
// ──────────────────────────────────────────────────────────────────────────

export interface PlantBrainItemRow {
  id: string
  plant_id: string
  module: string              // existing enum: chemistry_rule | escalation_rule | training_check | reference_sop | plant_profile | procedure | preference | tribal_note | (strategy A: 'inventory')
  title: string | null
  body: string
  authority_class: string
  feed_mode: string
  consent: Record<string, unknown>
  tenant_provenance: Record<string, unknown>
  review_status: string
  promotion_status: string
  source_evidence: unknown[]
  runtime_eligible: boolean
  conflict_flags: unknown[]
  safety_label: string
  reviewer_email: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface PlantInventoryRow {
  id: string
  plant_id: string
  category: string
  name: string
  brand: string | null
  purpose: string | null
  on_hand: boolean
  storage_location: string | null
  allowed_users: string[]
  safety_limits: string[]
  substitutes: string[]
  notes: string | null
  provenance: Record<string, unknown>
  review_status: string
  safety_label: string
  reviewer_email: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}
