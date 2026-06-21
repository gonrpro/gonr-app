import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runIntakeTurn, type IntakeRequest, type IntakeTurn } from '@/lib/intake/orchestrator'

// TASK-257 Slice 1 — deterministic post-initial chips + colorfastness decouple.
//
// (1) Post-initial slot chips (age / prior / care) resolve with NO model call once we are
//     already in the guided flow (asked >= 1) — extending the TASK-254 fabric fast-path to
//     turns 2+. A single-turn full-info input (asked === 0) still reaches the model so it can
//     solve immediately via readyForVerdict (the TASK-254 over-ask guard).
// (2) Colorfastness is derived from the GARMENT (user words), never from the model's stain
//     riskFlags — so a dye/tannin stain on a white/unspecified garment is no longer falsely
//     marked prone_to_bleed; an explicit garment signal ("dark") still sets it.
//
// "No model call" is proved by stubbing global fetch (callModel's only network path).

const TREATMENT =
  /\b(apply|rinse|blot|dab|soak|scrub|flush|pour|launder|wash it|bleach it|hydrogen peroxide|vinegar|dish ?soap|club soda|cold water|warm water|stain remover)\b/i

const FABRIC_Q = 'Quick one — what is the fabric?'
const AGE_Q = 'How long has the stain been there?'

function turns(...t: Array<[IntakeTurn['role'], string]>): IntakeRequest {
  return { transcript: t.map(([role, text]) => ({ role, text })), proceed: false }
}

