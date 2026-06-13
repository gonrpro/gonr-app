import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runIntakeTurn, type IntakeRequest, type IntakeTurn } from '@/lib/intake/orchestrator'

// TASK-257 Slice 1.6 — deterministic verified-card SOLVE (Atlas ruling C: structured-only).
//
// The verdict turn used to cost a ~15-28s model round-trip even when a verified card existed.
// Slice 1.6 hands the deterministic read straight to /api/solve (no model) ONLY when:
//   • stain + fabric are high-confidence parses,
//   • a verified card exists (lookupProtocol tier < 4),
//   • the hazard-relevant chips (prior-treatment + care) were EXPLICITLY asked and the whole
//     structured sweep is complete (no model-inferred free-text prose drives the verdict),
//   • no disclosed hazard / uncertainty (computeFailClosed raises nothing blocking).
// Everything else — one-shot free-text, incomplete sweep, specialty fiber, prior chemistry,
// heat, uncertainty, or no verified card — stays on the model path UNCHANGED.
//
// "No model call" is proved by stubbing global fetch (callModel's only network path).

const FABRIC_Q = 'Quick one — what is the fabric?'
const AGE_Q = 'How long has the stain been there?'
const PRIOR_Q = 'Have you tried anything on it yet?'
const CARE_Q = 'What does the care label say?'

// A FULLY structured sweep: stain typed, then fabric/age/prior/care all asked + answered via chips.
function structuredSweep(stain: string, fabricAns: string, priorAns = 'Nothing yet', careAns = 'Machine wash'): IntakeRequest {
  const t: Array<[IntakeTurn['role'], string]> = [
    ['user', stain],
    ['assistant', FABRIC_Q],
    ['user', fabricAns],
    ['assistant', AGE_Q],
    ['user', 'A few hours'],
    ['assistant', PRIOR_Q],
    ['user', priorAns],
    ['assistant', CARE_Q],
    ['user', careAns],
  ]
  return { transcript: t.map(([role, text]) => ({ role, text })), proceed: false }
}

function parsedFabricSweep(text: string, priorAns = 'Nothing yet', careAns = 'Machine wash'): IntakeRequest {
  const t: Array<[IntakeTurn['role'], string]> = [
    ['user', text],
    ['assistant', AGE_Q],
    ['user', 'A few hours'],
    ['assistant', PRIOR_Q],
    ['user', priorAns],
    ['assistant', CARE_Q],
    ['user', careAns],
  ]
  return { transcript: t.map(([role, text]) => ({ role, text })), proceed: false }
}

