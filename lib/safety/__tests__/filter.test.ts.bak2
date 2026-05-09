// lib/safety/__tests__/filter.test.ts
// Unit tests for the GONR safety filter

import { runSafetyFilter, SAFE_FALLBACK } from '../filter'

// Helper: build a minimal AI card for testing
function makeCard(overrides: any = {}) {
  return {
    title: overrides.title || 'Test Protocol',
    stainFamily: 'protein',
    surface: overrides.surface || 'cotton',
    stainChemistry: 'Test chemistry.',
    whyThisWorks: 'Test explanation.',
    spottingProtocol: overrides.spottingProtocol || [
      {
        step: 1,
        agent: overrides.agent || 'dish soap',
        technique: overrides.technique || 'blot',
        instruction: overrides.instruction || 'Apply gently.',
      },
    ],
    homeSolutions: overrides.homeSolutions || [],
    materialWarnings: overrides.materialWarnings || [],
    escalation: overrides.escalation || 'Take to a pro.',
    products: { professional: [], consumer: [] },
    meta: { riskLevel: 'low', tier: 'ai-generated' },
  }
}

// =====================================================
// RULE 1: Hot water on protein stains
// =====================================================

describe('RULE 1: Hot water on protein stains', () => {
  test('replaces hot water in agent field for blood stain', () => {
    const card = makeCard({ agent: 'hot water and dish soap' })
    const result = runSafetyFilter(card, 'blood', 'cotton')
    expect(result.safe).toBe(true)
    expect(result.filtered).toBe(true)
    expect(result.card.spottingProtocol[0].agent).toContain('cold water')
    expect(result.card.spottingProtocol[0].agent).not.toContain('hot water')
    expect(result.violations[0].rule).toContain('RULE-1')
  })

  test('replaces warm water in instruction for urine stain', () => {
    const card = makeCard({ instruction: 'Rinse with warm water thoroughly.' })
    const result = runSafetyFilter(card, 'urine', 'carpet')
    expect(result.safe).toBe(true)
    expect(result.filtered).toBe(true)
    expect(result.card.spottingProtocol[0].instruction).toContain('cold water')
    expect(result.card.spottingProtocol[0].instruction).not.toContain('warm water')
  })

  test('does NOT flag non-protein stains', () => {
    const card = makeCard({ agent: 'hot water' })
    const result = runSafetyFilter(card, 'wine', 'cotton')
    expect(result.filtered).toBe(false)
    expect(result.violations).toHaveLength(0)
  })

  test('replaces boiling water in homeSolutions', () => {
    const card = makeCard({ homeSolutions: ['Pour boiling water over the stain.'] })
    const result = runSafetyFilter(card, 'egg', 'polyester')
    expect(result.safe).toBe(true)
    expect(result.filtered).toBe(true)
    expect(result.card.homeSolutions[0]).toContain('cold water')
  })
})

// =====================================================
// RULE 2: Enzymes on silk or wool
// =====================================================

describe('RULE 2: Enzymes on silk/wool', () => {
  test('replaces enzyme cleaner on silk', () => {
    const card = makeCard({ agent: 'enzyme cleaner' })
    const result = runSafetyFilter(card, 'coffee', 'silk')
    expect(result.safe).toBe(true)
    expect(result.filtered).toBe(true)
    expect(result.card.spottingProtocol[0].agent).toContain('pH-neutral protein spotter')
  })

  test('replaces OxiClean on cashmere', () => {
    const card = makeCard({ agent: 'OxiClean solution' })
    const result = runSafetyFilter(card, 'wine', 'cashmere')
    expect(result.safe).toBe(true)
    expect(result.filtered).toBe(true)
    expect(result.card.spottingProtocol[0].agent).toContain('pH-neutral protein spotter')
  })

  test('replaces biological detergent on wool', () => {
    const card = makeCard({ instruction: 'Soak in biological detergent for 30 min.' })
    const result = runSafetyFilter(card, 'grease', 'wool')
    expect(result.filtered).toBe(true)
    expect(result.card.spottingProtocol[0].instruction).toContain('pH-neutral protein spotter')
  })

  test('does NOT flag enzyme on cotton', () => {
    const card = makeCard({ agent: 'enzyme cleaner' })
    const result = runSafetyFilter(card, 'blood', 'cotton')
    // Rule 1 may fire (protein + hot water), but Rule 2 should NOT fire (not silk/wool)
    const rule2 = result.violations.filter(v => v.rule.includes('RULE-2'))
    expect(rule2).toHaveLength(0)
  })
})

// =====================================================
// RULE 3: Acid on marble (NUCLEAR BLOCK)
// =====================================================

