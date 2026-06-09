// TASK-218 FRONTIER — care-label HARD-CONSTRAINT propagation regression suite.
//
// THE BUG (adversarial care-label override): a care-label scan promotes
// no-bleach / no-heat / no-iron into hints.hardConstraints, but the orchestrator
// only collapsed them through toCareStatus() into the 4-value CareStatus enum —
// where no-bleach/no-heat/no-iron all map to 'unknown' and silently vanish. The
// frontier ALWAYS POSTs JSON to /api/solve, whose JSON branch built its context
// with labelResult=null, so ctx.careSymbols=[] and the engine's own hasNoBleach
// guard + the 'NO BLEACH' brief line NEVER fired on this path. Net: scan a label
// that says 'do not bleach', stain a white cotton/tannin item, and /api/solve
// could return a dilute-bleach / hydrogen-peroxide step verbatim, with no caveat.
//
// THE CONTRACT these tests lock (the frontier prepares facts; the engine still
// renders the verdict — no advice is authored here):
//   (1) buildEngineSolveBody folds the restrictive symbols into the surface TEXT
//       and echoes them on `careSymbols` — and no-heat is a surface NOTE, never
//       heatExposure='warm_hot_wash' (which wrongly means heat-already-applied).
//   (2) buildSolveContext's text branch reads body.careSymbols, so hasNoBleach /
//       hasNoHeat / isDryCleanOnly + the 'NO BLEACH' brief line arm on the JSON
//       (frontier) path, not only the multipart image path.
//   (3) End to end: a care-label no-bleach hint on a tannin/cotton item reaches
//       /api/solve in BOTH the surface text and careSymbols — so the deterministic
//       engine is actually TOLD, and can never hand back an un-caveated bleach step.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildEngineSolveBody, emptySolveInput } from '@/lib/consumer-safety/solve-input'
import { buildSolveContext } from '@/lib/solve/context'
import {
  runIntakeTurn,
  type IntakeModelOutput,
  type IntakeRequest,
} from '@/lib/intake/orchestrator'

// ── (1) Engine body — restrictive symbols become load-bearing text + fields ──

describe('buildEngineSolveBody — care-label restrictive symbols reach the engine', () => {
  it('folds no-bleach / no-iron / no-heat into surface text AND careSymbols on tannin/cotton', () => {
    const input = { ...emptySolveInput(), stainDescription: 'coffee', material: 'cotton' as const }
    const body = buildEngineSolveBody(input, { careSymbols: ['no-bleach', 'no-iron', 'no-heat'] })

    // Echoed as raw tokens the engine's JSON branch reads to arm its guards.
    expect(body.careSymbols).toContain('no-bleach')
    expect(body.careSymbols).toContain('no-iron')
    expect(body.careSymbols).toContain('no-heat')

    // Folded into the surface text as load-bearing phrases (belt-and-suspenders so
    // the constraint also rides the only field the legacy contract reads).
    const surface = (body.surface ?? '').toLowerCase()
    expect(surface).toContain('no bleach')
    expect(surface).toContain('no iron')
    expect(surface).toContain('no heat')
  })

  it('does NOT misread a no-heat label ban as heat-already-applied', () => {
    const input = { ...emptySolveInput(), stainDescription: 'coffee', material: 'cotton' as const }
    const body = buildEngineSolveBody(input, { careSymbols: ['no-heat'] })
    // no-heat is a label PROHIBITION, not heatExposure='warm_hot_wash' (which means
    // heat was already applied and sets protein — the wrong, dangerous semantics).
    expect(body.heatExposure).toBeUndefined()
  })

  it('is byte-identical to the old body when no restrictive symbols are present', () => {
    const input = { ...emptySolveInput(), stainDescription: 'coffee', material: 'cotton' as const }
    const withEmpty = buildEngineSolveBody(input, { careSymbols: [] })
    const without = buildEngineSolveBody(input, {})
    expect(withEmpty).toEqual(without)
    expect(withEmpty.careSymbols).toBeUndefined()
  })
})

// ── (2) Engine context — the JSON branch arms hasNoBleach / hasNoHeat ──

describe('buildSolveContext — JSON (frontier) path reads body.careSymbols', () => {
  it('arms hasNoBleach + the NO BLEACH brief line from careSymbols when labelResult is null', () => {
    const ctx = buildSolveContext({
      stainResult: null,
      labelResult: null,
      stainHint: 'coffee',
      surfaceHint: 'white cotton',
      careSymbols: ['no-bleach'],
    })
    // This is exactly the guard (app/api/solve/route.ts line ~413) + brief line that
    // never fired on the frontier path before the fix.
    expect(ctx.hasNoBleach).toBe(true)
    expect(ctx.brief.toUpperCase()).toContain('NO BLEACH')
  })

  it('arms hasNoHeat / isDryCleanOnly from threaded careSymbols too', () => {
    const ctx = buildSolveContext({
      stainResult: null,
      labelResult: null,
      stainHint: 'coffee',
      surfaceHint: 'wool',
      careSymbols: ['no-heat', 'dry-clean-only'],
    })
    expect(ctx.hasNoHeat).toBe(true)
    expect(ctx.isDryCleanOnly).toBe(true)
  })
})

// ── (3) Orchestrator end-to-end — the constraint survives to the solve body ──

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

describe('intake orchestrator — care-label no-bleach + tannin/cotton never drops the constraint', () => {
  it('hands no-bleach to the deterministic engine in BOTH surface text and careSymbols', async () => {
    stubModel({
      read: { fabric: 'cotton', stain: 'coffee', careRisk: 'no bleach', confidence: 'high' },
      knows: ['fabric: cotton', 'stain: coffee'],
      suspects: [],
      cannotKnow: [],
      nextQuestion: null,
      readyForVerdict: true,
      riskFlags: [],
    })

    // White cotton, coffee (tannin), care label scanned says DO NOT BLEACH. The user
    // taps "Skip — just give me the safest move" (proceed) so we exercise the solve path.
    const request: IntakeRequest = {
      transcript: [{ role: 'user', text: 'coffee on my white cotton shirt' }],
      hints: {
        userNote: 'coffee on my white cotton shirt',
        careLabel: { fiber: 'cotton', careSymbols: ['no-bleach'] },
        hardConstraints: ['no-bleach'],
      },
      proceed: true,
    }

    const decision = await runIntakeTurn(request, 'test-key-not-used-by-stub')

    expect(decision.action).toBe('solve')
    expect(decision.solveBody).toBeDefined()
    // The hard constraint reaches the engine on BOTH the field it reads (careSymbols)
    // and the surface text — so /api/solve's hasNoBleach guard + NO BLEACH brief arm,
    // and a bleach / hydrogen-peroxide step can never come back un-caveated.
    expect(decision.solveBody?.careSymbols).toContain('no-bleach')
    expect((decision.solveBody?.surface ?? '').toLowerCase()).toContain('no bleach')
  })
})
