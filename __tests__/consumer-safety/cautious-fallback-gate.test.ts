import { cautiousFallbackEligible } from '@/lib/safety/filter'

// TASK-218 — SB cautious-copy gate (signed 2026-06-08). The safety-fallback "if you're
// going to try anything, do this first" holding steps may ONLY appear when the item can
// tolerate a gentle home holding action. Delicate fiber, dry-clean-only, or a chemical
// already applied => refuse-only. (Acutely-dangerous chemical-mixing / acetate / fume
// cases route through hard-refuse separately and never reach this fallback.)

describe('cautiousFallbackEligible — SB gate', () => {
  it('allows holding steps on a washable, non-delicate, no-chemical item', () => {
    expect(
      cautiousFallbackEligible({ isDelicateFiber: false, isDryCleanOnly: false, hasPriorChemical: false }),
    ).toBe(true)
  })

  it('refuses holding steps on a delicate / specialty fiber', () => {
    expect(
      cautiousFallbackEligible({ isDelicateFiber: true, isDryCleanOnly: false, hasPriorChemical: false }),
    ).toBe(false)
  })

  it('refuses on a dry-clean-only item', () => {
    expect(
      cautiousFallbackEligible({ isDelicateFiber: false, isDryCleanOnly: true, hasPriorChemical: false }),
    ).toBe(false)
  })

  it('refuses when a chemical has already been applied', () => {
    expect(
      cautiousFallbackEligible({ isDelicateFiber: false, isDryCleanOnly: false, hasPriorChemical: true }),
    ).toBe(false)
  })
})
