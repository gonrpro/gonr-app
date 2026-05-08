// lib/spottingboard/predictive-intake/types.ts — TASK-165 v0
//
// Types for the predictive-intake shortcut engine. Mirrors SB's
// predictive-intake-gate-spec.json + the Tyler/Atlas-locked acceptance bars:
//
//   1. Shortcuts never bypass safety_blockers.
//   2. Fast path = fewer questions, never inferred permission.
//   3. Fingerprint fields provenance-labeled (observed | declared | inferred | default).
//   4. TASK-160 fail-closed classifier behavior preserved.
//   5. Mined patterns labeled by source.

// ──────────────────────────────────────────────────────────────────────────────
// Inference labels (provenance for any prediction or default)
// ──────────────────────────────────────────────────────────────────────────────

export type InferenceLabel =
  | 'source_backed_default'        // SB protocol/source library default
  | 'plant_local_preference'        // explicitly answered by plant operator
  | 'predicted_plant_pattern'       // inferred from repeated answers; visibly marked
  | 'needs_supervisor_confirmation' // safe to propose, not safe to execute alone
  | 'unsafe_cannot_infer'           // must always be asked

// ──────────────────────────────────────────────────────────────────────────────
// Output contract — the 4 outcomes the shortcut engine returns
// ──────────────────────────────────────────────────────────────────────────────

export type ShortcutOutcome =
  | 'allow_fast_path'
  | 'force_full_intake'
  | 'needs_supervisor_confirmation'
  | 'unsafe_cannot_infer'

// ──────────────────────────────────────────────────────────────────────────────
// Fingerprint provenance (acceptance bar #3)
// ──────────────────────────────────────────────────────────────────────────────

export type FingerprintProvenance =
  | 'observed'   // observed via repeated runtime use
  | 'declared'   // declared explicitly by operator/plant
  | 'inferred'   // inferred from related answers (must carry confidence)
  | 'default'    // SB source-backed default

export interface FingerprintField<T = unknown> {
  value: T
  provenance: FingerprintProvenance
  /** 0..1; only meaningful for 'inferred' provenance. */
  confidence?: number
  /** Labels that count toward provenance audit. */
  source_labels?: string[]
  /** ISO 8601 — when this fingerprint dimension was last updated. */
  updated_at: string
}

export interface OperatorFingerprint {
  operator_id: string
  plant_id: string
  // Each known dimension is a FingerprintField. Open-vocab so SB can extend.
  dimensions: Record<string, FingerprintField>
}

export interface PlantFingerprint {
  plant_id: string
  dimensions: Record<string, FingerprintField>
}

// ──────────────────────────────────────────────────────────────────────────────
// Mined patterns (acceptance bar #5) — pattern source must be labeled
// ──────────────────────────────────────────────────────────────────────────────

export type PatternSource =
  | 'stain_brain_bank'
  | 'eval_fixture'
  | 'intake_path'
  | 'operator_feedback'

export interface MinedPattern {
  pattern_id: string
  source: PatternSource
  /** Decision-family this pattern feeds. */
  family_id: string
  /** What the pattern predicts (e.g. "plant prefers POG-first on cosmetic oil"). */
  prediction: string
  /** Sample size / frequency observation backing this pattern. */
  evidence: {
    occurrences: number
    distinct_operators?: number
    distinct_plants?: number
  }
  /** Default inference label this pattern carries when applied. */
  inference_label: InferenceLabel
}

// ──────────────────────────────────────────────────────────────────────────────
// Gate spec — mirrors SB's predictive-intake-gate-spec.json
// ──────────────────────────────────────────────────────────────────────────────

export interface HardBlockRule {
  /** All flags in `combo` must match for the rule to fire. */
  combo: string[]
  action: ShortcutOutcome
  reason: string
}

export interface DecisionFamily {
  family_id: string
  display_name: string
  /** Flags that must all be confirmed-true for fast-path eligibility. */
  shortcut_allowed_when_all_known: string[]
  /** Hard-block rules; fire on combo match. Override fast-path. */
  hard_blocks: HardBlockRule[]
  /** Question topic IDs that must be answered before any shortcut. */
  required_disambiguation: string[]
}

export interface GlobalRule {
  id: string
  rule: string
  /** Flags that fire this rule when any are true OR unknown (per SB unknown_semantics). */
  if_any_flag_true_or_unknown?: string[]
  /** Inferences this rule blocks (for GLOBAL-002-style negative rules). */
  blocked_inferences?: string[]
  action?: ShortcutOutcome
  label?: InferenceLabel
}

export interface LabEncodingNotes {
  deny_precedence: string
  unknown_semantics: string
  output_contract: string
  audit_fields_required: string[]
}

export interface GateSpec {
  schema_version: string | number
  task: string
  owner: string
  status: string
  generated_at: string
  principle: string
  inference_labels: InferenceLabel[]
  global_rules: GlobalRule[]
  decision_families: DecisionFamily[]
  lab_encoding_notes: LabEncodingNotes
}

// ──────────────────────────────────────────────────────────────────────────────
// Engine I/O
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Caller-provided runtime flags. Boolean = confirmed; null/undefined = unknown.
 * Per SB unknown_semantics: for high-risk flags, unknown is treated as true.
 */
export type FlagState = Record<string, boolean | null | undefined>

export interface ShortcutInput {
  family_id: string
  flags: FlagState
  operator_fingerprint?: OperatorFingerprint
  plant_fingerprint?: PlantFingerprint
}

export interface AuditPacket {
  matched_family_id: string
  matched_rule_ids: string[]
  blocked_flags: string[]
  source_label: InferenceLabel
  operator_or_plant_fingerprint_used: boolean
  confirmation_required: boolean
  explanation_for_ui: string
}

export interface ShortcutDecision {
  outcome: ShortcutOutcome
  audit: AuditPacket
}
