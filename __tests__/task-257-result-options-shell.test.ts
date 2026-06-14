import { describe, it, expect } from 'vitest'
import {
  buildResultOptionsShell,
  revealSteps,
  productPassesEvidenceGate,
  passProductEvidenceCard,
  bannedCopyMatch,
  TIER_PRESENTATION,
  type TreatableMethod,
  type HardBlock,
  type ProductEvidenceCard,
  type ConsentState,
  type DiyTier,
  type MethodEvidence,
} from '@/lib/solve/result-options'

// TASK-257 Slice 2 — ResultOptions contract SHELL, policy-fixed v2 (SB binding review + Atlas
// structural review). Contract + policy logic only; not wired into /api/solve; products empty
// until evidence cards.

function method(tier: DiyTier, steps: string[] = ['step a', 'step b']): TreatableMethod {
  const base = {
    methodId: `m:${tier}`,
    stainFamily: 'tannin',
    fabricSurface: 'cotton',
    agentClass: 'household',
    contraindications: [] as string[],
    sourceRefs: ['src:1'],
    concentration: 'n/a',
    dwell: 'n/a',
    attemptLimit: 1,
    proAlternative: 'professional cleaner',
  }
  const evidence: MethodEvidence =
    tier === 'conditional' || tier === 'experimental'
      ? {
          ...base,
          tier,
          warning: 'Specific risk: this can lighten the dye on this fiber.',
          spotTestRequired: true,
          consentCopyVersion: 'v1',
        }
      : { ...base, tier, spotTestRequired: false, consentCopyVersion: 'none' }
  return { evidence, method: 'test method', steps }
}

function consentFor(method: TreatableMethod, flags: ConsentState = {}): ConsentState {
  return {
    methodId: method.evidence.methodId,
    consentCopyVersion: method.evidence.consentCopyVersion === 'none' ? undefined : method.evidence.consentCopyVersion,
    ...flags,
  }
}

const ALL_CONSENT: ConsentState = {
  methodId: 'm:conditional',
  consentCopyVersion: 'v1',
  spotTestAcknowledged: true,
  readRisks: true,
  wantThisOverPro: true,
}

describe('Tier 5 do_not_attempt — non-bypassable hard block', () => {
  it('HardBlock carries NO steps/products/links/ratios/dwell by construction', () => {
    const hb: HardBlock = {
      methodId: 'hb:acetone-acetate',
      stainFamily: 'resin',
      fabricSurface: 'acetate',
      reason: 'Acetone dissolves acetate — it will destroy the fabric.',
      saferAlternative: 'Take it to a professional cleaner.',
      sourceRefs: ['src:acetate'],
    }
    expect(hb).not.toHaveProperty('steps')
    expect(hb).not.toHaveProperty('products')
    expect(hb).not.toHaveProperty('affiliate')
  })
  it('sanitizes hard blocks passed with extra procedure fields', () => {
    const leaky = {
      methodId: 'hb:forced',
      stainFamily: 'mixed',
      fabricSurface: 'silk',
      reason: 'No consumer path.',
      saferAlternative: 'Professional cleaner.',
      sourceRefs: ['src:hard-block'],
      steps: ['mix chemicals'],
      products: ['unsafe product'],
      dwell: '30m',
    } as HardBlock & { steps: string[]; products: string[]; dwell: string }
    const s = buildResultOptionsShell({ stain: 'mixed', surface: 'silk', conservativeMethod: 'stabilize', hardBlocks: [leaky] })
    expect(s.hardBlocks[0]).not.toHaveProperty('steps')
    expect(s.hardBlocks[0]).not.toHaveProperty('products')
    expect(s.hardBlocks[0]).not.toHaveProperty('dwell')
  })
  it('runtime backstop: a force-cast non-DIY tier reveals nothing under full consent/insistence', () => {
    const forced = {
      ...method('conditional'),
      evidence: { ...method('conditional').evidence, tier: 'do_not_attempt' },
    } as unknown as TreatableMethod
    expect(revealSteps(forced, ALL_CONSENT)).toEqual([])
  })
})

