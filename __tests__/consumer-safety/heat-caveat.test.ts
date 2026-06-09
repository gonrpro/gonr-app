import { applyHeatCaveat } from '@/components/consumer/ResultsStepList'

// TASK-218 frontier copy gate: the engine's heat wording must never render as
// unconditionally safe. These fixtures lock the two fail-open paths that were
// verified broken:
//  1. a bare "only if" (unrelated conditional) suppressing the care-label caveat
//  2. high-heat dryer wording slipping past brittle phrase-list detection
//
// The frontier layer NEVER writes treatment advice — applyHeatCaveat only
// attaches the Atlas-authorized care-label conditional to the engine's OWN heat
// wording. The deterministic engine still owns the verdict.

const HOT_WASH_CAVEAT = '— only if the care label allows hot wash'
const HEAT_PROCESS_CAVEAT = '— only if the care label allows it'

describe('applyHeatCaveat — fail-open guards', () => {
  it('does NOT let a bare "only if" suppress the caveat (was treated as already-conditional)', () => {
    const out = applyHeatCaveat('Rinse with hot water only if colorfast')
    expect(out).toContain(HOT_WASH_CAVEAT)
  })

  it('flags a high-heat dryer step that matched neither prior phrase list', () => {
    const out = applyHeatCaveat('Tumble dry on the highest heat setting')
    expect(out).toContain(HEAT_PROCESS_CAVEAT)
  })

  it('flags "high heat" process wording', () => {
    expect(applyHeatCaveat('Set the dryer to high heat')).toContain(HEAT_PROCESS_CAVEAT)
  })

  it('flags "hottest setting" cycle wording', () => {
    expect(applyHeatCaveat('Run the hottest available cycle')).toContain(HEAT_PROCESS_CAVEAT)
  })

  it('still flags "wash in hot water"', () => {
    expect(applyHeatCaveat('Wash in hot water')).toContain(HOT_WASH_CAVEAT)
  })
})

describe('applyHeatCaveat — no double-append / no over-fire', () => {
  it('does not double-append once the care-label caveat is present', () => {
    const first = applyHeatCaveat('Wash in hot water')
    const second = applyHeatCaveat(first)
    expect(second).toBe(first)
  })

  it('respects an engine step that already conditions on the care label', () => {
    const input = 'Wash in hot water only if the care label allows it'
    expect(applyHeatCaveat(input)).toBe(input)
  })

  it('leaves a non-heat step untouched', () => {
    const input = 'Blot the stain with a clean white cloth'
    expect(applyHeatCaveat(input)).toBe(input)
  })

  it('does not flag a low-heat dry step', () => {
    const input = 'Tumble dry on low'
    expect(applyHeatCaveat(input)).toBe(input)
  })
})
