import { describe, expect, it } from 'vitest'
import { classify } from '../classifier'
import {
  buildSolveInputFrom,
  deriveFollowups,
  effectiveMaterial,
  MAX_FOLLOWUPS,
  type SolveFields,
} from '../progressive'

function fields(overrides: Partial<SolveFields> = {}): SolveFields {
  return {
    description: '',
    stainType: 'auto',
    material: 'unknown',
    careStatus: 'unknown',
    heatExposure: 'unknown',
    colorfastness: 'unknown',
    stainAge: 'unknown',
    itemValue: 'everyday',
    priorTreatment: [],
    locationText: '',
    ...overrides,
  }
}

describe('buildSolveInputFrom', () => {
  it("maps 'auto' stainType to undefined and infers material from text", () => {
    const input = buildSolveInputFrom(fields({ description: 'red wine on a cotton shirt' }))
    expect(input.stainType).toBeUndefined()
    expect(input.material).toBe('cotton')
    expect(input.stainDescription).toBe('red wine on a cotton shirt')
  })

  it('passes an explicit stainType through', () => {
    expect(buildSolveInputFrom(fields({ stainType: 'protein' })).stainType).toBe('protein')
  })
})

describe('effectiveMaterial', () => {
  it('stays unknown when the text reveals no fabric', () => {
    expect(effectiveMaterial(fields({ description: 'red wine spill' }))).toBe('unknown')
  })
  it('infers a fabric from the free text', () => {
    expect(effectiveMaterial(fields({ description: 'grease on a silk blouse' }))).toBe('silk')
  })
})

describe('deriveFollowups', () => {
  it('leads with the highest-impact unknowns, capped at MAX_FOLLOWUPS', () => {
    const f = deriveFollowups(null, fields({ description: 'red wine spill' }))
    expect(f).toHaveLength(MAX_FOLLOWUPS)
    expect(f.map((x) => x.field)).toEqual(['material', 'colorfastness', 'careStatus'])
  })

  it('drops facts the free text already established', () => {
    // "white cotton" gives material + colorfastness; only care/age/heat remain.
    const f = deriveFollowups(null, fields({ description: 'coffee on a white cotton shirt' }))
    expect(f.map((x) => x.field)).toEqual(['careStatus', 'stainAge', 'heatExposure'])
  })

  it('asks nothing once every gating fact is known', () => {
    const known = fields({
      description: 'coffee',
      material: 'cotton',
      careStatus: 'machine_washable',
      colorfastness: 'colorfast',
      stainAge: 'fresh',
      heatExposure: 'none',
    })
    expect(deriveFollowups(null, known)).toEqual([])
  })

  it('does not pester on a hard do_not_attempt verdict', () => {
    const f = fields({ description: 'used bleach and ammonia together', priorTreatment: ['bleach', 'ammonia'] })
    const verdict = classify(buildSolveInputFrom(f))
    expect(verdict.verdict).toBe('do_not_attempt')
    expect(deriveFollowups(verdict, f)).toEqual([])
  })

  it('every follow-up option value is a valid engine enum (no free-form)', () => {
    const allowed: Record<string, string[]> = {
      material: ['cotton', 'linen', 'denim', 'polyester', 'nylon', 'wool', 'silk', 'rayon_viscose', 'acetate', 'leather', 'suede', 'blend', 'unknown'],
      colorfastness: ['colorfast', 'prone_to_bleed', 'unknown'],
      careStatus: ['machine_washable', 'hand_wash', 'dry_clean_only', 'unknown'],
      stainAge: ['fresh', 'hours_old', 'set_in', 'unknown'],
      heatExposure: ['none', 'warm_hot_wash', 'machine_dried', 'ironed', 'unknown'],
    }
    for (const fu of deriveFollowups(null, fields({ description: 'spill' }))) {
      for (const opt of fu.options) expect(allowed[fu.field]).toContain(opt.value)
    }
  })
})

describe('progressive flow shrinks as facts are answered', () => {
  it('goes from several asks to zero, ending on a usable DIY verdict', () => {
    // Start: just free text → multiple unknowns.
    let f = fields({ description: 'fresh blood on a shirt' })
    expect(deriveFollowups(classify(buildSolveInputFrom(f)), f).length).toBeGreaterThan(0)

    // Answer the gating facts the way a usable card needs.
    f = { ...f, material: 'cotton', colorfastness: 'colorfast', careStatus: 'machine_washable', stainAge: 'fresh', heatExposure: 'none' }
    const verdict = classify(buildSolveInputFrom(f))
    expect(deriveFollowups(verdict, f)).toEqual([])
    // A reviewed consumer card now drives the result.
    expect(['diy_safe', 'diy_with_constraints']).toContain(verdict.verdict)
    expect(verdict.card).toBeTruthy()
  })
})