function modelResponse(): Response {
  return new Response(
    JSON.stringify({
      status: 'completed',
      output_text: JSON.stringify({
        read: { fabric: '', stain: '', careRisk: '', confidence: 'medium' },
        knows: [],
        suspects: [],
        cannotKnow: [],
        nextQuestion: { text: 'One more thing?', options: ['Not sure'] },
        readyForVerdict: false,
        riskFlags: [],
      }),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function solveReadyResponse(): Response {
  return new Response(
    JSON.stringify({
      status: 'completed',
      output_text: JSON.stringify({
        read: { fabric: 'cotton', stain: 'coffee', careRisk: '', confidence: 'high' },
        knows: ['fabric: cotton', 'stain: coffee'],
        suspects: [],
        cannotKnow: [],
        nextQuestion: null,
        readyForVerdict: true,
        riskFlags: [],
      }),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

describe('TASK-257 Slice 1.6 — deterministic verified-card SOLVE fires (structured sweep)', () => {
  let fetchSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    fetchSpy = vi.fn(() => Promise.reject(new Error('MODEL_CALLED')))
    vi.stubGlobal('fetch', fetchSpy)
  })
  afterEach(() => vi.unstubAllGlobals())

  for (const [stain, fabric] of [
    ['coffee', 'cotton'],
    ['foundation', 'cotton'], // Slice 1.5 alias recovery: foundation→makeup (makeup-cotton)
    ['blood', 'cotton'],
  ] as const) {
    it(`${stain} on ${fabric}, full structured sweep → deterministic SOLVE, NO model call`, async () => {
      const t0 = performance.now()
      const d = await runIntakeTurn(structuredSweep(stain, fabric), 'test-key')
      const ms = performance.now() - t0
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(d.action).toBe('solve')
      expect(d.model).toBe('deterministic')
      expect(d.solveBody).toBeTruthy()
      expect(ms).toBeLessThan(250)
    })
  }

  it('dry-clean-only care chip is preserved in the deterministic solve body', async () => {
    const d = await runIntakeTurn(structuredSweep('coffee', 'cotton', 'Nothing yet', 'Dry clean only'), 'test-key')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(d.action).toBe('solve')
    expect(d.model).toBe('deterministic')
    expect(d.solveBody?.careStatus).toBe('dry_clean_only')
    expect(d.solveBody?.careSymbols).toContain('dry-clean-only')
    expect(d.solveBody?.surface).toContain('dry-clean-only')
    expect(d.solveBody?.surface).toContain('do-not-wash')
  })

  it('hand-wash care chip is preserved in the deterministic solve body', async () => {
    const d = await runIntakeTurn(structuredSweep('coffee', 'cotton', 'Nothing yet', 'Hand wash'), 'test-key')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(d.action).toBe('solve')
    expect(d.model).toBe('deterministic')
    expect(d.solveBody?.careStatus).toBe('hand_wash')
    expect(d.solveBody?.careSymbols).toContain('hand-wash-only')
    expect(d.solveBody?.surface).toContain('hand-wash only')
  })

  it('no-bleach/no-heat care chip is forwarded as a restriction, not prior chemistry', async () => {
    const d = await runIntakeTurn(structuredSweep('coffee', 'cotton', 'Nothing yet', 'No bleach / no heat'), 'test-key')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(d.action).toBe('solve')
    expect(d.model).toBe('deterministic')
    expect(d.failClosedReasons).not.toContain('prior_aggressive_chemistry')
    expect(d.solveBody?.careSymbols).toEqual(expect.arrayContaining(['no-bleach', 'no-heat']))
    expect(d.solveBody?.surface).toContain('do not bleach')
    expect(d.solveBody?.surface).toContain('no heat allowed')
  })

  it('parsed fabric from the first user message satisfies the structured fabric gate', async () => {
    const d = await runIntakeTurn(parsedFabricSweep('coffee on cotton'), 'test-key')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(d.action).toBe('solve')
    expect(d.model).toBe('deterministic')
    expect(d.solveBody).toBeTruthy()
  })

  it('latest trusted fabric chip overrides an earlier parsed fabric mention', async () => {
    const d = await runIntakeTurn(structuredSweep('coffee on cotton', 'Polyester'), 'test-key')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(d.action).toBe('solve')
    expect(d.model).toBe('deterministic')
    expect(d.read.fabric).toBe('polyester')
    expect(d.solveBody?.surface?.toLowerCase()).toContain('polyester')
    expect(d.solveBody?.surface?.toLowerCase()).not.toContain('cotton')
  })
})

describe('TASK-257 Slice 1.6 — exclusions stay on the model path', () => {
  let fetchSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    fetchSpy = vi.fn(() => Promise.resolve(modelResponse()))
    vi.stubGlobal('fetch', fetchSpy)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('one-shot free-text (no chips asked) → model path (free-text hazard inference preserved)', async () => {
    const d = await runIntakeTurn(
      { transcript: [{ role: 'user', text: 'coffee on a cotton shirt, used the strong stuff on it' }], proceed: false },
      'test-key',
    )
    expect(fetchSpy).toHaveBeenCalled()
    expect(d.model).not.toBe('deterministic')
  })

  it('earlier ambiguous treatment prose plus later trusted chips → model path for hazard inference', async () => {
    const d = await runIntakeTurn(
      parsedFabricSweep('coffee on cotton; I used the strong stuff'),
      'test-key',
    )
    expect(fetchSpy).toHaveBeenCalled()
    expect(d.model).not.toBe('deterministic')
  })

  it('earlier named bleach-product prose plus later trusted chips → model path for hazard inference', async () => {
    const d = await runIntakeTurn(
      parsedFabricSweep('coffee on cotton — I hit it with Clorox'),
      'test-key',
    )
    expect(fetchSpy).toHaveBeenCalled()
    expect(d.model).not.toBe('deterministic')
  })

  it('incomplete sweep (prior/care chips not asked) → model path, not deterministic', async () => {
    // fabric answered, but prior-treatment + care chips never asked → hazardChipsAsked false.
    const d = await runIntakeTurn(
      {
        transcript: [
          { role: 'user', text: 'coffee' },
          { role: 'assistant', text: FABRIC_Q },
          { role: 'user', text: 'cotton' },
        ],
        proceed: false,
      },
      'test-key',
    )
    // turn 2 asks AGE (Slice 1 chip) — deterministic ASK, not a SOLVE. The point: it does NOT solve.
    expect(d.action).not.toBe('solve')
  })

  it('specialty fiber (wool) full sweep → model path (computeFailClosed blocks specialty fiber)', async () => {
    const d = await runIntakeTurn(structuredSweep('coffee', 'wool'), 'test-key')
    expect(fetchSpy).toHaveBeenCalled()
    expect(d.model).not.toBe('deterministic')
  })

  it('specialty fiber with a care restriction still stays on model path', async () => {
    const d = await runIntakeTurn(structuredSweep('coffee', 'silk', 'Nothing yet', 'Dry clean only'), 'test-key')
    expect(fetchSpy).toHaveBeenCalled()
    expect(d.model).not.toBe('deterministic')
  })

  it('prior chemistry disclosed via chip (bleach) → model path, not deterministic', async () => {
    const d = await runIntakeTurn(
      structuredSweep('coffee', 'cotton', 'Bleach or another chemical'),
      'test-key',
    )
    expect(fetchSpy).toHaveBeenCalled()
    expect(d.model).not.toBe('deterministic')
  })

  it('free-text answer after prior chip prompt → model path for hazard inference', async () => {
    const d = await runIntakeTurn(
      structuredSweep('coffee', 'cotton', 'I used Clorox / the strong stuff'),
      'test-key',
    )
    expect(fetchSpy).toHaveBeenCalled()
    expect(d.model).not.toBe('deterministic')
  })

  it('free-text answer after care chip prompt → model path, not structured fast-path', async () => {
    const d = await runIntakeTurn(
      structuredSweep('coffee', 'cotton', 'Nothing yet', 'The label is weird but I think machine wash'),
      'test-key',
    )
    expect(fetchSpy).toHaveBeenCalled()
    expect(d.model).not.toBe('deterministic')
  })

  it('uncertainty in an answer ("Not sure") → model path, not deterministic', async () => {
    const d = await runIntakeTurn(structuredSweep('coffee', 'cotton', 'Not sure'), 'test-key')
    expect(fetchSpy).toHaveBeenCalled()
    expect(d.model).not.toBe('deterministic')
  })
})

describe('TASK-257 Slice 1.6 — model path keeps inferred prior chemistry authoritative', () => {
  let fetchSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    fetchSpy = vi.fn(() => Promise.resolve(solveReadyResponse()))
    vi.stubGlobal('fetch', fetchSpy)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('normalizes Clorox to bleach so forced solve preserves the engine prior-chemistry gate', async () => {
    const d = await runIntakeTurn(
      { transcript: [{ role: 'user', text: 'coffee on cotton — I hit it with Clorox' }], proceed: true },
      'test-key',
    )
    expect(fetchSpy).toHaveBeenCalled()
    expect(d.model).not.toBe('deterministic')
    expect(d.failClosedReasons).toContain('prior_aggressive_chemistry')
    expect(d.assembledInput?.priorTreatment).toContain('bleach')
    expect(d.solveBody?.stain.toLowerCase()).toContain('prior bleach')
    expect(d.solveBody?.priorTreatment).toContain('bleach')
  })
})
