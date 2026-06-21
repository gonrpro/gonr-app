import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runIntakeTurn, type IntakeRequest, type IntakeTurn } from '@/lib/intake/orchestrator'

// TASK-257 Slice 1.7 A1 — early deterministic solve after stain + fabric are known.
// SB ruling: approve_a1_with_fixes_hold_a2
//   (500 Agents/Stain Brain/Reviews/task-257-slice-1-7-hazard-guard-option-a-ruling-2026-06-13.md)
//
// A1 lets the deterministic verified-card SOLVE fire once stain+fabric are known — skipping the
// age/prior/care chip walk — when: verified card (tier<4), fabric high-conf + non-specialty, no
// fail-closed blocker, any present chips trusted, residual free text (after the benign-prior strip)
// carries no hazard prose, and age is not required for the stain family (SB hold list). Otherwise it
// falls through UNCHANGED to the full/model path. A2 (clean one-shot, no chips) remains HELD.
//
// These fixtures prove deterministic runtime behavior (not prompts): "A1 fired" === a deterministic
// SOLVE with NO model call; "A1 deferred" === it did NOT early-solve (stays ASK or model path).

const FABRIC_Q = 'Quick one — what is the fabric?'
const AGE_Q = 'How long has the stain been there?'

// In-flow surface (asked >= 1, so this is A1 not the HELD A2 one-shot): the stain (+ any prior-care
// or hazard prose) is typed first, then the fabric chip is asked + answered. Prose in the FIRST
// user turn rides in the residual hazard scan (it is not a trusted chip answer) — the exact A1 path.
function inFlow(stainTurn: string, fabricAns = 'cotton'): IntakeRequest {
  return {
    transcript: [
      { role: 'user', text: stainTurn },
      { role: 'assistant', text: FABRIC_Q },
      { role: 'user', text: fabricAns },
    ] as IntakeTurn[],
    proceed: false,
  }
}

// Same, but the age chip is also answered — used to prove held-age families solve once age is cleared.
function inFlowAged(stainTurn: string, fabricAns = 'cotton', ageAns = 'A few hours'): IntakeRequest {
  return {
    transcript: [
      { role: 'user', text: stainTurn },
      { role: 'assistant', text: FABRIC_Q },
      { role: 'user', text: fabricAns },
      { role: 'assistant', text: AGE_Q },
      { role: 'user', text: ageAns },
    ] as IntakeTurn[],
    proceed: false,
  }
}

function inFlowWithPriorAnswer(stainTurn: string, priorAns: string): IntakeRequest {
  return {
    transcript: [
      { role: 'user', text: stainTurn },
      { role: 'assistant', text: FABRIC_Q },
      { role: 'user', text: 'cotton' },
      { role: 'assistant', text: 'Have you tried anything on it yet?' },
      { role: 'user', text: priorAns },
    ] as IntakeTurn[],
    proceed: false,
  }
}

function plannerQuestionResponse(): Response {
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

type Decision = Awaited<ReturnType<typeof runIntakeTurn>>
const a1Fired = (d: Decision) => d.model === 'deterministic' && d.action === 'solve'

// ───────────────────────── A1 FIRES — deterministic SOLVE, NO model call ─────────────────────────
describe('TASK-257 Slice 1.7 A1 — fires for carded tannin/oil on non-specialty washable', () => {
  let fetchSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    // Reject any model call: an A1 solve must be fully deterministic (no network).
    fetchSpy = vi.fn(() => Promise.reject(new Error('MODEL_CALLED')))
    vi.stubGlobal('fetch', fetchSpy)
  })
  afterEach(() => vi.unstubAllGlobals())

  // Verified-card tannins (lookupProtocol tier 1). soda/cotton is tier-4 (no card) → A1 defers, so
  // it is asserted in the defer suite, not here — A1 requires a verified card.
  for (const stain of ['coffee', 'tea', 'red wine', 'juice', 'beer']) {
    it(`tannin "${stain}" on cotton early-solves after fabric (age skipped), no model`, async () => {
      const d = await runIntakeTurn(inFlow(stain), 'test-key')
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(a1Fired(d)).toBe(true)
      expect(d.solveBody).toBeTruthy()
    })
  }

  for (const stain of ['cooking oil', 'grease', 'butter']) {
    it(`simple lipid "${stain}" on cotton early-solves after fabric (age skipped), no model`, async () => {
      const d = await runIntakeTurn(inFlow(stain), 'test-key')
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(a1Fired(d)).toBe(true)
    })
  }

  // Non-specialty washable fabrics with a verified coffee card (tier 1). coffee/nylon is tier-4
  // (no card) → A1 defers; only assert solve where a card actually exists.
  for (const fabric of ['cotton', 'polyester', 'linen']) {
    it(`coffee on non-specialty washable "${fabric}" early-solves, no model`, async () => {
      const d = await runIntakeTurn(inFlow('coffee', fabric), 'test-key')
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(a1Fired(d)).toBe(true)
    })
  }

  // Benign prior care — stripped narrowly, so the early solve still fires.
  for (const prose of [
    'coffee on cotton, blotted it with cool water',
    'coffee on cotton, rinsed with cold water',
    'coffee on cotton, used mild soap',
    'coffee on cotton, used a mild detergent',
    'coffee on cotton, used regular laundry detergent',
  ]) {
    it(`benign prior care still early-solves: "${prose}"`, async () => {
      const d = await runIntakeTurn(inFlow(prose), 'test-key')
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(a1Fired(d)).toBe(true)
    })
  }

  // Held-age family DOES early-solve once the age chip is answered (the hold is on age, not the card).
  it('blood (protein) early-solves once the AGE chip is answered', async () => {
    const d = await runIntakeTurn(inFlowAged('blood'), 'test-key')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(a1Fired(d)).toBe(true)
  })
})

