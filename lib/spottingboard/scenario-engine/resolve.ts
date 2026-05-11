// lib/spottingboard/scenario-engine/resolve.ts — TASK-188 v0
//
// Resolution boundary. This is where GONR intelligence enters: take a
// completed session and turn it into one of three outcomes:
//
//   1. protocol_match — safe known recommendation (via /api/solve)
//   2. plant_local_draft — useful plant-local knowledge, not broad guidance
//   3. escalation_required — unknown/high-risk/conflicting; supervisor/review
//
// Fail-closed rules:
//   - Any 'unknown' answer → escalation_required
//   - prior_treatment = 'heat' → escalation_required (potential set stain)
//   - prior_treatment = 'home-product' → plant_local_draft (unknown chemistry
//     interaction, but operator can describe it; not a hard escalation)
//   - /api/solve fails or returns no card → escalation_required
//   - /api/solve returns a card → protocol_match with normalised provenance

import { findAnswer } from './session'
import type {
  EscalationRequired,
  GuidedCaptureSession,
  PlantLocalDraft,
  RecommendedProtocolPreview,
  ScenarioResolution,
  TriageAnswer,
} from './types'

interface SolveApiCard {
  title?: string
  body?: string
  summary?: string
  safety_label?: string
  stainType?: string
  stainFamily?: string
  warnings?: unknown[]
  [key: string]: unknown
}

interface SolveApiResponse {
  card?: SolveApiCard | null
  source?: string
  tier?: number | string
  confidence?: number
  stainType?: string
  error?: string
}

export async function resolveTriage(
  session: GuidedCaptureSession,
): Promise<ScenarioResolution> {
  const stain = findAnswer(session, 'stain')
  const fabric = findAnswer(session, 'fabric')
  const priorTreatment = findAnswer(session, 'prior_treatment')

  if (!stain || !fabric || !priorTreatment) {
    return buildEscalation(
      session.answers,
      'Triage is incomplete. Cannot resolve without stain, fabric, and prior-treatment answers.',
      'unknown',
    )
  }

  if (stain.value === 'unknown' || fabric.value === 'unknown' || priorTreatment.value === 'unknown') {
    return buildEscalation(
      session.answers,
      'One or more answers are unknown. Failing closed — supervisor or professional judgment required before chemistry choice.',
      'unknown',
    )
  }

  if (priorTreatment.value === 'heat') {
    return buildEscalation(
      session.answers,
      'Heat or dryer pretreatment may have set the stain. Library protocols assume a fresh stain; route through supervisor review with the prior-treatment note.',
      'hard_block',
    )
  }

  if (priorTreatment.value === 'home-product') {
    return buildPlantLocalDraft(
      session.answers,
      stain,
      fabric,
      priorTreatment,
      'Unknown home product chemistry interacts unpredictably with library protocols. Capture as plant-local with the prior-treatment note; supervisor decides protocol.',
    )
  }

  // Safe path — query /api/solve with normalised payload.
  const surface = priorTreatment.value === 'none'
    ? fabric.label
    : `${fabric.label}, already treated: ${priorTreatment.label.toLowerCase()}`

  try {
    const res = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stain: stain.label, surface }),
    })
    if (!res.ok) throw new Error(`solve_failed_${res.status}`)
    const data = await res.json() as SolveApiResponse
    if (!data?.card) {
      return buildEscalation(
        session.answers,
        'No structured protocol matched this scenario. Capture as plant-local for supervisor review.',
        'caution',
      )
    }
    return buildProtocolMatch(stain, fabric, data, surface)
  } catch {
    return buildEscalation(
      session.answers,
      'Protocol lookup failed. Capture the scenario as plant-local so it is not lost.',
      'caution',
    )
  }
}

function buildProtocolMatch(
  stain: TriageAnswer,
  fabric: TriageAnswer,
  data: SolveApiResponse,
  surface: string,
): RecommendedProtocolPreview {
  const card = data.card!
  const title = (card.title || `${stain.label} on ${fabric.label.toLowerCase()}`) as string
  const summary = (card.summary || card.body || '') as string
  const safetyLabel = (card.safety_label || 'needs_source_review') as string
  const provenance: RecommendedProtocolPreview['provenance'] =
    data.source === 'core' || data.source === 'source_backed'
      ? 'source_backed'
      : data.source === 'plant'
        ? 'plant_confirmed'
        : 'mixed'
  const caveats: string[] = Array.isArray(card.warnings)
    ? (card.warnings.filter(w => typeof w === 'string') as string[])
    : []
  return {
    kind: 'protocol_match',
    title,
    summary,
    stain: stain.label,
    fabric: fabric.label,
    safetyLabel,
    provenance,
    caveats,
    nextAction: 'show_protocol',
    solveLinkParams: { stain: stain.label, surface },
  }
}

function buildPlantLocalDraft(
  answers: TriageAnswer[],
  stain: TriageAnswer,
  fabric: TriageAnswer,
  priorTreatment: TriageAnswer,
  reason: string,
): PlantLocalDraft {
  const title = `${stain.label} on ${fabric.label.toLowerCase()} (${priorTreatment.label.toLowerCase()})`
  const body = [
    `Stain: ${stain.label}.`,
    `Fabric: ${fabric.label}.`,
    `Already treated: ${priorTreatment.label}.`,
    `Routing reason: ${reason}`,
  ].join('\n')
  return {
    kind: 'plant_local_draft',
    title,
    body,
    safetyLabel: 'needs_source_review',
    provenance: 'plant_local_draft',
    needsSupervisorReview: true,
    capturedContext: answers,
  }
}

function buildEscalation(
  answers: TriageAnswer[],
  reason: string,
  safetyLabel: EscalationRequired['safetyLabel'],
): EscalationRequired {
  return {
    kind: 'escalation_required',
    reason,
    safetyLabel,
    capturedContext: answers,
    nextAction: safetyLabel === 'hard_block' ? 'professional_judgment_required' : 'supervisor_review',
  }
}
