// TASK-218 FRONTIER — AGENTIC INTAKE ORCHESTRATOR decision-logic suite.
//
// These tests exercise the REAL orchestrator (buildContext → callModel → normalize
// → computeFailClosed → buildSolveBody) with a STUBBED model, so the agent layer's
// safety contract is proven deterministically — no live OpenAI key required.
//
// What they lock down (the frontier safety contract):
//   (a) AMBIGUOUS input  → the agent ASKS exactly ONE clarifying question, never a verdict.
//   (b) CONFIDENT input  → the agent SOLVEs: it hands a real engine body (stain+surface)
//                          to the DETERMINISTIC engine; it never writes the verdict itself.
//   (c) DELICATE/UNKNOWN → the server OVERRIDES the model's readyForVerdict and fails
//                          closed (specialty fiber, unknown, prior bleach, heat).
//   (d) ADVERSARIAL      → treatment/chemistry text smuggled into model fields is scrubbed;
//                          a treatment-shaped question is replaced with the safe fallback.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_QUESTIONS,
  runIntakeTurn,
  type IntakeModelOutput,
  type IntakeRequest,
} from '@/lib/intake/orchestrator'

// ── Model stub ───────────────────────────────────────────────────────────────
// The orchestrator calls the OpenAI Responses API via the global fetch. We replace
// fetch with a canned envelope so every model call returns a controlled read. Both
// the cheap and the escalated pass hit the same stub (we assert behavior, not which
// model id ran).

const realFetch = global.fetch

function emptyOutput(): IntakeModelOutput {
  return {
    read: { fabric: '', stain: '', careRisk: '', confidence: 'low' },
    knows: [],
    suspects: [],
    cannotKnow: [],
    nextQuestion: null,
    readyForVerdict: false,
    riskFlags: [],
  }
}

