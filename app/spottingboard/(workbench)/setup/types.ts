// app/spottingboard/(workbench)/setup/types.ts — TASK-189 v0
//
// Local session types for the chat-first setup surface. Where possible we
// reuse canonical types from lib/spottingboard/plant-build-engine/types.ts.

import type {
  CorrectionSignalScope,
  PlantBuildRecord,
  PlantProfileRecord,
  ProvenanceState,
  ReviewState,
} from '@/lib/spottingboard/plant-build-engine/types'

// 7 deterministic phases from the rebuild spec.
export type SetupPhaseId =
  | 'plant_profile'
  | 'equipment'
  | 'chemistry_inventory'
  | 'standard_workflows'
  | 'exceptions_rules'
  | 'training_knowledge'
  | 'review_publish'

export interface PhaseTarget {
  phaseId: SetupPhaseId
  /** What sub-categories this phase covers (e.g., ['solvent_system', 'spotting_board'] for equipment). */
  requiredCategories: string[]
  /** Minimum signal count of canonical records to consider the phase covered. */
  minSignalCount: number
  /** Current count of records contributing to this phase. */
  currentSignalCount: number
  /** True once minimum signal is reached. */
  isCovered: boolean
}

export interface OpenFollowup {
  field: string                                 // dotted path, e.g., 'inventory.purpose'
  reason: string                                // human-readable, used by orchestrator
  raisedAt: string
  raisedBy: 'validator' | 'extractor' | 'operator'
}

export type ValidatorFlag =
  | 'vague'
  | 'unsafe'
  | 'contradictory'
  | 'overbroad'
  | 'unscoped'
  | 'risky_prior_treatment'
  | 'unreviewed_treated_as_approved'

export interface TranscriptTurn {
  id: string
  role: 'assistant' | 'operator'
  content: string
  /** Confirmation cards that resulted from this turn. */
  candidateIds?: string[]
  /** ISO timestamp. */
  at: string
}

/** Candidate record proposed by the extractor before operator confirmation. */
export interface CandidateRecord {
  id: string                              // local id, becomes record.id on confirm
  kind: PlantBuildRecord['kind']
  fields: Record<string, unknown>         // partial-shape fields per the extractor
  confidence: number                      // 0..1 from extractor
  sourceSpan?: { turnIndex: number; start: number; end: number }
  missingFields: string[]
  safetyFlags: ValidatorFlag[]
  provenance: ProvenanceState
  review: ReviewState
  /** Set when the operator has confirmed/edited the candidate. */
  status: 'pending' | 'confirmed' | 'rejected' | 'edited'
  /** Confirmation timestamp. */
  decidedAt?: string
}

export interface OrchestratorNextQuestion {
  phaseId: SetupPhaseId
  prompt: string
  whyAsking: string
  expectedFieldPath?: string
  chips: Array<{ value: string; label: string }>
  allowText: boolean
  isPushback: boolean
  pushbackReason: ValidatorFlag | null
}

export interface OrchestratorResponse {
  nextQuestion: OrchestratorNextQuestion
  progressNote?: string
  /** If true, the cap policy triggered; client should show resume option. */
  cappedSession?: boolean
}

export interface ExtractorResponse {
  candidates: CandidateRecord[]
  globalSafetyFlags: ValidatorFlag[]
}

export interface SetupSessionState {
  plantId: string
  plant: PlantProfileRecord | null
  currentPhase: SetupPhaseId
  phaseTargets: PhaseTarget[]
  capturedRecords: PlantBuildRecord[]
  pendingCandidates: CandidateRecord[]
  transcript: TranscriptTurn[]
  openFollowups: OpenFollowup[]
  safetyFlags: ValidatorFlag[]
  /** User turns consumed (towards cap). */
  userTurnCount: number
  /** ISO start timestamp. */
  startedAt: string
}

/** Sent to the storage adapter to persist a confirmed candidate as a real
 *  plant_brain_items row. */
export interface ConfirmedCandidate {
  candidate: CandidateRecord
  operatorEdits?: Record<string, unknown>
  operatorSignalScope?: CorrectionSignalScope
}
