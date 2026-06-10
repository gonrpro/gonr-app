// TASK-231 Sprint 0 — consumer prompt detox + pro-leak/hazard gates.
// Locks the 2026-06-10 pressure-test P0s at three layers:
//   1. the consumer AI prompt can never contain pro spotting vocabulary
//   2. the bleach-neutralization rule never injects pro copy for consumers
//   3. the consumer output guard blocks pro terms, placeholders, fabricated
//      user history, and bleach-mixing instructions — and its terminal
//      fallback is clean by construction
// plus the named hazard red-cells via the existing safety filter.

import { describe, it, expect } from 'vitest'
import { buildConsumerSolvePrompt } from '@/lib/solve/consumer-prompt'
import { ensureBleachNeutralization } from '@/lib/safety/bleach-neutralization'
import {
  validateConsumerCard,
  enforceConsumerCard,
  minimalSafeCard,
  buildRequestDisclosureText,
} from '@/lib/solve/consumer-output-guard'
import { runSafetyFilter } from '@/lib/safety/filter'

// The exact TASK-231 forbidden list from the packet spec. Case-insensitive
// except the short trade acronyms, which are matched as standalone words.
const FORBIDDEN_PROMPT_TERMS: Array<{ label: string; re: RegExp }> = [
  { label: 'neutralize bleach with vinegar', re: /neutrali[sz]e bleach with vinegar/i },
  { label: 'NSD', re: /\bNSD\b/ },
  { label: 'POG', re: /\bPOG\b/ },
  { label: 'VDS', re: /\bVDS\b/ },
  { label: 'BonGo', re: /bongo/i },
  { label: 'StreeTAN', re: /streetan/i },
  { label: 'Formula 209', re: /formula\s*209/i },
  { label: 'Spotter', re: /\bspotter\b/i },
  { label: 'Bleaching Guide', re: /bleaching guide/i },
  { label: '28% acetic', re: /28%\s*acetic|acetic acid/i },
  { label: 'amyl acetate', re: /amyl acetate/i },
  { label: 'steam gun', re: /steam gun/i },
  { label: "Jerry's Cleaners", re: /jerry'?s/i },
  { label: 'protein spotter/formula', re: /protein (spotter|formula)/i },
  { label: 'sodium hydrosulfite (both spellings)', re: /sodium hydrosul(?:ph|f)ite/i },
  { label: 'titanium sulfate', re: /titanium sulfate/i },
]

describe('TASK-231 — consumer prompt is household-safe', () => {
  const prompt = buildConsumerSolvePrompt()

  it.each(FORBIDDEN_PROMPT_TERMS)('contains no "$label"', ({ re }) => {
    expect(prompt).not.toMatch(re)
  })

  it('keeps the load-bearing safety invariants', () => {
    // Tannin acid-side rule survives the detox
    expect(prompt).toMatch(/TANNIN STAINS ARE ACID-SIDE ONLY/i)
    // Protein heat ban survives
    expect(prompt).toMatch(/NEVER APPLY HEAT TO PROTEIN/i)
    // Enzyme ban now covers wool as well as silk
    expect(prompt).toMatch(/NEVER APPLY ENZYMES TO SILK OR WOOL/i)
    // Acetate solvent ban survives without the trade term
    expect(prompt).toMatch(/ACETONE OR SOLVENT-BASED REMOVERS ON ACETATE/i)
    // Consumer mode never recommends chlorine bleach or ammonia at all
    expect(prompt).toMatch(/NEVER RECOMMEND CHLORINE BLEACH OR HOUSEHOLD AMMONIA/i)
    // The never-mix warning is required copy
    expect(prompt).toMatch(/never mix bleach with vinegar, ammonia/i)
    // The anti-fabrication rule is in the prompt itself
    expect(prompt).toMatch(/NEVER CLAIM THE USER DID SOMETHING/i)
  })
})

describe('TASK-231 — bleach neutralization is audience-gated', () => {
  const peroxideCard = () => ({
    title: 'Test',
    spottingProtocol: [
      { step: 1, agent: 'Hydrogen Peroxide', instruction: 'Apply 3% hydrogen peroxide to the area.' },
    ],
    homeSolutions: [],
    materialWarnings: [],
  })

  it('consumer mode appends a cool-water rinse + never-mix warning, no pro copy', () => {
    const card = peroxideCard()
    const result = ensureBleachNeutralization(card, 'consumer')
    expect(result.appended).toBe(true)
    const text = JSON.stringify(card)
    expect(text).not.toMatch(/acetic/i)
    expect(text).not.toMatch(/\bspotter\b/i)
    expect(text).not.toMatch(/bleaching guide/i)
    expect(text).toMatch(/never mix bleach/i)
    expect(text).toMatch(/cool water/i)
  })

  it('pro mode keeps the professional acetic procedure', () => {
    const card = peroxideCard()
    const result = ensureBleachNeutralization(card, 'pro')
    expect(result.appended).toBe(true)
    expect(JSON.stringify(card)).toMatch(/acetic acid 28%/i)
  })

  it('defaults to pro so existing callers are unchanged', () => {
    const card = peroxideCard()
    ensureBleachNeutralization(card)
    expect(JSON.stringify(card)).toMatch(/acetic/i)
  })

  it('consumer rinse still appends when vinegar was a treatment step (codex P2)', () => {
    // Tannin pattern: diluted vinegar as the acid treatment, then peroxide.
    // hasNeutralization() sees "vinegar" — that must NOT suppress the
    // consumer never-mix warning for the oxidizer.
    const card = {
      title: 'Coffee on Cotton',
      spottingProtocol: [
        { step: 1, agent: 'White Vinegar Solution', instruction: 'Dab diluted white vinegar on the stain.' },
        { step: 2, agent: 'Hydrogen Peroxide', instruction: 'Apply 3% hydrogen peroxide to residual color.' },
      ],
      homeSolutions: [],
      materialWarnings: [],
    }
    const result = ensureBleachNeutralization(card, 'consumer')
    expect(result.appended).toBe(true)
    expect(JSON.stringify(card)).toMatch(/never mix bleach/i)
  })

  it('consumer mode is idempotent once the standard warning exists', () => {
    const card = {
      spottingProtocol: [{ step: 1, agent: 'Hydrogen Peroxide', instruction: 'Apply 3% hydrogen peroxide.' }],
      materialWarnings: ['Never mix bleach with vinegar, ammonia, or any other cleaner — mixing can create toxic gas. After any bleaching product, rinse with plain cool water only.'],
    }
    expect(ensureBleachNeutralization(card, 'consumer').appended).toBe(false)
  })

  it('a model-authored loose warning without the rinse still gets the rule rinse (codex round 3)', () => {
    const card = {
      spottingProtocol: [{ step: 1, agent: 'Hydrogen Peroxide', instruction: 'Apply 3% peroxide. Never mix bleach with other cleaners.' }],
      materialWarnings: [],
    }
    const result = ensureBleachNeutralization(card, 'consumer')
    expect(result.appended).toBe(true)
    expect(card.spottingProtocol.some((s: { _source?: string }) => s._source === 'bleach-neutralization-rule')).toBe(true)
  })

  it('does not fire on warning-only bleach mentions', () => {
    const card = {
      spottingProtocol: [{ step: 1, agent: 'Cold Water', instruction: 'Do not use chlorine bleach on this fiber.' }],
    }
    expect(ensureBleachNeutralization(card, 'consumer').appended).toBe(false)
  })
})

describe('TASK-231 — consumer output guard', () => {
  const cleanRequest = { requestText: 'coffee on cotton shirt' }
  const baseCard = () => ({
    title: 'Coffee on Cotton',
    homeSolutions: ['Blot with a clean white cloth and dab with cold water.'],
    materialWarnings: [],
    escalation: { whatToTell: 'Coffee stain on a cotton shirt, blotted only.' },
  })

  it('passes a clean card untouched', () => {
    const card = baseCard()
    const res = enforceConsumerCard(card, () => minimalSafeCard('coffee', 'cotton'), { ...cleanRequest })
    expect(res.blocked).toBe(false)
    expect(res.card).toBe(card)
  })

  const leakCases: Array<[string, string]> = [
    ['jerrys-house-rules', "House rules — Jerry's Cleaners Inc."],
    ['bleaching-guide', 'See Spotter → Bleaching Guide.'],
    ['bongo', 'Apply BonGo to the area.'],
    ['streetan', 'Use StreeTAN per shop practice.'],
    ['formula-209', 'General Formula 209 works here.'],
    ['pog', 'Treat with POG before rinsing.'],
    ['vds', 'Use VDS on the dry side.'],
    ['nsd', 'Apply NSD at working strength.'],
    ['acetic-acid', 'Rinse with acetic acid 28% diluted 1:10.'],
    ['amyl-acetate', 'Amyl acetate lifts adhesive.'],
    ['steam-gun', 'Hit it with the steam gun at 4 inches.'],
    ['bleach-vinegar-neutralization', 'Neutralize bleach with vinegar to prevent fiber damage.'],
  ]

  it.each(leakCases)('blocks pro leak: %s', (_id, leakText) => {
    const card = baseCard()
    card.homeSolutions.push(leakText)
    const violations = validateConsumerCard(card, cleanRequest)
    expect(violations.length).toBeGreaterThan(0)
  })

  it('blocks unfilled placeholders', () => {
    const card = baseCard()
    card.escalation.whatToTell = 'Treated for [hours/days] with [products].'
    const rules = validateConsumerCard(card, cleanRequest).map((v) => v.rule)
    expect(rules).toContain('unfilled-placeholder')
  })

  it('blocks fabricated prior-bleach history when the user never mentioned bleach', () => {
    const card = baseCard()
    card.title = 'Coffee on Cotton with Prior Bleach Applied'
    const rules = validateConsumerCard(card, cleanRequest).map((v) => v.rule)
    expect(rules).toContain('fabricated-history:bleach')
  })

  it('allows prior-treatment wording the user actually disclosed', () => {
    const card = baseCard()
    card.title = 'Coffee on Cotton with Prior Bleach Applied'
    const violations = validateConsumerCard(card, {
      requestText: 'coffee on cotton shirt, prior bleach used at home',
    })
    expect(violations.map((v) => v.rule)).not.toContain('fabricated-history:bleach')
  })

  it('care-label restrictions do not whitelist fabricated history (codex round 3)', () => {
    // "NO BLEACH" care directive contains the word bleach but is a
    // restriction, not a disclosure — the fabrication must still be caught.
    const card = baseCard()
    card.title = 'Coffee on Cotton with Prior Bleach Applied'
    const rules = validateConsumerCard(card, {
      requestText: 'coffee on cotton shirt. NO BLEACH — Do not recommend chlorine bleach (care label).',
    }).map((v) => v.rule)
    expect(rules).toContain('fabricated-history:bleach')
  })

  it('blocks fabricated solvent/vinegar-peroxide history (pressure-test cases)', () => {
    const card = baseCard()
    card.escalation.whatToTell = 'Garment was treated at home with vinegar and peroxide before this.'
    const rules = validateConsumerCard(card, cleanRequest).map((v) => v.rule)
    expect(rules.some((r) => r.startsWith('fabricated-history:'))).toBe(true)
  })

  it('blocks instructions to mix bleach, but allows never-mix warnings', () => {
    const bad = baseCard()
    bad.homeSolutions.push('Mix bleach with warm water and apply.')
    expect(validateConsumerCard(bad, cleanRequest).map((v) => v.rule)).toContain('bleach-mixing-instruction')

    const good = baseCard()
    good.materialWarnings.push('Never mix bleach with vinegar, ammonia, or any other cleaner.')
    expect(validateConsumerCard(good, cleanRequest).map((v) => v.rule)).not.toContain('bleach-mixing-instruction')
  })

  it('negation in a previous sentence does not excuse a mix instruction (codex P1)', () => {
    const card = baseCard()
    card.homeSolutions.push('Do not rub. Mix bleach with warm water and apply.')
    expect(validateConsumerCard(card, cleanRequest).map((v) => v.rule)).toContain('bleach-mixing-instruction')
  })

  it('falls back to the minimal safe card when the fallback itself is dirty', () => {
    const dirty = baseCard()
    dirty.homeSolutions.push('See Spotter → Bleaching Guide.')
    const dirtyFallback = () => {
      const f = baseCard()
      f.homeSolutions.push("House rules — Jerry's Cleaners Inc.")
      return f
    }
    const res = enforceConsumerCard(dirty, dirtyFallback, { ...cleanRequest, stain: 'coffee', surface: 'cotton' })
    expect(res.blocked).toBe(true)
    expect(res.card.id).toBe('safe-fallback-protect-only')
  })

  it('minimal safe card is clean by construction', () => {
    expect(validateConsumerCard(minimalSafeCard('coffee', 'cotton'), cleanRequest)).toEqual([])
    expect(validateConsumerCard(minimalSafeCard('', ''), { requestText: '' })).toEqual([])
  })

  it('minimal safe card carries no pro-only fields (codex P2 — post-sanitize shape)', () => {
    const card = minimalSafeCard('coffee', 'cotton')
    expect(card.spottingProtocol).toBeUndefined()
    expect(card.professionalProtocol).toBeUndefined()
    expect(card.products.professional).toBeUndefined()
  })

  it('disclosure text covers brief/fabric/location/label fields (codex P2)', () => {
    const text = buildRequestDisclosureText({
      stain: 'wine',
      surface: 'silk',
      brief: 'I already used bleach on it at home',
      labelWarnings: ['do not bleach'],
    })
    expect(text).toContain('bleach')
    // A card mentioning the disclosed prior bleach is then NOT a fabrication
    const card = {
      title: 'Wine on Silk with Prior Bleach Applied',
      homeSolutions: [],
      escalation: {},
    }
    expect(validateConsumerCard(card, { requestText: text }).map((v) => v.rule)).not.toContain(
      'fabricated-history:bleach',
    )
    expect(buildRequestDisclosureText(null)).toBe('')
  })
})

describe('TASK-231 — hazard red-cells stay blocked by the safety filter', () => {
  const card = (agent: string, instruction: string) => ({
    title: 'Hazard test',
    spottingProtocol: [{ step: 1, agent, instruction }],
    homeSolutions: [instruction],
    materialWarnings: [],
  })

  const hazards: Array<[string, () => { safeExpected: boolean; result: ReturnType<typeof runSafetyFilter> }]> = [
    [
      'tannin + alkali (ammonia on coffee)',
      () => ({ safeExpected: false, result: runSafetyFilter(card('Ammonia', 'Apply ammonia solution to the coffee stain.'), 'coffee', 'cotton') }),
    ],
    [
      'protein + heat (hot water on blood)',
      () => ({ safeExpected: false, result: runSafetyFilter(card('Hot Water', 'Flush the blood stain with hot water.'), 'blood', 'cotton') }),
    ],
    [
      'silk + enzymes',
      () => ({ safeExpected: false, result: runSafetyFilter(card('Enzyme Detergent', 'Work enzyme detergent into the silk.'), 'milk', 'silk') }),
    ],
    [
      'wool + chlorine bleach',
      () => ({ safeExpected: false, result: runSafetyFilter(card('Chlorine Bleach', 'Apply chlorine bleach to the wool.'), 'wine', 'wool') }),
    ],
    [
      'acetate + acetone',
      () => ({ safeExpected: false, result: runSafetyFilter(card('Acetone', 'Dab acetone on the acetate lining.'), 'ink', 'acetate') }),
    ],
  ]

  it.each(hazards)('%s is not served as-is', (_label, run) => {
    const { result } = run()
    // Either the filter blocks the card outright or it auto-corrects the
    // violating step — serving the original unsafe instruction verbatim with
    // no intervention is the failure mode.
    expect(result.safe === false || result.filtered === true).toBe(true)
  })
})
