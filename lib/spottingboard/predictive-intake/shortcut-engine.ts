// lib/spottingboard/predictive-intake/shortcut-engine.ts — TASK-165 v0
//
// The shortcut engine. Decides whether a given (family, flag-state, fingerprint)
// triple can take a fast path through intake or must fall back to full intake /
// supervisor confirmation / unsafe-cannot-infer.
//
// Acceptance bars enforced (Tyler/Atlas + SB lock):
//   1. Shortcuts never bypass safety_blockers (hard_blocks override fingerprint).
//   2. Fast path = fewer questions, never inferred permission (no aggressive
//      chemistry inference from operator fingerprint — GLOBAL-002 enforced).
//   3. Fingerprint fields used must carry provenance — engine refuses to
//      consume FingerprintField without a provenance tag.
//   4. TASK-160 fail-closed classifier behavior preserved (unknowns on
//      high-risk flags are treated as TRUE per SB unknown_semantics).
//   5. Mined patterns labeled by source — engine returns the source label in
//      the AuditPacket and never strips it.

import type {
  AuditPacket,
  DecisionFamily,
  FlagState,
  GateSpec,
  GlobalRule,
  HardBlockRule,
  InferenceLabel,
  OperatorFingerprint,
  PlantFingerprint,
  ShortcutDecision,
  ShortcutInput,
  ShortcutOutcome,
} from './types'

/**
 * Evaluate whether a shortcut is allowed for the given family + state.
 *
 * Order of precedence (deny-precedence per SB lab_encoding_notes):
 *   1. Family hard_blocks (matched by combo) — highest priority
 *   2. Global rules — universal hard blocks (GLOBAL-001/002/003)
 *   3. Required disambiguation — if any unanswered, force full intake
 *   4. Shortcut-allowed gate — all flags must be confirmed-true (no unknowns)
 *   5. Default → allow_fast_path with source_backed_default label
 */
