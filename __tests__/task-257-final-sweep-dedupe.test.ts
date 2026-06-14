import { describe, it, expect } from 'vitest'
import {
  safetyFallbackQuestion,
  priorTreatmentKnown,
  extractParsedFacts,
  type IntakeRequest,
  type IntakeTurn,
} from '@/lib/intake/orchestrator'

// TASK-257 Slice 1 follow-up — dedupe the final safety sweep.
// Bug (Tyler 2026-06-13): after the user answered "Have you tried anything on it yet? → Nothing
// yet", the generic fallback still asked "One more thing — anything you've already tried, or
// anything delicate?" — re-asking a captured fact. Fix: when prior-treatment is already known,
// the fallback asks the delicate-only variant; when prior is still unknown the prior ask is
// unchanged. No fail-closed/solve guard is touched.

const FABRIC_Q = 'Quick one — what is the fabric?'
const AGE_Q = 'How long has the stain been there?'
const PRIOR_Q = 'Have you tried anything on it yet?'
const CARE_Q = 'What does the care label say?'

const TRIED_REASK = /\btried\b|already tried/i

function req(...turns: Array<[IntakeTurn['role'], string]>): IntakeRequest {
  return { transcript: turns.map(([role, text]) => ({ role, text })), proceed: false }
}

// Full structured sweep with the prior-treatment chip asked + answered.
function sweepWithPrior(): IntakeRequest {
  return req(
    ['user', 'grass'],
    ['assistant', FABRIC_Q],
    ['user', 'cotton'],
    ['assistant', AGE_Q],
    ['user', 'Since yesterday'],
    ['assistant', PRIOR_Q],
    ['user', 'Nothing yet'],
    ['assistant', CARE_Q],
    ['user', 'Machine wash'],
  )
}

describe('TASK-257 final-sweep dedupe — priorTreatmentKnown', () => {
  it('true when the prior-treatment chip was asked and answered', () => {
    expect(priorTreatmentKnown(sweepWithPrior())).toBe(true)
  })
  it('true when the user disclosed prior treatment in free text', () => {
    expect(priorTreatmentKnown(req(['user', 'grass on cotton, I already tried dish soap']))).toBe(true)
  })
  it('false when prior treatment was never asked or disclosed', () => {
    expect(priorTreatmentKnown(req(['user', 'grass'], ['assistant', FABRIC_Q], ['user', 'cotton']))).toBe(false)
  })
  it('false when the prior-treatment prompt exists but has no user answer yet', () => {
    expect(
      priorTreatmentKnown(
        req(
          ['user', 'grass'],
          ['assistant', FABRIC_Q],
          ['user', 'cotton'],
          ['assistant', AGE_Q],
          ['user', 'Since yesterday'],
          ['assistant', PRIOR_Q],
        ),
      ),
    ).toBe(false)
  })
})

describe('TASK-257 final-sweep dedupe — safetyFallbackQuestion', () => {
  it('prior KNOWN → final fallback is delicate-only and never re-asks "tried"', () => {
    const r = sweepWithPrior()
    const q = safetyFallbackQuestion(extractParsedFacts(r), r)
    // BEFORE (bug): "One more thing — anything you've already tried on it, or anything delicate…"
    // AFTER (fix):  "Last thing — anything delicate or valuable about the item?"
    expect(TRIED_REASK.test(q.text)).toBe(false)
    expect(q.text.toLowerCase()).toContain('delicate')
    // and none of the prior-treatment chip options leak back in
    expect(q.options).not.toContain('Nothing tried yet')
    expect(q.options).not.toContain('Already treated it')
  })

  it('prior UNKNOWN → the prior-treatment ask is unchanged (still asked, not skipped)', () => {
    const r = req(['user', 'grass'], ['assistant', FABRIC_Q], ['user', 'cotton'], ['assistant', AGE_Q], ['user', 'Since yesterday'])
    const q = safetyFallbackQuestion(extractParsedFacts(r), r)
    // Prior still open → fallback resolves to the prior-treatment question (existing behavior).
    expect(q.text).toBe(PRIOR_Q)
  })
})
