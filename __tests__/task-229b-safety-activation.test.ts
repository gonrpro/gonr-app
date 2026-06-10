// TASK-229b — regression tests for the safety-rule ACTIVATION fixes.
//
// Root cause (TASK-229): the safety filter scans the right fields, but for two
// live escapes the dangerous rules never entered activeRules at all:
//   S5  — intake collapsed "aniline leather sofa" → fabric "leather", so the
//         engine surface lost "aniline" and RULE-9 (dish soap) could not arm.
//         Same collapse erased angora/mohair → "wool".
//   G3  — the only hot-water rule (RULE-1) is protein-gated; mud is not protein
//         and the wool rule (RULE-2) is enzymes-only, so "hot water" on
//         mud/wool passed with zero violations. RULE-12 now covers it.
// Plus two filter holes: object-shaped homeSolutions entries were entirely
// unscanned, and warning copy ("No hot water, no enzymes") was rewritten into
// contradictions because the negation lookback lacked bare "no".
//
// These tests exercise the REAL pipeline pieces end-to-end (intake parse →
// engine solve body → safety filter), no mocks.

import { describe, it, expect } from 'vitest'
import { extractParsedFacts } from '@/lib/intake/orchestrator'
import { buildEngineSolveBody, emptySolveInput } from '@/lib/consumer-safety/solve-input'
import { runSafetyFilter } from '@/lib/safety/filter'

function intakeReq(text: string) {
  return { transcript: [{ role: 'user' as const, text }] }
}

/** Engine surface exactly as buildSolveBody produces it for a resolved fabric. */
function engineSurface(fabric: string): string {
  const body = buildEngineSolveBody(emptySolveInput(), { surfaceBase: fabric })
  return body.surface ?? ''
}

const dishSoapCard = {
  title: 'Grease on Leather',
  spottingProtocol: [
    { step: 1, agent: 'Dish soap solution', instruction: 'Apply a few drops of dish soap mixed with water and blot the grease.' },
  ],
  homeSolutions: ['Mix dish soap with lukewarm water and dab gently.'],
}

const hotWaterCard = {
  title: 'Mud on Wool Carpet',
  spottingProtocol: [
    { step: 1, instruction: 'Rinse the area with hot water and blot dry.' },
  ],
}

describe('TASK-229b — intake preserves safety-critical fiber qualifiers', () => {
  it('keeps "aniline" through the fabric collapse', () => {
    expect(extractParsedFacts(intakeReq('grease stain on my aniline leather sofa')).fabric).toBe('aniline leather')
  })

  it('keeps angora and mohair distinct from bare wool', () => {
    expect(extractParsedFacts(intakeReq('coffee on my angora sweater')).fabric).toBe('angora wool')
    expect(extractParsedFacts(intakeReq('ink on a mohair throw')).fabric).toBe('mohair wool')
    expect(extractParsedFacts(intakeReq('mud on a wool rug')).fabric).toBe('wool')
    expect(extractParsedFacts(intakeReq('wine on merino base layer')).fabric).toBe('wool')
  })

  it('plain leather still collapses to leather (lookup path unchanged)', () => {
    expect(extractParsedFacts(intakeReq('grease on my leather sofa')).fabric).toBe('leather')
  })
})

describe('TASK-229b — S5: dish soap on aniline leather is caught on the engine path', () => {
  it('RULE-9 fires with the engine surface built from the preserved fabric', () => {
    const surface = engineSurface('aniline leather')
    const result = runSafetyFilter(dishSoapCard, 'Grease', surface)
    const rules = result.violations.map(v => v.rule)
    expect(rules.some(r => r.startsWith('RULE-9'))).toBe(true)
    expect(JSON.stringify(result.card)).not.toMatch(/dish soap/i)
  })

  it('documents the pre-fix gap: collapsed "leather" surface cannot arm RULE-9', () => {
    const result = runSafetyFilter(dishSoapCard, 'Grease', engineSurface('leather'))
    expect(result.violations.some(v => v.rule.startsWith('RULE-9'))).toBe(false)
  })
})

describe('TASK-229b — G3: hot water on wool is caught independent of stain family', () => {
  it('RULE-12 fires for a non-protein stain (mud) on wool', () => {
    const result = runSafetyFilter(hotWaterCard, 'Mud', engineSurface('wool'))
    expect(result.violations.some(v => v.rule.startsWith('RULE-12'))).toBe(true)
    expect(JSON.stringify(result.card.spottingProtocol)).not.toMatch(/hot water/i)
  })

  it('RULE-12 also arms for angora via the preserved qualifier', () => {
    const result = runSafetyFilter(hotWaterCard, 'Mud', engineSurface('angora wool'))
    expect(result.violations.some(v => v.rule.startsWith('RULE-12'))).toBe(true)
  })

  it('does not ban warm/lukewarm water on wool (legitimate wool-wash guidance)', () => {
    const card = { title: 'Mud on Wool', spottingProtocol: [{ step: 1, instruction: 'Sponge with lukewarm water, then blot with cool water.' }] }
    const result = runSafetyFilter(card, 'Mud', engineSurface('wool'))
    expect(result.violations.some(v => v.rule.startsWith('RULE-12'))).toBe(false)
  })
})

describe('TASK-229b — object-shaped homeSolutions are scanned', () => {
  it('catches banned terms inside homeSolutions[i].instruction objects', () => {
    const card = {
      title: 'Blood on Wool',
      homeSolutions: [
        { option: 1, agent: 'Enzyme cleaner', instruction: 'Soak in hot water with an enzyme cleaner.' },
      ],
    }
    const result = runSafetyFilter(card, 'Blood', engineSurface('wool'))
    const fields = result.violations.map(v => v.field)
    expect(fields.some(f => f.startsWith('homeSolutions[0].'))).toBe(true)
    expect(JSON.stringify(result.card.homeSolutions)).not.toMatch(/\bhot water\b/i)
  })
})

describe('TASK-229b — bare "no" negation is warning context (tight window)', () => {
  it('leaves "No hot water, no enzymes" warning copy intact', () => {
    const card = {
      title: 'Mud on Wool Carpet',
      spottingProtocol: [{ step: 1, instruction: 'Brush off dry mud first. No hot water, no enzymes, no OxiClean on wool.' }],
    }
    const result = runSafetyFilter(card, 'Mud', engineSurface('wool'))
    expect(result.card.spottingProtocol[0].instruction).toContain('No hot water, no enzymes, no OxiClean')
  })

  it('a distant "no" does NOT shadow a genuine recommendation', () => {
    const card = {
      title: 'Mud on Wool',
      spottingProtocol: [{ step: 1, instruction: 'There is no reason to wait, and once the mud has fully dried out completely overnight you should rinse it with hot water.' }],
    }
    const result = runSafetyFilter(card, 'Mud', engineSurface('wool'))
    expect(result.violations.some(v => v.rule.startsWith('RULE-12'))).toBe(true)
  })
})
