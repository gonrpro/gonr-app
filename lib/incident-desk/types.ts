// lib/incident-desk/types.ts — TASK-155 v0
//
// Input/output contracts for the Garment Incident Desk API. Replaces the
// thinner garment-analysis schema. All types serialize cleanly to JSON.

// ──────────────────────────────────────────────────────────────────────────────
// Intake — what the operator captures about the incident
// ──────────────────────────────────────────────────────────────────────────────

export type DamageDiscoveredAt =
  | 'intake'
  | 'inspection'
  | 'after_cleaning'
  | 'after_pressing'
  | 'customer_pickup'
  | 'customer_return'

export type DesiredOutput =
  | 'intake_note'
  | 'decline_note'
  | 'post_treatment_explanation'
  | 'claim_response'
  | 'internal_report'

export interface IncidentPhoto {
  /** Free-form label: 'front' | 'back' | 'detail' | 'care_label' | 'receipt' | 'tag' | other */
  kind: string
  /** Data URL or signed URL. Server may receive base64 data URLs. */
  url: string
}

export interface IncidentIntake {
  // ── Garment identity ──────────────────────────────────────────────────────
  garment_type: string                    // e.g. "blouse", "comforter", "blazer"
  brand_label_notes?: string              // brand, label markings, country of origin
  fiber_content?: string                  // free-form OR structured later
  has_care_label?: boolean
  color?: string
  construction_notes?: string             // weave, lining, padding, etc.
  trim_or_embellishments?: string         // beads, sequins, zippers, leather trim

  // ── Damage ────────────────────────────────────────────────────────────────
  damage_types: string[]                  // ["color_loss", "fiber_damage", "shrinkage", "stain_set", "tear", "other"]
  damage_locations?: string               // where on the garment
  damage_discovered_at: DamageDiscoveredAt
  prior_condition_at_intake?: string      // what the operator noted on intake

  // ── Customer claim ────────────────────────────────────────────────────────
  customer_claim_language?: string        // verbatim from customer if available
  customer_expectations?: string          // what they want resolved

  // ── Process history ───────────────────────────────────────────────────────
  treatment_already_attempted?: string
  chemicals_or_process_used?: string
  staff_involved?: string                 // names or roles
  plant_or_location?: string

  // ── Order metadata ────────────────────────────────────────────────────────
  ticket_or_order_number?: string

  // ── Photos ────────────────────────────────────────────────────────────────
  photos?: IncidentPhoto[]

  // ── What the operator wants generated ─────────────────────────────────────
  desired_outputs: DesiredOutput[]

  // ── Optional bulk paste / voice-note transcript ──────────────────────────
  free_text_notes?: string

  // ── Locale ────────────────────────────────────────────────────────────────
  lang?: 'en' | 'es'
}

// ──────────────────────────────────────────────────────────────────────────────
// Output — the structured incident packet
// ──────────────────────────────────────────────────────────────────────────────

export type LiabilityPosition =
  | 'manufacturer'
  | 'cleaner'
  | 'customer'
  | 'pre_existing'
  | 'inconclusive'
  | 'shared'

export interface RankedCause {
  cause: string
  confidence: 'low' | 'medium' | 'high'
  evidence_for: string[]
  evidence_gaps: string[]
}

export interface RiskAssessment {
  treatment_risks: string[]
  do_not: string[]
  proceed_only_if: string[]
}

export interface MissingEvidenceQuestion {
  question: string
  why_it_matters: string
}

export interface DocumentationChecklist {
  preserve: string[]                       // garment, photos, ticket, etc.
  capture_now: string[]                    // additional photos, witness statements
  retain_until: string                     // e.g. "claim resolution + 90 days"
}

/**
 * The incident packet. Every field is generated, but the renderer only shows
 * the documents the operator's `desired_outputs` requested. The full packet
 * is always returned so the operator can pivot mid-flow.
 */
export interface IncidentPacket {
  // ── Internal-facing ──────────────────────────────────────────────────────
  operator_summary: string                 // 2-4 sentence internal analysis
  likely_causes: RankedCause[]
  risk_assessment: RiskAssessment
  liability_position: {
    position: LiabilityPosition
    rationale: string
    /** True when evidence is insufficient for a definitive position. */
    inconclusive_flag: boolean
  }
  recommended_next_steps: string[]
  missing_evidence_questions: MissingEvidenceQuestion[]

  // ── Customer-facing communications ────────────────────────────────────────
  customer_intake_script: string           // counter conversation
  customer_sms: string                     // <= 160 chars where reasonable
  customer_email: string                   // full email body

  // ── Internal documents ────────────────────────────────────────────────────
  ticket_note: string                      // 1-3 line ticket annotation
  written_decline_or_release_note: string  // formatted document
  incident_report: string                  // printable structured report

  // ── Process ──────────────────────────────────────────────────────────────
  documentation_checklist: DocumentationChecklist

  // ── Disclaimers ──────────────────────────────────────────────────────────
  disclaimers: string[]                    // must include "not legal advice", photo limitations
}

// ──────────────────────────────────────────────────────────────────────────────
// API envelope
// ──────────────────────────────────────────────────────────────────────────────

export interface IncidentRequest {
  intake: IncidentIntake
}

export interface IncidentResponse {
  ok: true
  packet: IncidentPacket
  /** Echo of the intake the AI relied on (operator transparency). */
  intake_echo: IncidentIntake
}

export interface IncidentErrorResponse {
  ok?: false
  error: string
  field?: string
}