describe('Tier 2/3 consent scaffolding (separate from hard block)', () => {
  it('Tier 2 conditional: hidden until spot-test acknowledged', () => {
    const conditional = method('conditional')
    expect(revealSteps(conditional, {})).toEqual([])
    expect(revealSteps(conditional, { spotTestAcknowledged: true })).toEqual([])
    expect(revealSteps(conditional, consentFor(conditional, { spotTestAcknowledged: true }))).toEqual(['step a', 'step b'])
    expect(
      revealSteps(conditional, {
        methodId: 'm:other',
        consentCopyVersion: 'v1',
        spotTestAcknowledged: true,
      }),
    ).toEqual([])
  })
  it('Tier 3 experimental: hidden until BOTH acknowledgments', () => {
    const experimental = method('experimental')
    expect(revealSteps(experimental, {})).toEqual([])
    expect(revealSteps(experimental, consentFor(experimental, { spotTestAcknowledged: true }))).toEqual([])
    expect(revealSteps(experimental, consentFor(experimental, { readRisks: true }))).toEqual([])
    expect(revealSteps(experimental, consentFor(experimental, { readRisks: true, wantThisOverPro: true }))).toEqual([])
    expect(revealSteps(experimental, { spotTestAcknowledged: true, readRisks: true, wantThisOverPro: true })).toEqual([])
    expect(
      revealSteps(experimental, consentFor(experimental, { spotTestAcknowledged: true, readRisks: true, wantThisOverPro: true })),
    ).toEqual([
      'step a',
      'step b',
    ])
  })
  it('Tier 0/1: no consent gate', () => {
    expect(revealSteps(method('stabilize'), {})).toEqual(['step a', 'step b'])
    expect(revealSteps(method('low_risk_when_scoped'), {})).toEqual(['step a', 'step b'])
  })
  it('gated methods carry a specific warning, not boilerplate', () => {
    expect(method('conditional').evidence.warning).toBeTruthy()
    expect(method('experimental').evidence.warning).toBeTruthy()
  })
  it('tier presentation maps consent correctly', () => {
    expect(TIER_PRESENTATION.do_not_attempt).toMatchObject({ consent: 'never', ui: 'hard_block' })
    expect(TIER_PRESENTATION.conditional.consent).toBe('spot_test')
    expect(TIER_PRESENTATION.experimental.consent).toBe('two_step')
    expect(TIER_PRESENTATION.stabilize.consent).toBe('none')
  })
})