function plannerQuestionResponse(): Response {
  return new Response(
    JSON.stringify({
      status: 'completed',
      output_text: JSON.stringify({
        read: { fabric: '', stain: '', careRisk: '', confidence: 'medium' },
        knows: [],
        suspects: [],
        cannotKnow: ['the stain is not resolved'],
        nextQuestion: { text: 'Quick one — what caused the stain?', options: ['Not sure'] },
        readyForVerdict: false,
        riskFlags: [],
      }),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

// A solve-ready model output, with caller-supplied riskFlags, so we can inspect the
// assembled SolveInput (colorfastness). proceed:true forces the solve branch regardless of
// fail-closed nuance, isolating the colorfastness derivation under test.
function solveReadyResponse(riskFlags: string[]): Response {
  return new Response(
    JSON.stringify({
      status: 'completed',
      output_text: JSON.stringify({
        read: { fabric: 'cotton', stain: 'red wine', careRisk: 'standard wash care', confidence: 'high' },
        knows: ['stain = red wine', 'fabric = cotton'],
        suspects: [],
        cannotKnow: [],
        nextQuestion: null,
        readyForVerdict: true,
        riskFlags,
      }),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

describe('TASK-257 Slice 1 — deterministic post-initial chips', () => {
  let fetchSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    fetchSpy = vi.fn(() => Promise.reject(new Error('MODEL_CALLED')))
    vi.stubGlobal('fetch', fetchSpy)
  })
  afterEach(() => vi.unstubAllGlobals())

  // TASK-257 Slice 1.7 A1: blood = protein (age HELD per SB), so even after fabric is answered the
  // AGE chip is still required — A1 defers age-sensitive families to the deterministic chip flow.
  // (For an age-skippable family like coffee, A1 now early-SOLVES here instead — see turn-3 + the
  // dedicated A1 suite. Using blood keeps coverage of the deterministic AGE-chip fast-path itself.)
  it('turn 2 (fabric just answered) fast-paths the AGE chip with NO model call, <250ms', async () => {
    const req = turns(['user', 'blood'], ['assistant', FABRIC_Q], ['user', 'cotton'])
    const t0 = performance.now()
    const d = await runIntakeTurn(req, 'test-key')
    const ms = performance.now() - t0
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(d.model).toBe('deterministic')
    expect(d.action).toBe('ask')
    expect(d.nextQuestion?.text).toBe(AGE_Q)
    expect(ms).toBeLessThan(250)
  })

  // TASK-257 Slice 1.7 A1: coffee = tannin on cotton (verified card, no hazard, age resolved) now
  // early-SOLVES deterministically once stain+fabric are known — the prior/care chips are skipped
  // (the deterministic hazard guard + /api/solve engine carry safety). Pre-A1 this fast-pathed the
  // PRIOR chip; A1 supersedes the remaining chip walk for carded, age-cleared, no-hazard cases.
  it('turn 3 (fabric + age answered) early-SOLVES a carded tannin with NO model call (A1)', async () => {
    const req = turns(
      ['user', 'coffee'],
      ['assistant', FABRIC_Q],
      ['user', 'cotton'],
      ['assistant', AGE_Q],
      ['user', 'a few hours'],
    )
    const d = await runIntakeTurn(req, 'test-key')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(d.model).toBe('deterministic')
    expect(d.action).toBe('solve')
    expect(d.solveBody).toBeTruthy()
  })

  it('deterministic post-initial chips carry zero treatment prose', async () => {
    const req = turns(['user', 'coffee'], ['assistant', FABRIC_Q], ['user', 'cotton'])
    const d = await runIntakeTurn(req, 'test-key')
    const blob = [d.nextQuestion?.text ?? '', ...(d.nextQuestion?.options ?? [])].join(' ')
    expect(TREATMENT.test(blob)).toBe(false)
  })

  // The TASK-254 over-ask guard: a single-turn full-info input (asked === 0) with fabric
  // already known must NOT be forced into a deterministic age question — it falls through to
  // the model, which can solve immediately via readyForVerdict.
  it('single-turn full-info input (asked === 0) does NOT fast-path age — defers to the model', async () => {
    fetchSpy.mockResolvedValue(plannerQuestionResponse())
    const d = await runIntakeTurn({ transcript: [{ role: 'user', text: 'coffee on my cotton shirt' }], proceed: false }, 'test-key')
    expect(fetchSpy).toHaveBeenCalled()
    expect(d.model).not.toBe('deterministic')
  })
})

describe('TASK-257 Slice 1 — colorfastness decouple', () => {
  let fetchSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('a dye stain (model riskFlags say "dye"/"color") on an UNSPECIFIED garment is NOT marked prone_to_bleed', async () => {
    fetchSpy.mockResolvedValue(solveReadyResponse(['dye_based_stain', 'color_loss_possible']))
    const req: IntakeRequest = { transcript: [{ role: 'user', text: 'red wine on a white cotton shirt' }], proceed: true }
    const d = await runIntakeTurn(req, 'test-key')
    expect(d.action).toBe('solve')
    // Pre-fix this would be 'prone_to_bleed' (DYE.test of the stain riskFlags); decoupled → unknown.
    expect(d.assembledInput?.colorfastness).toBe('unknown')
  })

  it('stain color descriptors ("dark coffee", "bright red lipstick") do NOT set garment prone_to_bleed', async () => {
    fetchSpy.mockImplementation(() => Promise.resolve(solveReadyResponse(['dye_based_stain', 'color_loss_possible'])))
    const darkStain = await runIntakeTurn(
      { transcript: [{ role: 'user', text: 'dark coffee stain on a white cotton shirt' }], proceed: true },
      'test-key',
    )
    const brightStain = await runIntakeTurn(
      { transcript: [{ role: 'user', text: 'bright red lipstick on cotton' }], proceed: true },
      'test-key',
    )
    expect(darkStain.assembledInput?.colorfastness).toBe('unknown')
    expect(brightStain.assembledInput?.colorfastness).toBe('unknown')
  })

  it('an explicit GARMENT colour signal from the user DOES set prone_to_bleed', async () => {
    fetchSpy.mockResolvedValue(solveReadyResponse([]))
    const req: IntakeRequest = { transcript: [{ role: 'user', text: 'red wine on my dark red dress' }], proceed: true }
    const d = await runIntakeTurn(req, 'test-key')
    expect(d.assembledInput?.colorfastness).toBe('prone_to_bleed')
  })

  it('explicit garment hues before item nouns ("blue cotton shirt", "red dress") set prone_to_bleed', async () => {
    fetchSpy.mockImplementation(() => Promise.resolve(solveReadyResponse([])))
    const blueCotton = await runIntakeTurn(
      { transcript: [{ role: 'user', text: 'red wine on my blue cotton shirt' }], proceed: true },
      'test-key',
    )
    const redDress = await runIntakeTurn(
      { transcript: [{ role: 'user', text: 'coffee on my red dress' }], proceed: true },
      'test-key',
    )
    expect(blueCotton.assembledInput?.colorfastness).toBe('prone_to_bleed')
    expect(redDress.assembledInput?.colorfastness).toBe('prone_to_bleed')
  })

  it('the colorfastness chip answer still sets prone_to_bleed', async () => {
    fetchSpy.mockResolvedValue(solveReadyResponse([]))
    const req: IntakeRequest = {
      transcript: [
        { role: 'user', text: 'red wine on cotton' },
        { role: 'assistant', text: 'Could the color run or bleed?' },
        { role: 'user', text: 'Dark, bright, or might bleed' },
      ],
      proceed: true,
    }
    const d = await runIntakeTurn(req, 'test-key')
    expect(d.assembledInput?.colorfastness).toBe('prone_to_bleed')
  })

  it('a bare bleed-risk chip answer ("might bleed") still sets prone_to_bleed', async () => {
    fetchSpy.mockResolvedValue(solveReadyResponse([]))
    const req: IntakeRequest = {
      transcript: [
        { role: 'user', text: 'red wine on cotton' },
        { role: 'assistant', text: 'Could the color run or bleed?' },
        { role: 'user', text: 'might bleed' },
      ],
      proceed: true,
    }
    const d = await runIntakeTurn(req, 'test-key')
    expect(d.assembledInput?.colorfastness).toBe('prone_to_bleed')
  })
})