// ───────────────────────── A1 DEFERS — must NOT early-solve ─────────────────────────
describe('TASK-257 Slice 1.7 A1 — defers (no early deterministic solve)', () => {
  let fetchSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    // Resolve a planner question so the model/full path does not throw; the assertion is purely
    // that A1 did NOT early-solve. (Unknown-product prose can defer to the ASK fast-path with no
    // fetch; chemistry/heat prose defers to the model path — both are "not an A1 solve".)
    fetchSpy = vi.fn(() => Promise.resolve(plannerQuestionResponse()))
    vi.stubGlobal('fetch', fetchSpy)
  })
  afterEach(() => vi.unstubAllGlobals())

  // Prior aggressive chemistry (SB-added classes) — every one must defer.
  for (const agent of [
    'OxiClean',
    'bleach',
    'hydrogen peroxide',
    'a solvent',
    'a sanitizer',
    'acid',
    'vinegar',
    'rubbing alcohol',
    'isopropyl alcohol',
    'nail polish remover',
    'mineral spirits',
    'turpentine',
    'WD-40',
    'Goo Gone',
    'Goof Off',
    'lye',
    'KOH',
    'rust remover',
    'oxalic acid',
    'sodium hydrosulfite',
    'sodium dithionite',
    'color remover',
    'reducing bleach',
  ]) {
    it(`prior chemistry "${agent}" defers, never early-solves`, async () => {
      const d = await runIntakeTurn(inFlow(`coffee on cotton, I already used ${agent} on it`), 'test-key')
      expect(a1Fired(d)).toBe(false)
    })
  }

  // Unknown / ambiguous product prose (SB-added classes) — every one must defer.
  for (const agent of [
    'an unknown cleaner',
    'some product',
    'a home mix',
    'a homemade mix',
    'a diy mix',
    'something I mixed',
    'a mixture',
    'a concoction',
    'a combo of stuff',
    'a cleaning spray',
    'some powder',
    'a paste',
    'a laundry booster',
    'a spot remover',
    'a pre-treater',
    'a magic eraser',
    'the strong stuff',
  ]) {
    it(`unknown product "${agent}" defers, never early-solves`, async () => {
      const d = await runIntakeTurn(inFlow(`coffee on cotton, I hit it with ${agent}`), 'test-key')
      expect(a1Fired(d)).toBe(false)
    })
  }

  // Heat exposure (SB-added classes) + the temperature edge of the benign strip — every one defers.
  for (const heat of [
    'I sun-dried it',
    'I left it in the sun',
    'I left it in a car',
    'I put it on the radiator',
    'I put it near the heater',
    'I used a hair dryer on it',
    'I used a blow dryer on it',
    'I used a heat gun on it',
    'I ran it through a hot cycle',
    'I ran a sanitize cycle',
    'I ran a steam cycle',
    'I ran a warm cycle',
    'I rinsed it with hot water',
    'I used warm water',
    'I poured boiling water on it',
  ]) {
    it(`heat exposure "${heat}" defers, never early-solves`, async () => {
      const d = await runIntakeTurn(inFlow(`coffee on cotton, ${heat}`), 'test-key')
      expect(a1Fired(d)).toBe(false)
    })
  }

  // Benign-prune edge: a qualifier flips a "soap/detergent" mention back to defer.
  for (const prose of ['used strong soap', 'used industrial detergent']) {
    it(`non-benign soap/detergent "${prose}" defers`, async () => {
      const d = await runIntakeTurn(inFlow(`coffee on cotton, ${prose}`), 'test-key')
      expect(a1Fired(d)).toBe(false)
    })
  }

  it('untrusted free-form prior-treatment chip answer defers instead of dropping unresolved prior history', async () => {
    const d = await runIntakeTurn(inFlowWithPriorAnswer('coffee', 'yes'), 'test-key')
    expect(a1Fired(d)).toBe(false)
  })

  // Held age families with NO age answered — every one must keep the age/full path.
  for (const stain of [
    'blood', // protein
    'egg', // protein
    'chocolate', // combo_protein_tannin
    'ink', // dye
    'mustard', // dye
    'rust', // oxidizable
    'lipstick', // combo_oil_dye
    'glue', // resin
    'mud', // particulate
    'mildew', // mildew
    'some unknown stain', // unknown
  ]) {
    it(`held-age family "${stain}" (no age) does not early-solve`, async () => {
      const d = await runIntakeTurn(inFlow(stain), 'test-key')
      expect(a1Fired(d)).toBe(false)
    })
  }

  // No verified card (lookupProtocol tier 4) → A1 must defer; the AI synthesis path is the model's
  // job. soda/cotton and coffee/nylon are tier-4 in the current library.
  it('no verified card (soda on cotton, tier 4) does not early-solve', async () => {
    const d = await runIntakeTurn(inFlow('soda'), 'test-key')
    expect(a1Fired(d)).toBe(false)
  })
  it('no verified card (coffee on nylon, tier 4) does not early-solve', async () => {
    const d = await runIntakeTurn(inFlow('coffee', 'nylon'), 'test-key')
    expect(a1Fired(d)).toBe(false)
  })

  // Look-alike: "coffee with cream" parses to stain=coffee (tannin) but the raw "cream" makes it a
  // combo_protein_tannin — the age-hold denylist scans the raw prose, so it must NOT early-solve.
  it('"coffee with cream" holds age (combo), does not early-solve even though base stain is tannin', async () => {
    const d = await runIntakeTurn(inFlow('coffee with cream'), 'test-key')
    expect(a1Fired(d)).toBe(false)
  })

  // Untrusted free-text chip answer (uncertainty) → not a trusted exact option → defer.
  it('uncertain free-text input ("not sure") defers, never early-solves', async () => {
    const d = await runIntakeTurn(inFlow('coffee on cotton, not sure what I used'), 'test-key')
    expect(a1Fired(d)).toBe(false)
  })

  // Specialty / delicate fabrics → computeFailClosed blocks → defer (red-cell coverage).
  for (const fabric of ['silk', 'wool', 'cashmere', 'acetate', 'leather', 'suede']) {
    it(`specialty fabric "${fabric}" defers, never early-solves`, async () => {
      const d = await runIntakeTurn(inFlow('coffee', fabric), 'test-key')
      expect(a1Fired(d)).toBe(false)
    })
  }
})

