// lib/spottingboard/scenario-engine/session.ts — TASK-188 v0
//
// Pure state machine. No fetch, no DB. Future consumers (dashboard, homepage
// demo, supervisor review playback) call these functions identically.
//
// V0 step order: stain → fabric → prior_treatment → (resolve)

import { makeEvent } from './events'
import type {
  GuidedCaptureSession,
  ScenarioStep,
  ScenarioStepChip,
  TriageAnswer,
  TriageField,
} from './types'

const STAIN_CHIPS: ScenarioStepChip[] = [
  { value: 'red-wine', label: 'Red wine' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'oil', label: 'Oil / grease' },
  { value: 'ink', label: 'Ink' },
  { value: 'blood', label: 'Blood' },
  { value: 'unknown', label: 'Unknown', risk: 'high' },
]

const FABRIC_CHIPS: ScenarioStepChip[] = [
  { value: 'cotton', label: 'Cotton' },
  { value: 'silk', label: 'Silk' },
  { value: 'wool', label: 'Wool' },
  { value: 'polyester', label: 'Polyester' },
  { value: 'linen', label: 'Linen' },
  { value: 'unknown', label: 'Unknown', risk: 'high' },
]

const PRIOR_TREATMENT_CHIPS: ScenarioStepChip[] = [
  { value: 'none', label: 'No, fresh' },
  { value: 'water', label: 'Water at counter' },
  { value: 'heat', label: 'Heat / dryer', risk: 'high' },
  { value: 'home-product', label: 'Home product', risk: 'caution' },
  { value: 'unknown', label: 'Unknown', risk: 'high' },
]

const STEP_ORDER: TriageField[] = ['stain', 'fabric', 'prior_treatment']

function nowIso(): string {
  return new Date().toISOString()
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function startSession(input: { plantId: string; role: string }): GuidedCaptureSession {
  const now = nowIso()
  const session: GuidedCaptureSession = {
    id: genId(),
    plantId: input.plantId,
    role: input.role,
    answers: [],
    events: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
  const startEvent = makeEvent({
    session,
    type: 'observed_case',
    payload: { initiator: 'intake' },
  })
  return { ...session, events: [startEvent] }
}

export function nextStep(session: GuidedCaptureSession): ScenarioStep | null {
  const answered = new Set(session.answers.map(a => a.field))
  const pending = STEP_ORDER.find(field => !answered.has(field))
  if (!pending) return null
  return buildStep(pending)
}

export function answerStep(
  session: GuidedCaptureSession,
  answer: TriageAnswer,
): GuidedCaptureSession {
  if (session.status !== 'active') return session
  const answers = [...session.answers.filter(a => a.field !== answer.field), answer]
  const updatedAt = nowIso()
  const event = makeEvent({
    session: { ...session, answers, updatedAt },
    type: 'guided_triage_answer',
    payload: {
      field: answer.field,
      value: answer.value,
      label: answer.label,
      source: answer.source,
      confidence: answer.confidence,
    },
  })
  return {
    ...session,
    answers,
    events: [...session.events, event],
    updatedAt,
  }
}

function buildStep(field: TriageField): ScenarioStep {
  switch (field) {
    case 'stain':
      return {
        id: 'step_stain',
        field,
        prompt: 'What stain came in?',
        why: 'Stain class drives the chemistry path. We capture this first to scope the recommendation.',
        whatUpdates: 'Locks the stain dimension for the rest of the triage and any captured row.',
        chips: STAIN_CHIPS,
        allowText: true,
      }
    case 'fabric':
      return {
        id: 'step_fabric',
        field,
        prompt: 'On what fabric or material?',
        why: 'Fiber chemistry decides which protocols are safe. Wool, silk, and acetate fail closed on aggressive chemistry.',
        whatUpdates: 'Locks the fabric dimension; combined with stain, this is the surface key for protocol lookup.',
        chips: FABRIC_CHIPS,
        allowText: true,
      }
    case 'prior_treatment':
      return {
        id: 'step_prior_treatment',
        field,
        prompt: 'Already treated before it got to you?',
        why: 'Heat or unknown home products can set or alter the stain. We fail closed when prior treatment may have changed the chemistry.',
        whatUpdates: 'Decides whether to suggest a library protocol or route to plant-local / supervisor review.',
        chips: PRIOR_TREATMENT_CHIPS,
        allowText: true,
      }
    default:
      return {
        id: `step_${field}`,
        field,
        prompt: 'Anything else worth noting?',
        why: 'Open context capture for anything the chips did not cover.',
        whatUpdates: 'Appends context to the captured scenario.',
        chips: [],
        allowText: true,
      }
  }
}

/** Helper: look up a TriageAnswer by field. */
export function findAnswer(
  session: GuidedCaptureSession,
  field: TriageField,
): TriageAnswer | undefined {
  return session.answers.find(a => a.field === field)
}