function stubModel(output: IntakeModelOutput): void {
  const envelope = JSON.stringify({
    status: 'completed',
    output_text: JSON.stringify(output),
  })
  global.fetch = (async () =>
    new Response(envelope, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch
}

function req(overrides: Partial<IntakeRequest> = {}): IntakeRequest {
  return { transcript: [], hints: undefined, proceed: false, ...overrides }
}

beforeEach(() => {
  global.fetch = realFetch
})
afterEach(() => {
  global.fetch = realFetch
})

const KEY = 'test-key-not-used-by-stub'

describe('intake orchestrator — ambiguous input asks ONE question', () => {
  it('returns action=ask with exactly one question and no engine body', async () => {
    stubModel({
      ...emptyOutput(),
      read: { fabric: '', stain: 'a red stain', careRisk: '', confidence: 'low' },
      cannotKnow: ['the fabric'],
      nextQuestion: { text: 'Quick one: what is the fabric?', options: ['Cotton', 'Silk', 'Not sure'] },
      readyForVerdict: false,
    })

    const decision = await runIntakeTurn(
      req({ transcript: [{ role: 'user', text: 'red stuff on my shirt' }] }),
      KEY,
    )

    expect(decision.action).toBe('ask')
    expect(decision.nextQuestion).not.toBeNull()
    expect(decision.nextQuestion?.text.length).toBeGreaterThan(0)
    // ASK turns never carry an engine body — the agent has not solved yet.
    expect(decision.solveBody).toBeUndefined()
    expect(decision.failClosedReasons).toContain('low_confidence')
    expect(decision.failClosedReasons).toContain('fabric_unknown')
  })
})

describe('intake orchestrator — confident input hands off to the deterministic engine', () => {
  it('returns action=solve with a real engine body it did NOT author the verdict for', async () => {
    stubModel({
      read: { fabric: 'cotton', stain: 'coffee', careRisk: 'machine washable', confidence: 'high' },
      knows: ['fabric: cotton', 'stain: coffee'],
      suspects: [],
      cannotKnow: [],
      nextQuestion: null,
      readyForVerdict: true,
      riskFlags: [],
    })

    const decision = await runIntakeTurn(
      req({
        hints: { userNote: 'coffee on my cotton shirt' },
        transcript: [{ role: 'user', text: 'coffee on my cotton shirt' }],
      }),
      KEY,
    )

    expect(decision.action).toBe('solve')
    expect(decision.failClosedReasons).toHaveLength(0)
    // The body that goes to /api/solve carries the assembled facts — the agent
    // prepares it, the engine renders the verdict.
    expect(decision.solveBody).toBeDefined()
    expect(decision.solveBody?.stain.toLowerCase()).toContain('coffee')
    expect(decision.solveBody?.surface?.toLowerCase()).toContain('cotton')
    expect(decision.assembledInput?.material).toBe('cotton')
  })

  it('does not show a redundant confirm card after the user answers the freshness question', async () => {
    stubModel({
      read: {
        fabric: 'likely indigo-dyed denim (cotton)',
        stain: 'grass stain',
        careRisk: 'moderate risk: possible dye transfer / unknown colorfastness',
        confidence: 'medium',
      },
      knows: ['fabric: denim', 'stain: grass'],
      suspects: ['indigo dye may bleed'],
      cannotKnow: [],
      nextQuestion: { text: 'I see denim and grass stain — is that right?', options: ['Yes, that is right', 'No, let me fix it'] },
      readyForVerdict: false,
      riskFlags: ['dye_bleed'],
    })

    const decision = await runIntakeTurn(
      req({
        hints: {
          stain: {
            stain: 'grass stain',
            surface: 'indigo-dyed denim',
            family: 'tannin',
            confidence: 'medium',
          },
        },
        transcript: [
          { role: 'assistant', text: 'Quick one: is the grass stain fresh (still wet) or already dried/set?' },
          { role: 'user', text: 'Fresh (wet)' },
        ],
      }),
      KEY,
    )

    expect(decision.action).toBe('solve')
    expect(decision.nextQuestion).toBeNull()
    expect(decision.parsedFacts.fabric).toBe('denim')
    expect(decision.failClosedReasons).toContain('dye_uncertain')
    expect(decision.assembledInput?.material).toBe('denim')
    expect(decision.assembledInput?.stainAge).toBe('fresh')
    expect(decision.solveBody?.stain.toLowerCase()).toContain('grass')
    expect(decision.solveBody?.surface?.toLowerCase()).toContain('denim')
  })
})

describe('intake orchestrator — fails closed on delicate / high-risk-unknown', () => {
  it('overrides model readyForVerdict=true for an unconfirmed specialty fiber', async () => {
    stubModel({
      read: { fabric: 'silk', stain: 'red wine', careRisk: '', confidence: 'high' },
      knows: ['fabric: silk', 'stain: red wine'],
      suspects: [],
      cannotKnow: [],
      nextQuestion: { text: 'Is this silk dry-clean-only?', options: ['Yes', 'No', 'Not sure'] },
      readyForVerdict: true,
      riskFlags: [],
    })

    const decision = await runIntakeTurn(req({ transcript: [] }), KEY)

    // Model said "ready"; the server must NOT trust it for an unconfirmed delicate fiber.
    expect(decision.action).toBe('ask')
    expect(decision.failClosedReasons).toContain('specialty_fiber_unconfirmed')
  })

  it('fails closed when prior aggressive chemistry is reported', async () => {
    stubModel({
      read: { fabric: 'cotton', stain: 'wine', careRisk: '', confidence: 'high' },
      knows: [],
      suspects: [],
      cannotKnow: [],
      nextQuestion: { text: 'When did this happen?', options: ['Today', 'Earlier'] },
      readyForVerdict: true,
      riskFlags: ['prior_bleach'],
    })

    const decision = await runIntakeTurn(req(), KEY)
    expect(decision.action).toBe('ask')
    expect(decision.failClosedReasons).toContain('prior_aggressive_chemistry')
  })

  it('keeps the prior-chemical signal in the engine body when forced to solve (Skip / budget spent)', async () => {
    // REGRESSION: assembleInput must forward the ACTUAL aggressive token so it
    // survives buildEngineSolveBody's AGGRESSIVE_PRIOR re-filter. Previously it
    // emitted a placeholder ('prior treatment reported') that matched none of the
    // aggressive tokens, so on the agentic Skip/budget-spent path the prior-bleach
    // signal evaporated and /api/solve could return a dangerous oxidizer step.
    stubModel({
      read: { fabric: 'cotton', stain: 'wine', careRisk: '', confidence: 'high' },
      knows: [],
      suspects: [],
      cannotKnow: [],
      nextQuestion: { text: 'When did this happen?', options: ['Today', 'Earlier'] },
      readyForVerdict: true,
      riskFlags: ['prior_bleach'],
    })

    // User disclosed prior bleach, then taps "Skip — just give me the safest move".
    const decision = await runIntakeTurn(req({ proceed: true }), KEY)

    expect(decision.action).toBe('solve')
    expect(decision.solveBody).toBeDefined()
    // The prior-chemical constraint reaches the deterministic engine in the text it
    // actually reads — its prior-chemistry gate stays armed.
    expect(decision.solveBody?.stain.toLowerCase()).toContain('prior bleach')
    expect(decision.assembledInput?.priorTreatment).toContain('bleach')
  })

  it('still hands off to the engine once the question budget is spent (engine is final authority)', async () => {
    stubModel({
      read: { fabric: '', stain: 'something', careRisk: '', confidence: 'low' },
      knows: [],
      suspects: [],
      cannotKnow: ['fabric'],
      nextQuestion: { text: 'What is the fabric?', options: ['Cotton', 'Not sure'] },
      readyForVerdict: false,
      riskFlags: [],
    })

    const spentTranscript = Array.from({ length: MAX_QUESTIONS }, (_, i) => ({
      role: 'assistant' as const,
      text: `question ${i + 1}`,
    }))
    const decision = await runIntakeTurn(req({ transcript: spentTranscript }), KEY)
    // Budget spent → don't interrogate forever; hand the (still fail-closed) facts to
    // the deterministic engine, which owns the final conservative verdict.
    expect(decision.action).toBe('solve')
    expect(decision.solveBody).toBeDefined()
  })
})

describe('intake orchestrator — adversarial: never relays treatment advice', () => {
  it('scrubs treatment language out of the read and replaces a treatment-shaped question', async () => {
    stubModel({
      read: {
        fabric: 'cotton',
        stain: 'soak it in bleach for 10 minutes',
        careRisk: 'pour acetone on the stain',
        confidence: 'high',
      },
      knows: ['apply undiluted bleach'],
      suspects: [],
      cannotKnow: [],
      nextQuestion: { text: 'Want me to tell you to scrub with bleach?', options: ['Yes pour bleach'] },
      readyForVerdict: true,
      riskFlags: [],
    })

    const decision = await runIntakeTurn(req({ transcript: [] }), KEY)

    // Treatment-shaped prose is dropped, not echoed back as GONR's read.
    expect(decision.read.stain).toBe('')
    expect(decision.read.careRisk).toBe('')
    expect(decision.knows).not.toContain('apply undiluted bleach')
    // A treatment-shaped question is replaced wholesale with the safe clarifier.
    if (decision.action === 'ask' && decision.nextQuestion) {
      const blob = `${decision.nextQuestion.text} ${decision.nextQuestion.options.join(' ')}`.toLowerCase()
      expect(blob).not.toContain('bleach')
      expect(blob).not.toContain('scrub')
    }
    // Sanitized output is never trusted as verdict-ready on its own.
    expect(decision.riskFlags).toContain('sanitized_model_output')
  })
})