describe('Product evidence gate', () => {
  const fullCard: ProductEvidenceCard = {
    name: 'Acme Enzyme Spray',
    manufacturer: 'Acme',
    skuUpc: '012345',
    sizeForm: '16oz spray',
    category: 'enzyme',
    lastVerified: '2026-06-13',
    sdsSource: 'acme.com/sds',
    sdsDate: '2026-01-01',
    ingredients: ['protease', 'surfactant'],
    activeIngredients: [{ name: 'protease', functionClass: 'enzyme', concentration: 'unknown' }],
    workingPh: '7',
    labelWarnings: ['keep away from eyes'],
    stainMechanism: 'protease cleaves protein bonds in the stain',
    fiberCompatibility: [{ fabric: 'cotton', compat: 'safe', basis: 'lab test' }],
    contraindications: [],
    neverRecommendFor: ['silk', 'wool'],
    evidenceQuality: 'independent_test',
    approvedProtocols: [
      { protocolId: 'p:1', stainFamily: 'protein', fabric: 'cotton', tier: 'low_risk_when_scoped', sourceFit: true },
    ],
    reviewOwner: 'SB',
    reviewDate: '2026-06-13',
    nextReviewDue: '2026-12-13',
  }
  it('passes a full card on a safe cell with strong evidence', () => {
    expect(productPassesEvidenceGate(fullCard, 'protein', 'cotton')).toBe(true)
  })
  it('brands a passed card for renderable products and withholds failed cards', () => {
    expect(passProductEvidenceCard(fullCard, 'protein', 'cotton')).toMatchObject({
      evidenceGate: 'passed',
      approvedProtocol: { protocolId: 'p:1', tier: 'low_risk_when_scoped' },
    })
    expect(passProductEvidenceCard(fullCard, 'protein', 'silk')).toBeNull()
  })
  it('fails on manufacturer-claim / mechanism-only evidence', () => {
    expect(productPassesEvidenceGate({ ...fullCard, evidenceQuality: 'manufacturer_claim' }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, evidenceQuality: 'mechanism_only' }, 'protein', 'cotton')).toBe(false)
  })
  it('fails when a required mechanical field is blank (SDS source / mechanism / review date)', () => {
    expect(productPassesEvidenceGate({ ...fullCard, sdsSource: '' }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, skuUpc: '' }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, sizeForm: '' }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, stainMechanism: '' }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, reviewOwner: '' }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, nextReviewDue: '' }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, workingPh: '' }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, labelWarnings: [''] }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, activeIngredients: [{ name: '', functionClass: 'enzyme', concentration: 'unknown' }] }, 'protein', 'cotton')).toBe(false)
  })
  it('allows explicit empty product-card lists when other evidence gates pass', () => {
    expect(productPassesEvidenceGate({ ...fullCard, ingredients: [], labelWarnings: [], activeIngredients: [] }, 'protein', 'cotton')).toBe(true)
  })
  it('fails malformed JSON-like cards with missing required arrays instead of throwing', () => {
    const missingNeverRecommendFor = { ...fullCard } as Partial<ProductEvidenceCard>
    delete missingNeverRecommendFor.neverRecommendFor
    const missingContraindications = { ...fullCard } as Partial<ProductEvidenceCard>
    delete missingContraindications.contraindications
    expect(productPassesEvidenceGate(missingNeverRecommendFor as ProductEvidenceCard, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate(missingContraindications as ProductEvidenceCard, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, contraindications: [''] }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, activeIngredients: [null] as unknown as ProductEvidenceCard['activeIngredients'] }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, approvedProtocols: [null] as unknown as ProductEvidenceCard['approvedProtocols'] }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, fiberCompatibility: [null] as unknown as ProductEvidenceCard['fiberCompatibility'] }, 'protein', 'cotton')).toBe(false)
  })
  it('fails malformed JSON-like cards with bad scalar/protocol/compat values', () => {
    expect(productPassesEvidenceGate({ ...fullCard, name: 123 as unknown as string }, 'protein', 'cotton')).toBe(false)
    expect(
      productPassesEvidenceGate(
        {
          ...fullCard,
          approvedProtocols: [
            {
              protocolId: 'p:1',
              stainFamily: 'protein',
              fabric: 'cotton',
              tier: 'low_risk' as unknown as ProductEvidenceCard['approvedProtocols'][number]['tier'],
              sourceFit: true,
            },
          ],
        },
        'protein',
        'cotton',
      ),
    ).toBe(false)
    expect(
      productPassesEvidenceGate(
        {
          ...fullCard,
          approvedProtocols: [
            {
              protocolId: 'p:1',
              stainFamily: 'protein',
              fabric: 'cotton',
              tier: 'low_risk_when_scoped',
              sourceFit: 'false' as unknown as boolean,
            },
          ],
        },
        'protein',
        'cotton',
      ),
    ).toBe(false)
    expect(
      productPassesEvidenceGate(
        {
          ...fullCard,
          fiberCompatibility: [
            {
              fabric: 'cotton',
              compat: 'compatible' as ProductEvidenceCard['fiberCompatibility'][number]['compat'],
              basis: 'bad value',
            },
          ],
        },
        'protein',
        'cotton',
      ),
    ).toBe(false)
  })
  it('fails on never_recommend_for fabric, unsafe/untested cell, or no source-fit approved protocol', () => {
    expect(productPassesEvidenceGate(fullCard, 'protein', 'silk')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, fiberCompatibility: [{ fabric: 'cotton', compat: 'unsafe', basis: 'x' }] }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, fiberCompatibility: [] }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate({ ...fullCard, approvedProtocols: [] }, 'protein', 'cotton')).toBe(false)
    expect(productPassesEvidenceGate(fullCard, 'tannin', 'cotton')).toBe(false)
    expect(
      productPassesEvidenceGate(
        {
          ...fullCard,
          approvedProtocols: [
            { protocolId: 'p:1', stainFamily: 'protein', fabric: 'cotton', tier: 'low_risk_when_scoped', sourceFit: false },
          ],
        },
        'protein',
        'cotton',
      ),
    ).toBe(false)
  })
})

