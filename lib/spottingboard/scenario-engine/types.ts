// lib/spottingboard/scenario-engine/types.ts — TASK-188 v0
//
// Shared types for the Spotting Board ↔ GONR scenario engine. The engine
// turns a real-world stain situation into one of three outcomes:
//   1. protocol_match     — safe known GONR/library recommendation preview
//   2. plant_local_draft  — useful plant-local knowledge, not broad guidance
//   3. escalation_required — unknown/high-risk/conflicting; supervisor/review
//
// Contract source: ~/shared-workspace/TASK-188-scenario-engine-api.md
// Future consumers (homepage demo, dashboard next-best-question, supervisor
// review playback, export footer, GONR feedback) speak this vocabulary.

export type ScenarioEventType =
  | 'observed_case'
  | 'guided_triage_answer'
  | 'protocol_recommendation'
  | 'operator_decision'
  | 'supervisor_review'
  | 'outcome_report'
  | 'plant_rule_created'
  | 'plant_rule_promoted'
  | 'plant_rule_demoted'
  | 'export_generated'
  | 'training_gap_detected'

export type TriageField =
  | 'stain'
  | 'fabric'
  | 'prior_treatment'
  | 'context'
  | 'outcome'

export interface TriageAnswer {
  field: TriageField
  value: string
  label: string
  source: 'chip' | 'text' | 'system'
  confidence: 'explicit' | 'inferred' | 'unknown'
}

export interface GuidedCaptureSession {
  id: string
  plantId: string
  role: 'owner' | 'operator' | 'spotter' | string
  answers: TriageAnswer[]
  events: ScenarioEvent[]
  status: 'active' | 'resolved' | 'committed' | 'abandoned'
  createdAt: string
  updatedAt: string
}

export interface ScenarioStepChip {
  value: string
  label: string
  risk?: 'normal' | 'caution' | 'high'
}

export interface ScenarioStep {
  id: string
  field: TriageField
  prompt: string
  why: string
  whatUpdates: string
  chips: ScenarioStepChip[]
  allowText: boolean
}

export type ScenarioResolution =
  | RecommendedProtocolPreview
  | PlantLocalDraft
  | EscalationRequired

export interface RecommendedProtocolPreview {
  kind: 'protocol_match'
  title: string
  summary: string
  stain: string
  fabric: string
  safetyLabel: string
  provenance: 'source_backed' | 'plant_confirmed' | 'mixed'
  caveats: string[]
  nextAction: 'show_protocol' | 'capture_outcome' | 'send_to_review'
  /** Forwarded so the consumer can deep-link to /solve for full steps. */
  solveLinkParams?: { stain: string; surface: string }
}

export interface PlantLocalDraft {
  kind: 'plant_local_draft'
  title: string
  body: string
  safetyLabel: string
  provenance: 'plant_local_draft'
  needsSupervisorReview: true
  capturedContext: TriageAnswer[]
}

export interface EscalationRequired {
  kind: 'escalation_required'
  reason: string
  safetyLabel: 'hard_block' | 'caution' | 'unknown'
  capturedContext: TriageAnswer[]
  nextAction: 'supervisor_review' | 'professional_judgment_required'
}

export interface OutcomeFeedback {
  result: 'worked' | 'partial' | 'failed' | 'damage_risk' | 'unknown'
  notes?: string
  followUpNeeded?: boolean
}

export interface ScenarioEvent {
  type: ScenarioEventType
  at: string
  sessionId: string
  plantId: string
  payload: Record<string, unknown>
}
