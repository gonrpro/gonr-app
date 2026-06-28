import { CONSUMER_CARDS_PHASE0 } from '@/lib/consumer-cards/cards'
import { classify, isCardRenderable, SAFETY_FILTER_VERSION, SAFETY_RULES_PHASE0 } from '@/lib/consumer-safety/classifier'
import {
  containsProLanguage,
  isProtectionOnlySafeFirstMove,
  normalizeInput,
  severity,
  unsupportedClaimInConsumerSteps,
} from '@/lib/consumer-safety/helpers'
import type { ConsumerCard, SolveInput } from '@/lib/consumer-safety/types'

function base(overrides: Partial<SolveInput> = {}): SolveInput {
  return {
    stainDescription: 'fresh blood on washable cotton',
    stainType: 'protein',
    material: 'cotton',
    careStatus: 'machine_washable',
    heatExposure: 'none',
    colorfastness: 'colorfast',
    stainAge: 'fresh',
    priorTreatment: [],
    itemValue: 'everyday',
    ...overrides,
  }
}

const byId = new Map(SAFETY_RULES_PHASE0.map((rule) => [rule.id, rule]))

describe('GONR consumer Phase 0 classifier T1-T15', () => {
  it('T1 resolves to the most severe floor when multiple rules fire', () => {
    const verdict = classify(
      base({
        stainDescription: 'coffee on wool and I used ammonia',
        stainType: 'tannin',
        material: 'wool',
        priorTreatment: ['ammonia'],
      }),
    )

    expect(verdict.triggeredRules).toContain('SB-HS-005-alkali-on-tannin')
    expect(verdict.triggeredRules).toContain('SB-HS-017-wool-floor')
    expect(verdict.verdict).toBe('do_not_attempt')
  })

  it('T2 does not soften a hard-stop with any DIY card present', () => {
    const verdict = classify(
      base({
        stainDescription: 'enzyme detergent on silk',
        material: 'silk',
        priorTreatment: ['enzyme detergent'],
      }),
    )
    const diyCard = CONSUMER_CARDS_PHASE0.find((card) => card.id === 'consumer-blood-cotton-fresh')

    expect(verdict.verdict).toBe('do_not_attempt')
    expect(verdict.card).toBeNull()
    expect(diyCard && isCardRenderable(diyCard, verdict)).toBe(false)
  })

  it('T3 default-denies when no reviewed Phase 0 card matches', () => {
    const verdict = classify(
      base({
        stainDescription: 'unknown residue on washable cotton',
        stainType: 'unknown',
      }),
    )

    expect(verdict.verdict).toBe('stop_use_pro')
    expect(verdict.confidence).toBe('low')
    expect(verdict.requiresReferral).toBe(true)
  })

  it('keeps an explicit unknown stain fail-closed even when the description has a keyword', () => {
    const verdict = classify(
      base({
        stainDescription: 'coffee-colored mark on washable cotton',
        stainType: 'unknown',
      }),
    )

    expect(verdict.verdict).toBe('stop_use_pro')
    expect(verdict.card).toBeNull()
    expect(verdict.requiresReferral).toBe(true)
  })

  it('T4 unknowns floor up to stop/pro with low confidence', () => {
    const verdict = classify(base({ material: 'unknown' }))

    expect(verdict.triggeredRules).toContain('SB-CS-013-unknown-material-care-or-colorfastness')
    expect(verdict.verdict).toBe('stop_use_pro')
    expect(verdict.confidence).toBe('low')
    expect(verdict.requiresReferral).toBe(true)
  })

  it('T5 sensitive-material floors fire without a chemical mention', () => {
    const verdict = classify(
      base({
        stainDescription: 'coffee on silk blouse',
        stainType: 'tannin',
        material: 'silk',
      }),
    )

    expect(severity(verdict.verdict)).toBeGreaterThanOrEqual(severity('stop_use_pro'))
    expect(verdict.triggeredRules).toContain('SB-HS-016-silk-floor')
    expect(verdict.card).toBeNull()
    expect(verdict.referral.emphasize).toBe(true)
  })

  it('T6 implements all 19 SB rules with representative matches and near misses', () => {
    expect(SAFETY_RULES_PHASE0).toHaveLength(19)

    const cases: Array<[string, SolveInput, SolveInput]> = [
      ['SB-HS-001-acetone-on-acetate', base({ material: 'acetate', priorTreatment: ['acetone'] }), base({ material: 'cotton', priorTreatment: ['acetone'] })],
      ['SB-HS-002-enzyme-on-silk-wool', base({ material: 'silk', priorTreatment: ['enzyme detergent'] }), base({ material: 'cotton', priorTreatment: ['enzyme detergent'] })],
      ['SB-HS-003-chlorine-bleach-sensitive-or-colored', base({ material: 'nylon', priorTreatment: ['chlorine bleach'] }), base({ material: 'cotton', colorfastness: 'colorfast', priorTreatment: ['chlorine bleach'] })],
      ['SB-HS-004-peroxide-oxygen-bleach-on-silk', base({ material: 'silk', priorTreatment: ['peroxide'] }), base({ material: 'cotton', priorTreatment: ['peroxide'] })],
      ['SB-HS-005-alkali-on-tannin', base({ stainDescription: 'coffee', stainType: 'tannin', priorTreatment: ['ammonia'] }), base({ stainType: 'protein', priorTreatment: ['ammonia'] })],
      ['SB-HS-006-unknown-or-aniline-leather-wet-soap-solvent', base({ material: 'leather', priorTreatment: ['water'] }), base({ material: 'cotton', priorTreatment: ['water'] })],
      ['SB-HS-007-suede-water-solvent', base({ material: 'suede', priorTreatment: ['water'] }), base({ material: 'cotton', priorTreatment: ['water'] })],
      ['SB-HS-008-dry-clean-only-home-wet-treatment', base({ careStatus: 'dry_clean_only', priorTreatment: ['water'] }), base({ careStatus: 'machine_washable', priorTreatment: ['water'] })],
      ['SB-HS-009-dye-ink-default-referral', base({ stainDescription: 'dye transfer', stainType: 'dye' }), base({ stainDescription: 'coffee', stainType: 'tannin' })],
      ['SB-HS-010-rust-mineral-default-referral', base({ stainDescription: 'rust stain', stainType: 'rust_mineral' }), base({ stainDescription: 'coffee', stainType: 'tannin' })],
      ['SB-HS-016-silk-floor', base({ material: 'silk' }), base({ material: 'cotton' })],
      ['SB-HS-017-wool-floor', base({ material: 'wool' }), base({ material: 'cotton' })],
      ['SB-HS-018-leather-floor', base({ material: 'leather' }), base({ material: 'cotton' })],
      ['SB-HS-019-suede-floor', base({ material: 'suede' }), base({ material: 'cotton' })],
      ['SB-CS-011-heat-on-protein', base({ heatExposure: 'machine_dried' }), base({ heatExposure: 'none' })],
      ['SB-CS-012-fresh-protein-cold-only', base(), base({ material: 'silk' })],
      ['SB-CS-013-unknown-material-care-or-colorfastness', base({ colorfastness: 'unknown' }), base()],
      ['SB-CS-014-rayon-wet-risk', base({ material: 'rayon_viscose', priorTreatment: ['soak'] }), base({ material: 'cotton', priorTreatment: ['soak'] })],
      ['SB-CS-015-valuable-or-sentimental', base({ itemValue: 'valuable' }), base({ itemValue: 'everyday' })],
    ]

    for (const [id, hit, miss] of cases) {
      const rule = byId.get(id)
      expect(rule, id).toBeDefined()
      expect(rule?.match(normalizeInput(hit)), `${id} should match`).toBe(true)
      expect(rule?.match(normalizeInput(miss)), `${id} should not match near miss`).toBe(false)
    }
  })

  it('T7 excludes cards with no source support', () => {
    const verdict = classify(base())
    const card: ConsumerCard = { ...CONSUMER_CARDS_PHASE0[0], sourceSupport: 'no' }

    expect(isCardRenderable(card, verdict)).toBe(false)
  })

  it('T8 excludes a card less cautious than the classifier floor', () => {
    const verdict = classify(base({ material: 'silk' }))
    const diyCard = CONSUMER_CARDS_PHASE0.find((card) => card.id === 'consumer-blood-cotton-fresh')

    expect(diyCard && isCardRenderable(diyCard, verdict)).toBe(false)
  })

  it('T9 never renders treatment cards for stop/pro or do-not-attempt verdicts', () => {
    const stopVerdict = classify(base({ material: 'silk' }))
    const dnaVerdict = classify(base({ material: 'acetate', priorTreatment: ['acetone'] }))
    const stopCard = CONSUMER_CARDS_PHASE0.find((card) => card.id === 'consumer-silk-any-protein-dye')

    expect(stopVerdict.verdict).toBe('stop_use_pro')
    expect(dnaVerdict.verdict).toBe('do_not_attempt')
    expect(stopCard && isCardRenderable(stopCard, stopVerdict)).toBe(false)
    expect(stopCard && isCardRenderable(stopCard, dnaVerdict)).toBe(false)
  })

  it('T10 excludes cards with pro-only language in consumer copy', () => {
    const card: ConsumerCard = {
      ...CONSUMER_CARDS_PHASE0[0],
      safeSteps: ['Apply POG on the spotting board.'],
    }

    expect(containsProLanguage(card)).toBe(true)
    expect(isCardRenderable(card, classify(base()))).toBe(false)
  })

  it('T11 excludes partial-source cards with unsupported consumer steps', () => {
    const card: ConsumerCard = {
      ...CONSUMER_CARDS_PHASE0[4],
      sourceSupport: 'partial',
      unsupportedConsumerStepClaims: true,
    }

    expect(unsupportedClaimInConsumerSteps(card)).toBe(true)
    expect(isCardRenderable(card, classify(base({ stainDescription: 'red wine on cotton', stainType: 'tannin' })))).toBe(false)
  })

  it('reconciles card source wiring without private source-label leakage', () => {
    expect(CONSUMER_CARDS_PHASE0).toHaveLength(21)
    expect(CONSUMER_CARDS_PHASE0.some((card) => card.id === 'consumer-cooking-oil-polyester')).toBe(false)
    expect(CONSUMER_CARDS_PHASE0.filter((card) => card.sourceSupport === 'partial')).toHaveLength(1)

    const internalSourcePattern =
      /ops-vault|lab-bridge|GONR-MATERIAL-SAFETY-MATRIX|Protocol Factory|Card Presentation Standard|STAIN_|RULE-\d|Material Safety Matrix|~\/|^SB\s/i

    for (const card of CONSUMER_CARDS_PHASE0) {
      expect(card.sources.length, `${card.id} should carry opaque source evidence IDs`).toBeGreaterThan(0)
      expect(card.publishReady, `${card.id} stays blocked from publish trust`).toBe(false)
      expect(card.safeSteps.length > 0 || card.maxVerdict !== 'diy_with_constraints', `${card.id} must not be stepless DIY`).toBe(true)

      if (card.sourceSupport === 'partial' && card.maxVerdict === 'diy_with_constraints') {
        expect(card.unsupportedConsumerStepClaims, `${card.id} partial DIY fixture should be render-blocked`).toBe(true)
      }

      for (const source of card.sources) {
        expect(source.label, `${card.id} source label should not expose internal source paths or filenames`).not.toMatch(internalSourcePattern)
      }
    }

    expect(CONSUMER_CARDS_PHASE0.find((card) => card.id === 'consumer-dye-transfer-any')?.proChemistryInSource).toBe(true)
    expect(CONSUMER_CARDS_PHASE0.find((card) => card.id === 'consumer-dye-transfer-any')?.sources.length).toBeGreaterThan(0)
    expect(CONSUMER_CARDS_PHASE0.find((card) => card.id === 'consumer-rust-any')?.proChemistryInSource).toBe(true)
    expect(CONSUMER_CARDS_PHASE0.find((card) => card.id === 'consumer-rust-any')?.sources.length).toBeGreaterThan(0)
    expect(CONSUMER_CARDS_PHASE0.find((card) => card.id === 'consumer-rust-any')?.unsupportedConsumerStepClaims).toBe(false)
  })

  it('renders an educational grass-on-denim card with real first move and product guidance', () => {
    const verdict = classify(
      base({
        stainDescription: 'grass stain on blue jeans',
        stainType: undefined,
        material: 'denim',
        careStatus: 'machine_washable',
        heatExposure: 'none',
        colorfastness: 'colorfast',
        stainAge: 'fresh',
      }),
    )
    const card = CONSUMER_CARDS_PHASE0.find((item) => item.id === verdict.card)

    expect(verdict.verdict).toBe('diy_with_constraints')
    expect(verdict.card).toBe('consumer-grass-denim')
    expect(verdict.safeFirstMove).toContain('Lift loose grass')
    expect(card?.mechanism).toContain('chlorophyll pigment')
    expect(card?.knowledgeBullets?.length).toBeGreaterThanOrEqual(3)
    expect(card?.productGuidance?.map((product) => product.name)).toEqual([
      'Mild liquid dish soap',
      '70% isopropyl alcohol',
      'Oxygen cleaner',
    ])
  })

  it('T12 guarantees referral for stop/pro, do-not-attempt, and low-confidence verdicts', () => {
    const verdicts = [
      classify(base({ material: 'silk' })),
      classify(base({ material: 'acetate', priorTreatment: ['acetone'] })),
      classify(base({ material: 'unknown' })),
    ]

    for (const verdict of verdicts) {
      expect(verdict.requiresReferral).toBe(true)
      expect(verdict.referral.emphasize).toBe(true)
    }
  })

  it('T13 keeps stop/pro and do-not-attempt safeFirstMove protection-only', () => {
    const verdict = classify(base({ material: 'silk' }))

    expect(isProtectionOnlySafeFirstMove(verdict.verdict, verdict.safeFirstMove)).toBe(true)
    expect(isProtectionOnlySafeFirstMove('stop_use_pro', 'Blot with detergent and rinse.')).toBe(false)
  })

  it('T14 populates blockedActions for every non-DIY verdict', () => {
    const verdict = classify(base({ material: 'unknown' }))

    expect(verdict.verdict).toBe('stop_use_pro')
    expect(verdict.blockedActions.length).toBeGreaterThan(0)
    expect(verdict.blockedActions).toContain('heat')
  })

  it('T15 stamps every verdict with the safety filter version', () => {
    expect(classify(base()).safetyFilterVersion).toBe(SAFETY_FILTER_VERSION)
    expect(classify(base({ material: 'acetate', priorTreatment: ['acetone'] })).safetyFilterVersion).toBe(SAFETY_FILTER_VERSION)
  })

  it('orders stop-causing reasons before lower DIY constraints', () => {
    const verdict = classify(base({ priorTreatment: ['bleach'] }))

    expect(verdict.verdict).toBe('stop_use_pro')
    expect(verdict.triggeredRules[0]).toBe('SB-POLICY-prior-bleach')
    expect(verdict.reasons[0]).toContain('Prior bleach use')
  })

  it('routes SB-passed common-stain cards inside shared stain families', () => {
    const redWine = classify(base({ stainDescription: 'red wine on cotton', stainType: 'tannin' }))
    const sweat = classify(base({ stainDescription: 'sweat on white cotton', stainType: 'protein' }))
    const urine = classify(base({ stainDescription: 'urine on washable cotton', stainType: 'protein' }))

    expect(redWine.verdict).toBe('diy_with_constraints')
    expect(redWine.card).toBe('consumer-red-wine-cotton')
    expect(classify(base({ stainDescription: 'tea on cotton', stainType: 'tannin' })).card).toBe('consumer-tea-cotton')
    expect(sweat.verdict).toBe('diy_with_constraints')
    expect(sweat.card).toBe('consumer-sweat-white-cotton')
    expect(urine.verdict).toBe('diy_with_constraints')
    expect(urine.card).toBe('consumer-urine-cotton')
    expect(classify(base({ stainDescription: 'tea on cotton, not coffee', stainType: 'tannin' })).card).toBe('consumer-tea-cotton')
    expect(classify(base({ stainDescription: 'black coffee on cotton, not tea', stainType: 'tannin' })).card).toBe('consumer-coffee-cotton-black')
  })

  it('renders advice for Tyler screenshot case: red wine on washable white cotton', () => {
    const verdict = classify(
      base({
        stainDescription: 'red wine on white cotton shirt',
        stainType: undefined,
        material: 'cotton',
        careStatus: 'machine_washable',
        heatExposure: 'none',
        colorfastness: 'colorfast',
        stainAge: 'fresh',
      }),
    )

    expect(verdict.verdict).toBe('diy_with_constraints')
    expect(verdict.card).toBe('consumer-red-wine-cotton')
    expect(verdict.requiresReferral).toBe(false)
    expect(verdict.safeFirstMove).toBe('Blot up liquid immediately.')
  })

  it('falls through to source-backed stop cards when exact candidates have no keyword hit', () => {
    const leather = classify(base({ stainDescription: 'unknown mark', stainType: 'mixed_unknown', material: 'leather' }))
    const dye = classify(base({ stainDescription: 'mystery color issue', stainType: 'dye' }))
    const rust = classify(base({ stainDescription: 'orange mark', stainType: 'rust_mineral' }))

    expect(leather.verdict).toBe('stop_use_pro')
    expect(leather.confidence).toBe('medium')
    expect(dye.verdict).toBe('stop_use_pro')
    expect(dye.confidence).toBe('medium')
    expect(rust.verdict).toBe('stop_use_pro')
    expect(rust.confidence).toBe('low')
  })

  it('fails closed for unsupported stains inside reviewed broad families', () => {
    const milk = classify(base({ stainDescription: 'milk on cotton', stainType: 'protein' }))
    const makeup = classify(base({ stainDescription: 'makeup on cotton', stainType: 'oil_grease' }))
    const motorOil = classify(base({ stainDescription: 'motor oil on cotton', stainType: 'oil_grease' }))
    const cookingOilPolyester = classify(base({ stainDescription: 'cooking oil on polyester', stainType: 'oil_grease', material: 'polyester' }))

    expect(milk.verdict).toBe('stop_use_pro')
    expect(milk.card).toBeNull()
    expect(milk.triggeredRules).toContain('SB-POLICY-no-reviewed-card')
    expect(makeup.verdict).toBe('stop_use_pro')
    expect(makeup.card).toBeNull()
    expect(motorOil.verdict).toBe('stop_use_pro')
    expect(motorOil.card).toBeNull()
    expect(cookingOilPolyester.verdict).toBe('stop_use_pro')
    expect(cookingOilPolyester.card).toBeNull()
  })

  it('does not trigger safety keywords inside unrelated words', () => {
    const mud = classify(base({ stainDescription: 'crusted mud on denim', stainType: 'particulate', material: 'denim' }))
    const polyesterCoffee = classify(base({ stainDescription: 'coffee on polyester shirt', stainType: 'tannin', material: 'polyester' }))

    expect(mud.triggeredRules).not.toContain('SB-HS-010-rust-mineral-default-referral')
    expect(mud.card).toBe('consumer-mud-denim')
    expect(mud.verdict).toBe('diy_with_constraints')
    expect(polyesterCoffee.triggeredRules).not.toContain('SB-HS-005-alkali-on-tannin')
    expect(polyesterCoffee.verdict).not.toBe('do_not_attempt')
  })

  it('does not render fresh protein guidance for stale protein stains', () => {
    const verdict = classify(base({ stainDescription: 'blood on cotton', stainType: 'protein', stainAge: 'set_in' }))

    expect(verdict.verdict).toBe('stop_use_pro')
    expect(verdict.card).toBeNull()
    expect(verdict.triggeredRules).not.toContain('SB-CS-012-fresh-protein-cold-only')
  })

  it('blocks protein DIY when prior heat is only mentioned in details', () => {
    const machineDried = classify(base({ stainDescription: 'machine-dried blood on washable cotton' }))
    const unicodeDash = classify(base({ stainDescription: 'machine\u2011dried blood on washable cotton' }))
    const hotWater = classify(base({ stainDescription: 'fresh blood on washable cotton; used hot water' }))
    const noHotWater = classify(base({ stainDescription: 'fresh blood on washable cotton; no hot water used' }))
    const smartNoHotWater = classify(base({ stainDescription: 'fresh blood on washable cotton; don\u2019t use hot water' }))
    const didNotIron = classify(base({ stainDescription: "fresh blood on washable cotton; didn't iron it" }))
    const unknownHeat = classify(base({ heatExposure: 'unknown' }))

    expect(machineDried.verdict).toBe('stop_use_pro')
    expect(machineDried.triggeredRules).toContain('SB-CS-011-heat-on-protein')
    expect(machineDried.triggeredRules).not.toContain('SB-CS-012-fresh-protein-cold-only')
    expect(machineDried.card).toBeNull()
    expect(unicodeDash.verdict).toBe('stop_use_pro')
    expect(unicodeDash.triggeredRules).toContain('SB-CS-011-heat-on-protein')
    expect(unicodeDash.card).toBeNull()
    expect(hotWater.verdict).toBe('stop_use_pro')
    expect(hotWater.triggeredRules).toContain('SB-CS-011-heat-on-protein')
    expect(hotWater.card).toBeNull()
    expect(noHotWater.verdict).toBe('diy_with_constraints')
    expect(noHotWater.triggeredRules).toContain('SB-CS-012-fresh-protein-cold-only')
    expect(smartNoHotWater.verdict).toBe('diy_with_constraints')
    expect(smartNoHotWater.triggeredRules).toContain('SB-CS-012-fresh-protein-cold-only')
    expect(didNotIron.verdict).toBe('diy_with_constraints')
    expect(didNotIron.triggeredRules).toContain('SB-CS-012-fresh-protein-cold-only')
    expect(didNotIron.triggeredRules).not.toContain('SB-CS-011-heat-on-protein')
    expect(unknownHeat.verdict).toBe('stop_use_pro')
    expect(unknownHeat.triggeredRules).toContain('SB-CS-011-heat-on-protein')
    expect(unknownHeat.card).toBeNull()
  })

  it('blocks DIY cards for non-protein stains after prior heat exposure', () => {
    const verdict = classify(
      base({
        stainDescription: 'black coffee on washable cotton',
        stainType: 'tannin',
        heatExposure: 'machine_dried',
      }),
    )
    const typedHeat = classify(base({ stainDescription: 'machine-dried black coffee on washable cotton', stainType: undefined }))
    const unicodeHeat = classify(base({ stainDescription: 'tumble\u2013dried black coffee on washable cotton', stainType: undefined }))
    const negatedHeat = classify(base({ stainDescription: 'black coffee on washable cotton; no hot water used', stainType: undefined }))
    const unknownHeat = classify(base({ stainDescription: 'black coffee on washable cotton', stainType: 'tannin', heatExposure: 'unknown' }))

    expect(verdict.verdict).toBe('stop_use_pro')
    expect(verdict.confidence).toBe('low')
    expect(verdict.requiresReferral).toBe(true)
    expect(verdict.card).toBeNull()
    expect(isProtectionOnlySafeFirstMove(verdict.verdict, verdict.safeFirstMove)).toBe(true)
    expect(typedHeat.verdict).toBe('stop_use_pro')
    expect(typedHeat.card).toBeNull()
    expect(typedHeat.requiresReferral).toBe(true)
    expect(unicodeHeat.verdict).toBe('stop_use_pro')
    expect(unicodeHeat.card).toBeNull()
    expect(negatedHeat.verdict).toBe('diy_with_constraints')
    expect(negatedHeat.card).toBe('consumer-coffee-cotton-black')
    expect(unknownHeat.verdict).toBe('stop_use_pro')
    expect(unknownHeat.card).toBeNull()
  })

  it('keeps the coffee protocol candidate visible when only confirmable facts are missing', () => {
    const verdict = classify(
      base({
        stainDescription: 'Coffee on white cotton pants',
        stainType: undefined,
        careStatus: 'unknown',
        heatExposure: 'unknown',
        colorfastness: 'colorfast',
        stainAge: 'unknown',
      }),
    )

    expect(verdict.verdict).toBe('stop_use_pro')
    expect(verdict.card).toBeNull()
    expect(verdict.candidateCard).toBe('consumer-coffee-cotton-black')
    expect(verdict.missingFacts).toEqual(['care label allows washing', 'no warm water, dryer, or iron has touched it'])
  })

  it('shows source-backed coffee protocol steps once washable and no-heat facts are confirmed', () => {
    const verdict = classify(
      base({
        stainDescription: 'Coffee on white cotton pants',
        stainType: undefined,
        careStatus: 'machine_washable',
        heatExposure: 'none',
        colorfastness: 'colorfast',
        stainAge: 'unknown',
      }),
    )
    const card = CONSUMER_CARDS_PHASE0.find((item) => item.id === verdict.card)

    expect(verdict.verdict).toBe('diy_with_constraints')
    expect(verdict.card).toBe('consumer-coffee-cotton-black')
    expect(verdict.constraints).toEqual([
      'No ammonia, baking soda, or alkaline cleaners.',
      'No chlorine bleach in this first-step protocol.',
      'No dryer or iron until the stain is gone.',
    ])
    expect(card?.protocolName).toContain('Cool-water tannin flush')
    expect(card?.mechanism).toContain('Coffee is a tannin-rich')
  })

  it('classifies unsupported mixed-stain fixtures before generic protein or tannin keywords, then blocks them', () => {
    const verdict = classify(base({ stainDescription: 'coffee with cream on cotton', stainType: undefined }))

    expect(verdict.card).toBe('consumer-coffee-with-cream-cotton')
    expect(verdict.verdict).toBe('diy_with_constraints')
  })

  it('preserves mixed stain components for safety floors', () => {
    const alkaliMixed = classify(base({ stainDescription: 'coffee with cream on cotton', stainType: undefined, priorTreatment: ['baking soda'] }))
    const heatedChocolate = classify(base({ stainDescription: 'machine-dried chocolate on cotton', stainType: undefined, heatExposure: 'machine_dried' }))
    const explicitTanninWithCream = classify(base({ stainDescription: 'machine-dried coffee with cream on cotton', stainType: 'tannin', heatExposure: 'machine_dried' }))
    const oilWithTannin = classify(base({ stainDescription: 'olive oil and red wine on cotton', stainType: undefined, priorTreatment: ['baking soda'] }))

    expect(alkaliMixed.verdict).toBe('do_not_attempt')
    expect(alkaliMixed.triggeredRules).toContain('SB-HS-005-alkali-on-tannin')
    expect(heatedChocolate.verdict).toBe('stop_use_pro')
    expect(heatedChocolate.triggeredRules).toContain('SB-CS-011-heat-on-protein')
    expect(explicitTanninWithCream.verdict).toBe('stop_use_pro')
    expect(explicitTanninWithCream.triggeredRules).toContain('SB-CS-011-heat-on-protein')
    expect(explicitTanninWithCream.card).toBeNull()
    expect(oilWithTannin.verdict).toBe('do_not_attempt')
    expect(oilWithTannin.triggeredRules).toContain('SB-HS-005-alkali-on-tannin')
    expect(oilWithTannin.card).toBeNull()
  })

  it('fails closed for unsupported mixed stain families without selecting one component card', () => {
    const inferred = classify(base({ stainDescription: 'olive oil and red wine on cotton', stainType: undefined }))
    const explicitOil = classify(base({ stainDescription: 'olive oil and red wine on cotton', stainType: 'oil_grease' }))
    const reviewedMixed = classify(base({ stainDescription: 'coffee with cream on cotton', stainType: 'tannin' }))

    expect(inferred.verdict).toBe('stop_use_pro')
    expect(inferred.card).toBeNull()
    expect(explicitOil.verdict).toBe('stop_use_pro')
    expect(explicitOil.card).toBeNull()
    expect(reviewedMixed.verdict).toBe('diy_with_constraints')
    expect(reviewedMixed.card).toBe('consumer-coffee-with-cream-cotton')
  })

  it('treats the UI bleach chip as chlorine bleach for sensitive and unstable items', () => {
    const verdict = classify(base({ material: 'nylon', priorTreatment: ['bleach'] }))

    expect(verdict.verdict).toBe('do_not_attempt')
    expect(verdict.triggeredRules).toContain('SB-HS-003-chlorine-bleach-sensitive-or-colored')
  })

  it('treats typed bleach as chlorine bleach for sensitive and unstable items', () => {
    const verdict = classify(base({ stainDescription: 'used bleach on nylon shirt', material: 'nylon' }))

    expect(verdict.verdict).toBe('do_not_attempt')
    expect(verdict.triggeredRules).toContain('SB-HS-003-chlorine-bleach-sensitive-or-colored')
  })

  it('treats chlorine-bleach brand names as bleach exposure', () => {
    const sensitive = classify(base({ stainDescription: 'blood on nylon shirt; used Clorox', material: 'nylon' }))
    const colorfastCotton = classify(base({ stainDescription: 'fresh blood on colorfast cotton; used Clorox' }))

    expect(sensitive.verdict).toBe('do_not_attempt')
    expect(sensitive.triggeredRules).toContain('SB-HS-003-chlorine-bleach-sensitive-or-colored')
    expect(colorfastCotton.verdict).toBe('stop_use_pro')
    expect(colorfastCotton.triggeredRules).toContain('SB-POLICY-prior-bleach')
    expect(colorfastCotton.card).toBeNull()
  })

  it('does not treat non-chlorine bleach wording as chlorine bleach', () => {
    const verdict = classify(base({ stainDescription: 'used non-chlorine bleach on nylon shirt', material: 'nylon' }))

    expect(verdict.verdict).not.toBe('do_not_attempt')
    expect(verdict.triggeredRules).not.toContain('SB-HS-003-chlorine-bleach-sensitive-or-colored')
  })

  it('ignores negated treatment mentions in free text', () => {
    const noAmmonia = classify(base({ stainDescription: 'black coffee on washable cotton; no ammonia used', stainType: undefined }))
    const noBleach = classify(base({ stainDescription: "blood on nylon shirt; didn't use bleach", material: 'nylon' }))
    const smartNoBleach = classify(base({ stainDescription: 'blood on nylon shirt; didn\u2019t use bleach', material: 'nylon' }))
    const didNotBleach = classify(base({ stainDescription: "fresh blood on washable cotton; didn't bleach it" }))
    const ammoniaFree = classify(base({ stainDescription: 'black coffee on washable cotton; ammonia-free cleaner was nearby', stainType: undefined }))
    const bleachFree = classify(base({ stainDescription: 'blood on nylon shirt; used bleach-free detergent', material: 'nylon' }))
    const commaList = classify(base({ stainDescription: 'black coffee on washable cotton; no bleach, ammonia, or peroxide used', stainType: undefined }))
    const didntUseList = classify(base({ stainDescription: "black coffee on washable cotton; didn't use bleach, ammonia", stainType: undefined }))

    expect(noAmmonia.triggeredRules).not.toContain('SB-HS-005-alkali-on-tannin')
    expect(noAmmonia.card).toBe('consumer-coffee-cotton-black')
    expect(noAmmonia.verdict).toBe('diy_with_constraints')
    expect(noBleach.triggeredRules).not.toContain('SB-HS-003-chlorine-bleach-sensitive-or-colored')
    expect(noBleach.triggeredRules).not.toContain('SB-POLICY-prior-bleach')
    expect(noBleach.verdict).not.toBe('do_not_attempt')
    expect(smartNoBleach.triggeredRules).not.toContain('SB-HS-003-chlorine-bleach-sensitive-or-colored')
    expect(smartNoBleach.triggeredRules).not.toContain('SB-POLICY-prior-bleach')
    expect(smartNoBleach.verdict).not.toBe('do_not_attempt')
    expect(didNotBleach.triggeredRules).not.toContain('SB-POLICY-prior-bleach')
    expect(didNotBleach.verdict).toBe('diy_with_constraints')
    expect(didNotBleach.card).toBe('consumer-blood-cotton-fresh')
    expect(ammoniaFree.triggeredRules).not.toContain('SB-HS-005-alkali-on-tannin')
    expect(ammoniaFree.card).toBe('consumer-coffee-cotton-black')
    expect(bleachFree.triggeredRules).not.toContain('SB-HS-003-chlorine-bleach-sensitive-or-colored')
    expect(bleachFree.triggeredRules).not.toContain('SB-POLICY-prior-bleach')
    expect(commaList.triggeredRules).not.toContain('SB-HS-005-alkali-on-tannin')
    expect(commaList.card).toBe('consumer-coffee-cotton-black')
    expect(commaList.verdict).toBe('diy_with_constraints')
    expect(didntUseList.triggeredRules).not.toContain('SB-HS-005-alkali-on-tannin')
    expect(didntUseList.card).toBe('consumer-coffee-cotton-black')
    expect(didntUseList.verdict).toBe('diy_with_constraints')
  })

  it('keeps uncertain treatment mentions conservative', () => {
    const maybeAmmonia = classify(base({ stainDescription: 'black coffee on washable cotton; not sure if ammonia was tried', stainType: undefined }))
    const maybeBleach = classify(base({ stainDescription: 'blood on nylon shirt; not sure if bleach was used', material: 'nylon' }))

    expect(maybeAmmonia.verdict).toBe('do_not_attempt')
    expect(maybeAmmonia.triggeredRules).toContain('SB-HS-005-alkali-on-tannin')
    expect(maybeBleach.verdict).toBe('do_not_attempt')
    expect(maybeBleach.triggeredRules).toContain('SB-HS-003-chlorine-bleach-sensitive-or-colored')
  })

  it('treats not-only phrasing as affirmative chemical use', () => {
    const verdict = classify(base({ stainDescription: 'fresh blood on cotton; not only bleach but ammonia was used' }))

    expect(verdict.verdict).toBe('do_not_attempt')
    expect(verdict.triggeredRules).toContain('SB-POLICY-bleach-mixing')
    expect(verdict.card).toBeNull()
  })

  it('does not route oil phrases with tannin words to tannin cards', () => {
    const verdict = classify(base({ stainDescription: 'tea tree oil on washable cotton', stainType: undefined }))
    const withBakingSoda = classify(base({ stainDescription: 'tea tree oil on washable cotton', stainType: undefined, priorTreatment: ['baking soda'] }))

    expect(verdict.card).toBeNull()
    expect(verdict.verdict).toBe('stop_use_pro')
    expect(withBakingSoda.triggeredRules).not.toContain('SB-HS-005-alkali-on-tannin')
    expect(withBakingSoda.card).toBeNull()
    expect(withBakingSoda.verdict).toBe('stop_use_pro')
  })

  it('only uses Jerry local referral for city markers or ZIP prefixes', () => {
    const outside = classify(base({ material: 'silk', locationText: '33410 Palm Beach Gardens, FL' }))
    const localZip = classify(base({ material: 'silk', locationText: '34102' }))

    expect(outside.referral.options.some((option) => option.kind === 'known_partner')).toBe(false)
    expect(localZip.referral.options.some((option) => option.kind === 'known_partner')).toBe(true)
  })

  it('includes typed prior treatments in cleaner handoff summaries', () => {
    const verdict = classify(base({ stainDescription: 'already used bleach and ammonia on a cotton shirt', priorTreatment: [] }))

    expect(verdict.verdict).toBe('do_not_attempt')
    expect(verdict.referral.handoffSummary).toContain('Prior treatment tried: bleach, ammonia.')
    expect(verdict.referral.handoffSummary).not.toContain('Prior treatment tried: nothing yet.')
  })

  it('covers Phase 0 packet safety examples outside the T-table', () => {
    expect(classify(base({ material: 'silk', stainType: 'oil_grease', stainDescription: 'grease on silk' })).verdict).toBe('stop_use_pro')
    expect(classify(base({ material: 'wool', heatExposure: 'warm_hot_wash' })).verdict).toBe('stop_use_pro')
    expect(classify(base({ material: 'rayon_viscose', priorTreatment: ['soak'] })).verdict).toBe('stop_use_pro')
    expect(classify(base({ material: 'suede', stainType: 'oil_grease', stainDescription: 'oil on suede' })).verdict).toBe('stop_use_pro')
    expect(classify(base({ careStatus: 'dry_clean_only', stainType: 'unknown', stainDescription: '' })).verdict).toBe('stop_use_pro')
    expect(classify(base({ stainType: 'dye', stainDescription: 'dye transfer' })).verdict).toBe('stop_use_pro')
    expect(classify(base({ stainType: 'tannin', stainDescription: 'coffee', priorTreatment: ['baking soda'] })).verdict).toBe('do_not_attempt')
    expect(classify(base({ priorTreatment: ['bleach', 'ammonia'] })).verdict).toBe('do_not_attempt')
  })
})