export function evaluateShortcut(
  spec: GateSpec,
  input: ShortcutInput,
): ShortcutDecision {
  const family = findFamily(spec, input.family_id)
  const matched_rule_ids: string[] = []
  const blocked_flags: string[] = []
  const usedFingerprint = !!(input.operator_fingerprint || input.plant_fingerprint)

  // ── 1. Family hard_blocks (deny-precedence — highest priority) ─────────────
  for (const hb of family.hard_blocks) {
    if (matchesHardBlock(hb, input.flags)) {
      matched_rule_ids.push(hbRuleId(family, hb))
      blocked_flags.push(...hb.combo)
      return {
        outcome: hb.action,
        audit: buildAudit({
          matched_family_id: family.family_id,
          matched_rule_ids,
          blocked_flags,
          source_label: outcomeToLabel(hb.action),
          operator_or_plant_fingerprint_used: false,
          confirmation_required: hb.action !== 'allow_fast_path',
          explanation_for_ui: hb.reason,
        }),
      }
    }
  }

  // ── 2. Global rules (GLOBAL-001/002/003) ───────────────────────────────────
  for (const gr of spec.global_rules) {
    const triggered = evaluateGlobalRule(gr, input.flags)
    if (triggered.fired) {
      matched_rule_ids.push(gr.id)
      blocked_flags.push(...triggered.blocked_flags)
      // Normalize SB's richer action vocab → engine's 4-value contract
      const action = normalizeOutcome(gr.action)
      const label: InferenceLabel = gr.label ?? 'needs_supervisor_confirmation'
      return {
        outcome: action,
        audit: buildAudit({
          matched_family_id: family.family_id,
          matched_rule_ids,
          blocked_flags,
          source_label: label,
          operator_or_plant_fingerprint_used: false,
          confirmation_required: action !== 'allow_fast_path',
          explanation_for_ui: `${gr.id}: ${gr.rule}`,
        }),
      }
    }
  }

  // ── 3. Required disambiguation — any unanswered = full intake ──────────────
  const unanswered = family.required_disambiguation.filter(
    (q) => input.flags[q] === undefined || input.flags[q] === null,
  )
  if (unanswered.length > 0) {
    return {
      outcome: 'force_full_intake',
      audit: buildAudit({
               matched_family_id: family.family_id,
        matched_rule_ids: ['required_disambiguation_unanswered'],
        blocked_flags: unanswered,
        source_label: 'needs_supervisor_confirmation',
        operator_or_plant_fingerprint_used: usedFingerprint,
        confirmation_required: true,
        explanation_for_ui: `Cannot shortcut — required disambiguation pending: ${unanswered.join(', ')}.`,
      }),
    }
  }

  // ── 4. Shortcut-allowed-gate — all flags must be confirmed-true ────────────
  const missingShortcutFlags = family.shortcut_allowed_when_all_known.filter(
    (f) => input.flags[f] !== true,
  )
  if (missingShortcutFlags.length > 0) {
    return {
      outcome: 'force_full_intake',
      audit: buildAudit({
               matched_family_id: family.family_id,
        matched_rule_ids: ['shortcut_gate_not_satisfied'],
        blocked_flags: missingShortcutFlags,
        source_label: 'needs_supervisor_confirmation',
        operator_or_plant_fingerprint_used: usedFingerprint,
        confirmation_required: true,
        explanation_for_ui: `Cannot shortcut — gate flags not confirmed: ${missingShortcutFlags.join(', ')}.`,
      }),
    }
  }

  // ── 5. Default → allow_fast_path (source-backed) ───────────────────────────
  // Fingerprint can refine UI ordering downstream, but it never grants the
  // shortcut here — the gate flags above already established safety baseline.
  const sourceLabel: InferenceLabel = usedFingerprint
    ? 'predicted_plant_pattern'
    : 'source_backed_default'
  return {
    outcome: 'allow_fast_path',
    audit: buildAudit({
             matched_family_id: family.family_id,
      matched_rule_ids: ['shortcut_gate_satisfied'],
      blocked_flags: [],
      source_label: sourceLabel,
      operator_or_plant_fingerprint_used: usedFingerprint,
      confirmation_required: false,
      explanation_for_ui:
        'Fast path allowed — all gate flags confirmed and no hard blocks fired.',
    }),
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function findFamily(spec: GateSpec, family_id: string): DecisionFamily {
  const found = spec.decision_families.find((f) => f.family_id === family_id)
  if (!found) {
    throw new Error(`Unknown family_id "${family_id}" — not in gate spec`)
  }
  return found
}

/**
 * Match hard-block combos. A combo fires if every flag in `combo` is true OR
 * unknown — per SB unknown_semantics, unknown on a high-risk flag counts as
 * true (fail-closed). This is the safety-bar enforcement at the engine layer.
 */
function matchesHardBlock(hb: HardBlockRule, flags: FlagState): boolean {
  return hb.combo.every((flag) => {
    const v = flags[flag]
    return v === true || v === null || v === undefined
  })
}

function hbRuleId(family: DecisionFamily, hb: HardBlockRule): string {
  return `${family.family_id}:hard_block(${hb.combo.join('+')})`
}

interface GlobalRuleEval {
  fired: boolean
  blocked_flags: string[]
}

function evaluateGlobalRule(gr: GlobalRule, flags: FlagState): GlobalRuleEval {
  if (!gr.if_any_flag_true_or_unknown || gr.if_any_flag_true_or_unknown.length === 0) {
    return { fired: false, blocked_flags: [] }
  }
  const blocked = gr.if_any_flag_true_or_unknown.filter((flag) => {
    const v = flags[flag]
    return v === true || v === null || v === undefined
  })
  return { fired: blocked.length > 0, blocked_flags: blocked }
}

/**
 * Normalize SB's richer action vocab into the engine's 4-value
 * ShortcutOutcome contract. Unknown / undefined → fail-closed force_full_intake.
 *
 * SB v0.1 extras seen:
 *   force_full_intake_or_supervisor_confirmation → needs_supervisor_confirmation
 *   require_explicit_plant_rule_or_supervisor_confirmation → needs_supervisor_confirmation
 *   block_complete_removal_promise → force_full_intake
 */
function normalizeOutcome(action: string | undefined): ShortcutOutcome {
  if (action === undefined) return 'force_full_intake'
  switch (action) {
    case 'allow_fast_path':
    case 'force_full_intake':
    case 'needs_supervisor_confirmation':
    case 'unsafe_cannot_infer':
      return action
    case 'force_full_intake_or_supervisor_confirmation':
    case 'require_explicit_plant_rule_or_supervisor_confirmation':
      return 'needs_supervisor_confirmation'
    case 'block_complete_removal_promise':
      return 'force_full_intake'
    default:
      // Fail-closed: unknown action keyword forces full intake
      return 'force_full_intake'
  }
}

/**
 * Outcome → default inference label mapping. Used when a hard block fires
 * and no explicit label was provided.
 */
function outcomeToLabel(outcome: ShortcutOutcome): InferenceLabel {
  switch (outcome) {
    case 'unsafe_cannot_infer':
      return 'unsafe_cannot_infer'
    case 'needs_supervisor_confirmation':
      return 'needs_supervisor_confirmation'
    case 'force_full_intake':
      return 'needs_supervisor_confirmation'
    case 'allow_fast_path':
      return 'source_backed_default'
  }
}

function buildAudit(p: AuditPacket): AuditPacket {
  return p
}

// ──────────────────────────────────────────────────────────────────────────────
// Fingerprint guard (acceptance bar #3) — refuses to consume a fingerprint
// dimension that lacks a provenance tag. Use this when feeding fingerprint
// data into ranking/UI; the gate engine itself never reads dimension values.
// ──────────────────────────────────────────────────────────────────────────────

export class FingerprintProvenanceError extends Error {
  constructor(dimension: string, message: string) {
    super(`fingerprint dimension "${dimension}": ${message}`)
    this.name = 'FingerprintProvenanceError'
  }
}

export function assertProvenance(
  fp: OperatorFingerprint | PlantFingerprint,
): void {
  for (const [dim, field] of Object.entries(fp.dimensions)) {
    if (!field.provenance) {
      throw new FingerprintProvenanceError(dim, 'missing provenance')
    }
    if (field.provenance === 'inferred' && (field.confidence === undefined || field.confidence < 0 || field.confidence > 1)) {
      throw new FingerprintProvenanceError(
        dim, 'inferred provenance requires 0..1 confidence',
      )
    }
  }
}