describe('Shell builder — empty data + non-collapse', () => {
  it('products + experimentPaths always empty; conservative tier 0/1, attempt-limit 1', () => {
    const s = buildResultOptionsShell({ stain: 'coffee', surface: 'cotton', conservativeMethod: 'blot cold' })
    expect(s.experimentPaths).toEqual([])
    expect(s.products).toEqual([])
    expect(['stabilize', 'low_risk_when_scoped']).toContain(s.conservative.evidence.tier)
    expect(s.conservative.evidence.attemptLimit).toBe(1)
  })
})

describe('Red-cell fixtures — hard-block + pro-dominant, non-collapse, no leak', () => {
  // Contract-level representation. Per the SB ticket, the actual tier ASSIGNMENT per red cell is
  // the engine + SB option-matrix's job (validated by the TASK-235/236 eval, which stays green);
  // this proves the CONTRACT can express each as a hard block with conservative + pro retained,
  // no steps leak, no product rec. Pro-DOMINANT ordering + failed-Tier-1 escalation are the
  // engine/UI wire-in increment (deferred, stated here).
  const HARD_BLOCK_CELLS: Array<{ name: string; stain: string; fabric: string; reason: string }> = [
    { name: 'acetone on acetate', stain: 'nail polish', fabric: 'acetate', reason: 'Acetone dissolves acetate.' },
    { name: 'chlorine bleach on silk', stain: 'red wine', fabric: 'silk', reason: 'Bleach destroys protein fiber.' },
    { name: 'hot water on blood/protein', stain: 'blood', fabric: 'cotton', reason: 'Heat sets protein stains.' },
    { name: 'enzyme on wool', stain: 'food', fabric: 'wool', reason: 'Protease digests protein fiber.' },
    { name: 'acid cleaner on marble', stain: 'rust', fabric: 'marble', reason: 'Acid etches calcium-carbonate stone.' },
    { name: 'dye-strip on dye transfer', stain: 'dye transfer', fabric: 'cotton', reason: 'Reducing chemistry is pro-only.' },
    { name: 'bleach+ammonia mix', stain: 'mixed', fabric: 'cotton', reason: 'Produces toxic gas — never mix.' },
  ]
  for (const rc of HARD_BLOCK_CELLS) {
    it(`${rc.name}: hard block + conservative + pro, no steps leak, no product rec`, () => {
      const hb: HardBlock = {
        methodId: `hb:${rc.name}`,
        stainFamily: 'mixed',
        fabricSurface: rc.fabric,
        reason: rc.reason,
        saferAlternative: 'Professional cleaner.',
        sourceRefs: ['src:redcell'],
      }
      const s = buildResultOptionsShell({
        stain: rc.stain,
        surface: rc.fabric,
        fabric: rc.fabric,
        conservativeMethod: 'Stabilize: blot, no heat, no rubbing',
        conservativeTier: 'stabilize',
        proAvailable: true,
        proReferral: 'specialist',
        hardBlocks: [hb],
      })
      expect(s.hardBlocks[0]).not.toHaveProperty('steps')
      expect(s.conservative.evidence.tier).toBe('stabilize') // safe move still present
      expect(s.pro.available).toBe(true) // pro retained (non-collapse)
      expect(s.products).toEqual([]) // never a product rec on a red-cell shell
    })
  }
})

describe('Consumer copy guard', () => {
  it('flags banned unscoped claims', () => {
    expect(bannedCopyMatch('This is safe for most fabrics')).toBeTruthy()
    expect(bannedCopyMatch('Removal guaranteed')).toBeTruthy()
    expect(bannedCopyMatch('a gentle natural cleaner')).toBeTruthy()
    expect(bannedCopyMatch('repeat until the stain is gone')).toBeTruthy()
  })
  it('passes clean, scoped copy', () => {
    expect(bannedCopyMatch('Lowest-risk path: blot with cold water, one attempt, then stop.')).toBeNull()
  })
})