describe('RULE 3: Acid on marble — NUCLEAR', () => {
  test('blocks vinegar recommendation on marble', () => {
    const card = makeCard({ agent: 'white vinegar solution' })
    const result = runSafetyFilter(card, 'hard water', 'marble countertop')
    expect(result.safe).toBe(false)
    expect(result.violations.some(v => v.action === 'blocked')).toBe(true)
  })

  test('blocks lemon juice on limestone', () => {
    const card = makeCard({ instruction: 'Apply lemon juice and let sit.' })
    const result = runSafetyFilter(card, 'rust', 'limestone')
    expect(result.safe).toBe(false)
  })

  test('blocks CLR on travertine', () => {
    const card = makeCard({ agent: 'CLR cleaner' })
    const result = runSafetyFilter(card, 'calcium', 'travertine tile')
    expect(result.safe).toBe(false)
  })

  test('does NOT block vinegar on non-stone surfaces', () => {
    const card = makeCard({ agent: 'white vinegar solution' })
    const result = runSafetyFilter(card, 'hard water', 'glass')
    expect(result.safe).toBe(true)
  })

  test('does NOT block acid in warning context', () => {
    const card = makeCard({
      instruction: 'Never use vinegar on this surface as it is harmful and will etch the stone. Instead use a pH-neutral cleaner.',
    })
    const result = runSafetyFilter(card, 'hard water', 'marble')
    // The term appears after "Never use" — warning context, should not trigger
    expect(result.safe).toBe(true)
  })
})

// =====================================================
// RULE 4: Acetone on acetate (NUCLEAR BLOCK)
// =====================================================

describe('RULE 4: Acetone on acetate — NUCLEAR', () => {
  test('blocks acetone on acetate fabric', () => {
    const card = makeCard({ agent: 'acetone' })
    const result = runSafetyFilter(card, 'nail polish', 'acetate')
    expect(result.safe).toBe(false)
    expect(result.violations.some(v => v.rule.includes('RULE-4'))).toBe(true)
  })

  test('blocks nail polish remover on triacetate', () => {
    const card = makeCard({ instruction: 'Dab with nail polish remover.' })
    const result = runSafetyFilter(card, 'nail polish', 'triacetate')
    expect(result.safe).toBe(false)
  })

  test('does NOT block acetone on cotton', () => {
    const card = makeCard({ agent: 'acetone' })
    const result = runSafetyFilter(card, 'nail polish', 'cotton')
    expect(result.safe).toBe(true)
  })
})

// =====================================================
// RULE 5: Chlorine bleach on silk/wool
// =====================================================

describe('RULE 5: Chlorine bleach on silk/wool', () => {
  test('replaces chlorine bleach on silk', () => {
    const card = makeCard({ agent: 'chlorine bleach diluted 1:10' })
    const result = runSafetyFilter(card, 'mildew', 'silk')
    expect(result.safe).toBe(true)
    expect(result.filtered).toBe(true)
    expect(result.card.spottingProtocol[0].agent).toContain('oxygen-based cleaner')
  })

  test('replaces clorox on wool', () => {
    const card = makeCard({ agent: 'Clorox solution' })
    const result = runSafetyFilter(card, 'mold', 'wool')
    expect(result.filtered).toBe(true)
    expect(result.card.spottingProtocol[0].agent).toContain('oxygen-based cleaner')
  })

  test('replaces sodium hypochlorite on merino', () => {
    const card = makeCard({ instruction: 'Treat with sodium hypochlorite at 3%.' })
    const result = runSafetyFilter(card, 'dye', 'merino wool')
    expect(result.filtered).toBe(true)
    expect(result.card.spottingProtocol[0].instruction).toContain('oxygen-based cleaner')
  })
})

// =====================================================
// RULE 6: Flood/saturate wood
// =====================================================

describe('RULE 6: Flood/saturate wood', () => {
  test('replaces soak on hardwood', () => {
    const card = makeCard({ instruction: 'Soak the area with cleaning solution.' })
    const result = runSafetyFilter(card, 'wine', 'hardwood floor')
    expect(result.safe).toBe(true)
    expect(result.filtered).toBe(true)
    expect(result.card.spottingProtocol[0].instruction).toContain('apply sparingly')
  })

  test('replaces saturate on wood', () => {
    const card = makeCard({ agent: 'saturate with hydrogen peroxide' })
    const result = runSafetyFilter(card, 'blood', 'wood table')
    // Note: blood is protein, so RULE-1 may also fire if "hot water" present
    const rule6 = result.violations.filter(v => v.rule.includes('RULE-6'))
    expect(rule6.length).toBeGreaterThan(0)
    expect(result.card.spottingProtocol[0].agent).toContain('apply sparingly')
  })

  test('replaces flood in homeSolutions', () => {
    const card = makeCard({ homeSolutions: ['Flood the stain with warm soapy water.'] })
    const result = runSafetyFilter(card, 'ink', 'wood')
    expect(result.filtered).toBe(true)
    expect(result.card.homeSolutions[0]).toContain('apply sparingly')
  })
})

