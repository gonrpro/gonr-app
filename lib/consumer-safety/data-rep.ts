// TASK-218 — DATA-REP LOGGING (the data moat).
//
// Every consumer solve quietly records a 7-point "rep" so the downstream loops
// (outcome feedback, training, dashboards) have a single source of truth. No
// account is required — anonymous solves still log (the server pulls email from
// the session cookie when present, null otherwise). Fire-and-forget: a failed
// rep write must NEVER affect the user-facing flow.
//
// The 7 points (BUILD-SPEC §LOCKED + PREVIEW GATE):
//   1. what happened              -> what_happened (the stain description)
//   2. garment / fabric / care    -> fabric + care_label + stain_type
//   3. prior treatment            -> prior_treatment[]
//   4. risk conditions            -> risk_conditions (rule-engine snapshot)
//   5. answer shown               -> answer{ answer_shown, source, risk_level, ... }
//   6. whether followed           -> followed (true/false/null)
//   7. outcome                    -> outcome ("worked" | "not_yet" | null)
//
// Reuses the EXISTING append-only events table via POST /api/events/record
// (event type `solve.data_rep`) — no new table is invented.

import { classify } from './classifier'
import {
  CARE_OPTIONS,
  MATERIAL_OPTIONS,
  STAIN_OPTIONS,
  labelFor,
  type SolveInput,
} from './solve-input'

/** Event type the rep is logged under (whitelisted in app/api/events/record). */
export const DATA_REP_EVENT = 'solve.data_rep'

/** Rule-engine risk snapshot taken at the moment of the solve (point 4). */
export interface DataRepRisk {
  level: string
  confidence: string
  requires_referral: boolean
  flags: string[]
}

/** The collected situation facts (points 1-4). */
export interface DataRepFacts {
  what_happened: string
  fabric: string
  care_label: string
  stain_type: string | null
  prior_treatment: string[]
  risk_conditions: DataRepRisk
}

/** What the engine actually showed the user (point 5). */
export interface DataRepAnswer {
  answer_shown: string
  source: string | null
  risk_level: string | null
  do_not_do_count: number
}

/** The full rep: facts + (optional) answer + (optional) outcome. */
export interface SolveDataRep extends DataRepFacts {
  correlation_id: string
  answer?: DataRepAnswer
  /** Point 6 — did the user follow the answer? null until they tell us. */
  followed?: boolean | null
  /** Point 7 — lightweight post-answer outcome. */
  outcome?: string | null
}

/** Stable id tying the answer-shown rep to its later outcome rep. */
export function newRepId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `rep_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/** Human-readable risk flags derived from the situation (never authored advice). */
function riskFlags(input: SolveInput): string[] {
  const flags: string[] = []
  if (input.material === 'unknown') flags.push('fabric_unknown')
  if (
    input.material === 'silk' ||
    input.material === 'wool' ||
    input.material === 'leather' ||
    input.material === 'suede' ||
    input.material === 'rayon_viscose' ||
    input.material === 'acetate'
  ) {
    flags.push('delicate_or_specialty_fiber')
  }
  if (input.careStatus === 'dry_clean_only') flags.push('dry_clean_only')
  if (input.colorfastness === 'prone_to_bleed') flags.push('dye_may_bleed')
  if (input.colorfastness === 'unknown') flags.push('colorfastness_unknown')
  if (input.heatExposure !== 'none' && input.heatExposure !== 'unknown') flags.push('prior_heat')
  if (input.priorTreatment.length > 0) flags.push('prior_home_treatment')
  if (input.stainType === undefined || input.stainType === 'unknown') flags.push('stain_unknown')
  if (input.itemValue === 'valuable' || input.itemValue === 'sentimental') flags.push('high_value_item')
  return flags
}

/** Build the situation facts (points 1-4) straight from the assembled SolveInput. */
export function buildRepFacts(input: SolveInput): DataRepFacts {
  const verdict = classify(input)
  return {
    what_happened: input.stainDescription.trim(),
    fabric: input.material === 'unknown' ? 'unknown' : labelFor(MATERIAL_OPTIONS, input.material),
    care_label: input.careStatus === 'unknown' ? 'unknown' : labelFor(CARE_OPTIONS, input.careStatus),
    stain_type: input.stainType ? labelFor(STAIN_OPTIONS, input.stainType) : null,
    prior_treatment: input.priorTreatment,
    risk_conditions: {
      level: verdict.verdict,
      confidence: verdict.confidence,
      requires_referral: verdict.requiresReferral,
      flags: riskFlags(input),
    },
  }
}

/**
 * Append a single rep to the events log. Fire-and-forget by contract — callers
 * must not await this on a path that affects what the user sees.
 */
export async function logDataRep(rep: SolveDataRep): Promise<void> {
  try {
    await fetch('/api/events/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({
        type: DATA_REP_EVENT,
        payload: { ...rep, correlationId: rep.correlation_id },
      }),
    })
  } catch {
    // Telemetry must never become a UI error path.
  }
}
