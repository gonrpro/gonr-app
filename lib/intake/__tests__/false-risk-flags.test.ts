import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runIntakeTurn, type IntakeModelOutput, type IntakeRequest } from '@/lib/intake/orchestrator'
import { lookupProtocol } from '@/lib/protocols/lookup'

// TASK-218 — false risk-flag injection. On a FRESH stain the model over-flags: its
// careRisk says the care label "could restrict water/heat" and it emits heat_exposure /
// unknown_dye tokens, but NOTHING was applied. The orchestrator must read that as
// AWARENESS, not as heat-already-applied — otherwise "warm/hot water already applied" is
// folded into the stain, the curated coffee/cotton card is missed, and a fresh stain
// drops to tier-4 AI (Atlas live finding, 2026-06-08).

const realFetch = global.fetch
function stubModel(output: IntakeModelOutput): void {
  const envelope = JSON.stringify({ status: 'completed', output_text: JSON.stringify(output) })
  global.fetch = (async () =>
    new Response(envelope, { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch
}
beforeEach(() => {
  global.fetch = realFetch
})
afterEach(() => {
  global.fetch = realFetch
})

describe('intake — false heat/dye awareness flags do not corrupt a fresh stain', () => {
  it('keeps a fresh coffee/cotton stain clean and hits the core card despite over-flagging', async () => {
    stubModel({
      read: {
        fabric: 'cotton',
        stain: 'coffee',
        careRisk: 'Looks straightforward, but the care label could still restrict water/heat.',
        confidence: 'high',
      },
      knows: ['fabric: cotton', 'stain: coffee'],
      suspects: [],
      cannotKnow: [],
      nextQuestion: null,
      readyForVerdict: true,
      riskFlags: ['heat_exposure', 'unknown_dye'], // AWARENESS, not disclosure
    })

    const request: IntakeRequest = {
      transcript: [{ role: 'user', text: 'coffee on my cotton shirt' }],
      hints: { userNote: 'coffee on my cotton shirt' },
      proceed: true,
    }
    const decision = await runIntakeTurn(request, 'stub-key')

    expect(decision.action).toBe('solve')
    // Stain term stays canonical — no phantom "warm/hot water already applied".
    expect(decision.solveBody?.stain.toLowerCase()).toBe('coffee')
    expect(decision.failClosedReasons).not.toContain('heat_exposure')
    // And it now actually resolves to the curated core card, not tier-4 AI.
    const r = await lookupProtocol(decision.solveBody!.stain, decision.solveBody?.surface ?? '')
    expect(r.source).toBe('core')
  })

  it('STILL treats heat the USER actually applied (prior hot water) as a real fact', async () => {
    stubModel({
      read: { fabric: 'cotton', stain: 'coffee', careRisk: '', confidence: 'high' },
      knows: ['fabric: cotton', 'stain: coffee'],
      suspects: [],
      cannotKnow: [],
      nextQuestion: null,
      readyForVerdict: true,
      riskFlags: [],
    })

    const request: IntakeRequest = {
      transcript: [{ role: 'user', text: 'coffee on cotton — I already rinsed it with hot water' }],
      hints: { userNote: 'coffee on cotton — I already rinsed it with hot water' },
      proceed: true,
    }
    const decision = await runIntakeTurn(request, 'stub-key')

    // Real user-disclosed heat must still reach the engine + trip the fail-closed reason.
    expect(decision.solveBody?.stain.toLowerCase()).toContain('water')
    expect(decision.failClosedReasons).toContain('heat_exposure')
  })
})