// =====================================================
// Warning context (cross-cutting)
// =====================================================

describe('Warning context detection', () => {
  test('does NOT flag terms used in warnings (never, avoid, do not)', () => {
    const card = makeCard({
      instruction: 'Important: Never use hot water on this protein stain. Use cold water instead.',
    })
    const result = runSafetyFilter(card, 'blood', 'cotton')
    // "hot water" appears but preceded by "Never use" — warning context
    const rule1 = result.violations.filter(v => v.rule.includes('RULE-1'))
    expect(rule1).toHaveLength(0)
  })

  test('does NOT flag enzyme in "avoid enzyme" context on silk', () => {
    const card = makeCard({
      instruction: 'Do not use enzyme cleaners on silk — they digest the protein fiber. Use a pH-neutral spotter.',
    })
    const result = runSafetyFilter(card, 'wine', 'silk')
    const rule2 = result.violations.filter(v => v.rule.includes('RULE-2'))
    expect(rule2).toHaveLength(0)
  })
})

// =====================================================
// Combined scenarios
// =====================================================

describe('Combined scenarios', () => {
  test('blood on silk: RULE-1 (protein+hot water) + RULE-2 (enzyme+silk) both fire', () => {
    const card = makeCard({
      spottingProtocol: [
        { step: 1, agent: 'enzyme cleaner', technique: 'soak', instruction: 'Soak in hot water with enzyme.' },
        { step: 2, agent: 'dish soap', technique: 'blot', instruction: 'Blot gently.' },
      ],
    })
    const result = runSafetyFilter(card, 'blood', 'silk blouse')
    expect(result.safe).toBe(true)
    expect(result.filtered).toBe(true)
    // Both rules should have fired
    const rules = result.violations.map(v => v.rule)
    expect(rules.some(r => r.includes('RULE-1'))).toBe(true)
    expect(rules.some(r => r.includes('RULE-2'))).toBe(true)
    // Verify replacements
    expect(result.card.spottingProtocol[0].agent).toContain('pH-neutral protein spotter')
    expect(result.card.spottingProtocol[0].instruction).toContain('cold water')
    expect(result.card.spottingProtocol[0].instruction).not.toContain('hot water')
  })

  test('clean card passes through untouched', () => {
    const card = makeCard({
      agent: 'dish soap in cold water',
      instruction: 'Blot gently with a clean cloth.',
    })
    const result = runSafetyFilter(card, 'coffee', 'cotton')
    expect(result.safe).toBe(true)
    expect(result.filtered).toBe(false)
    expect(result.violations).toHaveLength(0)
  })

  test('original card is NOT mutated (deep clone)', () => {
    const card = makeCard({ agent: 'hot water' })
    const originalAgent = card.spottingProtocol[0].agent
    runSafetyFilter(card, 'blood', 'cotton')
    expect(card.spottingProtocol[0].agent).toBe(originalAgent)
  })

  test('escalation object with whatToTell is scanned', () => {
    const card = makeCard({
      escalation: { when: 'Always', whatToTell: 'Use vinegar to clean.', specialistType: 'Cleaner' },
    })
    const result = runSafetyFilter(card, 'hard water', 'marble')
    expect(result.safe).toBe(false) // nuclear — acid on marble
  })

  test('materialWarnings are flagged but not replaced', () => {
    const card = makeCard({
      materialWarnings: ['Use enzyme cleaner for best results.'],
    })
    const result = runSafetyFilter(card, 'wine', 'silk')
    // Should flag but materialWarnings is not replaceable
    const rule2 = result.violations.filter(v => v.rule.includes('RULE-2'))
    expect(rule2.length).toBeGreaterThan(0)
    // The warning text remains unchanged (flagged, not replaced)
  })
})

// =====================================================
// SAFE_FALLBACK structure validation
// =====================================================

describe('SAFE_FALLBACK', () => {
  test('has required fields', () => {
    expect(SAFE_FALLBACK.title).toBe('Professional Assessment Required')
    expect(SAFE_FALLBACK._safetyBlocked).toBe(true)
    expect(SAFE_FALLBACK.spottingProtocol).toHaveLength(4)
    expect(SAFE_FALLBACK.meta.tier).toBe('safety-blocked')
  })
})