// ───────────────────────── lye/polyester regression (Atlas-requested) ─────────────────────────
describe('TASK-257 Slice 1.7 A1 — lye/polyester hazard-regex regression', () => {
  let fetchSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    fetchSpy = vi.fn(() => Promise.resolve(plannerQuestionResponse()))
    vi.stubGlobal('fetch', fetchSpy)
  })
  afterEach(() => vi.unstubAllGlobals())

  // The bug: bare `lye` in PRIOR_AGGRESSIVE matched the "lye" inside "po-LYE-ster", flagging
  // prior_aggressive_chemistry on a plain fabric and blocking a legit early solve. Word boundaries
  // (\blye\b, \bkoh\b, \bacid\b) fixed it. Prove BOTH directions in one place.
  it('polyester does NOT trip prior-chemistry — coffee on polyester early-solves', async () => {
    fetchSpy = vi.fn(() => Promise.reject(new Error('MODEL_CALLED')))
    vi.stubGlobal('fetch', fetchSpy)
    const d = await runIntakeTurn(inFlow('coffee', 'polyester'), 'test-key')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(a1Fired(d)).toBe(true)
  })

  for (const agent of ['lye', 'caustic soda', 'KOH']) {
    it(`real prior chemistry "${agent}" still defers (boundary fix did not over-narrow)`, async () => {
      const d = await runIntakeTurn(inFlow(`coffee on cotton, I used ${agent}`), 'test-key')
      expect(a1Fired(d)).toBe(false)
    })
  }
})
