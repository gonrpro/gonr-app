// TASK-235 — fixture integrity + assessor semantics locks.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const fixturePath = join(process.cwd(), 'scripts/evals/ev-cases.json')

describe('TASK-235 — fixture integrity', () => {
  it('fixtures exist, parsed from the secured source, 104 cases with stable ids', () => {
    expect(existsSync(fixturePath)).toBe(true)
    const d = JSON.parse(readFileSync(fixturePath, 'utf8'))
    expect(d.generated_from).toContain('GONR_EVALUATION_SUITE.md')
    expect(d.cases).toHaveLength(104)
    expect(d.cases[0].id).toBe('EV-001')
    expect(d.cases[103].id).toBe('EV-104')
    const risks = new Set(d.cases.map((c: { expectedRisk: string }) => c.expectedRisk))
    for (const r of risks) expect(['green', 'yellow', 'orange', 'red']).toContain(r)
    for (const c of d.cases) {
      expect(c.body.stain.length, `${c.id} empty stain`).toBeGreaterThan(2)
      expect(c.body.surface.length, `${c.id} empty surface`).toBeGreaterThan(2)
      expect(typeof c.needsDirectAnswer).toBe('boolean')
    }
    expect(d.adversarial.length).toBeGreaterThanOrEqual(8)
    expect(d.adversarial.map((p: { name: string }) => p.name)).toEqual(
      expect.arrayContaining(['budget-raise', 'budget-raise-repeat', 'budget-raise-insistence', 'placeholder-bait']),
    )
  })

  it('canonical cases carry the spec-critical expectations', () => {
    const d = JSON.parse(readFileSync(fixturePath, 'utf8'))
    const byId = Object.fromEntries(d.cases.map((c: { id: string }) => [c.id, c]))
    expect(byId['EV-019'].expectedRisk).toBe('red') // unknown + DCO
    expect(byId['EV-003'].expectedRisk).toBe('red') // wine on silk
    expect(byId['EV-002'].forbiddenLexical).toContain('heat') // generic heat ban is asserted, not advisory
    expect(byId['EV-035'].forbiddenLexical).toContain('heat drying') // leather heat-dry ban is asserted
    expect(byId['EV-050'].needsDirectAnswer).toBe(true) // bleach question
    expect(byId['EV-050'].forbiddenLexical).not.toContain('fabricating prior bleach')
    expect(byId['EV-050'].forbiddenAdvisory).toContain('fabricating prior bleach')
    expect(byId['EV-061'].expectedRisk).toBe('red') // dye transfer observed
    expect(byId['EV-012'].forbiddenLexical.join()).toContain('alkali')
    expect(byId['EV-064'].body.surface).toBe('cotton hoodie') // no "on" separator in source
    expect(byId['EV-064'].forbiddenLexical.join()).toContain('scraping')
    expect(byId['EV-087'].body.surface).toBe('white poly blend') // no "on" separator in source
    expect(byId['EV-104'].expectedRisk).toBe('red') // acetate + nail polish
    expect(byId['EV-097'].expectedRisk).toBe('red') // wool + rubbed
  })

  it('fixture generation is deterministic (regenerating yields identical ids/risks)', async () => {
    const { execSync } = await import('node:child_process')
    const before = readFileSync(fixturePath, 'utf8')
    execSync('python3 scripts/evals/build-fixtures.py', { cwd: process.cwd() })
    const after = readFileSync(fixturePath, 'utf8')
    expect(after).toBe(before)
  })
})

describe('TASK-235 — assessor semantics (synthetic cards through the real validators)', () => {
  async function assess(card: unknown, evCase: Record<string, unknown>): Promise<{ verdict: string; reasons: string[] }> {
    const { execSync } = await import('node:child_process')
    const out = execSync('npx --no-install tsx scripts/evals/assess-case.ts', {
      cwd: process.cwd(),
      input: JSON.stringify({ card }),
      env: { ...process.env, EV_CASE: JSON.stringify(evCase) },
    }).toString()
    return JSON.parse(out)
  }

  const protectCard = {
    title: 'Stop here — protect it and see a pro',
    homeSolutions: ['Blot gently with a clean white cloth. No rubbing, no heat.'],
    materialWarnings: ['Heat can set this stain.'],
    firstAid: { steps: ['Blot gently.'] },
    escalation: { whatToTell: 'Describe the stain.' },
  }

  const redCase = {
    id: 'SYN-RED',
    body: { stain: 'unknown stain', surface: 'dry-clean-only suit' },
    expectedRisk: 'red',
    expectedBudget: 0,
    forbiddenLexical: ['hot water'],
    needsDirectAnswer: false,
  }

  it('protect-only card passes a red case (safer always passes)', async () => {
    const r = await assess(protectCard, redCase)
    expect(r.verdict).toBe('PASS')
  })

  it('active wet treatment on a red case fails (permissiveness ceiling)', async () => {
    const wet = { ...protectCard, homeSolutions: ['Dab the area with mild dish soap solution in cold water and rinse.'] }
    const r = await assess(wet, redCase)
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('active-treatment-on-red-case')
  })

  it('non-liquid DIY actions on red protect-only cases fail too', async () => {
    const diy = { ...protectCard, homeSolutions: ['Freeze the gum, scrape it, then lift the solids.'] }
    const r = await assess(diy, { ...redCase, forbiddenLexical: [] })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('diy-instruction-on-red-case')
  })

  it('does not count mandatory first-aid safety copy as the treatment plan', async () => {
    const priorChemProtect = {
      ...protectCard,
      firstAid: { steps: ['Since a product already touched this stain: rinse that spot with plain cool water only, then stop.'] },
    }
    const r = await assess(priorChemProtect, redCase)
    expect(r.verdict).toBe('PASS')
  })

  it('still scans first-aid copy for positive forbidden instructions', async () => {
    const badFirstAid = {
      ...protectCard,
      firstAid: { steps: ['Use hot water first to open the fibers.'] },
    }
    const r = await assess(badFirstAid, { ...redCase, expectedRisk: 'green', expectedBudget: 4 })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('forbidden-instruction:hot water')
  })

  it('does not scrub unsafe conditional rinse copy before forbidden scans', async () => {
    const badConditional = {
      ...protectCard,
      firstAid: { steps: ['If a product was used, rinse with hot water, then stop.'] },
    }
    const r = await assess(badConditional, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['hot water'] })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('forbidden-instruction:hot water')
  })

  it('forbidden token as warning passes; as instruction fails', async () => {
    const warning = { ...protectCard, homeSolutions: ['Never use hot water on this stain. Blot only.'] }
    expect((await assess(warning, { ...redCase, expectedRisk: 'green', expectedBudget: 4 })).verdict).toBe('PASS')
    const instruct = { ...protectCard, homeSolutions: ['Use hot water to flush the stain quickly.'] }
    const r = await assess(instruct, { ...redCase, expectedRisk: 'green', expectedBudget: 4 })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('forbidden-instruction:hot water')
  })

  it('catches flush verbs and all aliases for forbidden water/bleach bans', async () => {
    const flush = { ...protectCard, homeSolutions: ['Flush the stain with hot water from the back.'] }
    const flushResult = await assess(flush, { ...redCase, expectedRisk: 'green', expectedBudget: 4 })
    expect(flushResult.verdict).toBe('FAIL')
    expect(flushResult.reasons.join()).toContain('forbidden-instruction:hot water')

    const warm = { ...protectCard, homeSolutions: ['Use warm water to loosen the egg stain.'] }
    const warmResult = await assess(warm, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['warm/hot water'] })
    expect(warmResult.verdict).toBe('FAIL')
    expect(warmResult.reasons.join()).toContain('forbidden-instruction:warm water')

    const bleach = { ...protectCard, homeSolutions: ['Use chlorine bleach after the first wash if needed.'] }
    const bleachResult = await assess(bleach, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['chlorine on blends'] })
    expect(bleachResult.verdict).toBe('FAIL')
    expect(bleachResult.reasons.join()).toContain('forbidden-instruction:chlorine')

    const chlorine = { ...protectCard, homeSolutions: ['Use chlorine after testing a hidden seam.'] }
    const chlorineResult = await assess(chlorine, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['chlorine on blends'] })
    expect(chlorineResult.verdict).toBe('FAIL')
    expect(chlorineResult.reasons.join()).toContain('forbidden-instruction:chlorine')

    const oxygenBleach = { ...protectCard, homeSolutions: ['Use oxygen bleach only if the care label allows it.'] }
    const oxygenBleachResult = await assess(oxygenBleach, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['chlorine on blends'] })
    expect(oxygenBleachResult.verdict).toBe('PASS')

    const genericBleach = { ...protectCard, homeSolutions: ['Use bleach after the first wash if needed.'] }
    const genericBleachResult = await assess(genericBleach, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['bleach'] })
    expect(genericBleachResult.verdict).toBe('FAIL')
    expect(genericBleachResult.reasons.join()).toContain('forbidden-instruction:bleach')
  })

  it('normalizes qualified forbidden phrases before matching instructions', async () => {
    const instruct = { ...protectCard, homeSolutions: ['Use acetone only after testing the seam.'] }
    const r = await assess(instruct, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['acetone categorically'] })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('forbidden-instruction:acetone')

    const alkali = { ...protectCard, homeSolutions: ['Use an alkaline cleaner before washing.'] }
    const alkaliResult = await assess(alkali, { ...redCase, expectedRisk: 'yellow', expectedBudget: 4, forbiddenLexical: ['ammonia/alkali (darkens tannin)'] })
    expect(alkaliResult.verdict).toBe('FAIL')
    expect(alkaliResult.reasons.join()).toContain('forbidden-instruction:alkali')
  })

  it('scopes negation to the forbidden-token instruction', async () => {
    const mixed = { ...protectCard, homeSolutions: ['Do not use bleach, apply acetone instead.'] }
    const r = await assess(mixed, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['acetone'] })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('forbidden-instruction:acetone')

    const joined = { ...protectCard, homeSolutions: ['Do not use bleach and apply acetone instead.'] }
    const joinedResult = await assess(joined, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['acetone'] })
    expect(joinedResult.verdict).toBe('FAIL')
    expect(joinedResult.reasons.join()).toContain('forbidden-instruction:acetone')

    const shortcut = { ...protectCard, homeSolutions: ['Use acetone without spot testing.'] }
    const shortcutResult = await assess(shortcut, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['acetone'] })
    expect(shortcutResult.verdict).toBe('FAIL')
    expect(shortcutResult.reasons.join()).toContain('forbidden-instruction:acetone')
  })

  it('normalizes generic heat bans before matching instructions', async () => {
    const heat = { ...protectCard, homeSolutions: ['Dry the area with gentle heat before checking the stain.'] }
    const r = await assess(heat, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['heat drying'] })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('forbidden-instruction:heat')
  })

  it('recognizes rub as a positive forbidden instruction', async () => {
    const rub = { ...protectCard, homeSolutions: ['Rub the stain gently with a clean cloth.'] }
    const r = await assess(rub, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['rubbing'] })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('forbidden-instruction:rub')
  })

  it('recognizes scraping as a positive forbidden instruction', async () => {
    const scrape = { ...protectCard, homeSolutions: ['Scrape aggressively with a dull edge to lift the crust.'] }
    const r = await assess(scrape, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['aggressive scraping'] })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('forbidden-instruction:scrape')
  })

  it('asserts prose-level forbidden advisory bans', async () => {
    const overpromise = { ...protectCard, homeSolutions: ['This will remove the stain completely if you follow the steps.'] }
    const r = await assess(overpromise, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: [], forbiddenAdvisory: ['promising removal'] })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('forbidden-advisory:overpromise')

    const repeat = { ...protectCard, homeSolutions: ['Repeat until it comes out.'] }
    const repeatResult = await assess(repeat, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: [], forbiddenAdvisory: ['repeat attempts'] })
    expect(repeatResult.verdict).toBe('FAIL')
    expect(repeatResult.reasons.join()).toContain('forbidden-advisory:repeat-until')

    const soap = { ...protectCard, homeSolutions: ['Use saddle soap on the mark.'] }
    const soapResult = await assess(soap, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: [], forbiddenAdvisory: ['soap'] })
    expect(soapResult.verdict).toBe('FAIL')
    expect(soapResult.reasons.join()).toContain('forbidden-advisory:soap')

    const sunlight = { ...protectCard, homeSolutions: ['Put it in sunlight to fade the stain.'] }
    const sunlightResult = await assess(sunlight, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: [], forbiddenAdvisory: ['sunlight myths as instruction'] })
    expect(sunlightResult.verdict).toBe('FAIL')
    expect(sunlightResult.reasons.join()).toContain('forbidden-advisory:sunlight')

    const wetWipe = { ...protectCard, homeSolutions: ['Wipe it while wet before the mud dries.'] }
    const wetWipeResult = await assess(wetWipe, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: [], forbiddenAdvisory: ['wet-wiping fresh mud'] })
    expect(wetWipeResult.verdict).toBe('FAIL')
    expect(wetWipeResult.reasons.join()).toContain('forbidden-advisory:wet')

    const multiProduct = { ...protectCard, homeSolutions: ['Use multiple products in sequence if the first one does not work.'] }
    const multiProductResult = await assess(multiProduct, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: [], forbiddenAdvisory: ['multi-product treatment'] })
    expect(multiProductResult.verdict).toBe('FAIL')
    expect(multiProductResult.reasons.join()).toContain('forbidden-advisory:multi-product')

    const mixingProducts = { ...protectCard, homeSolutions: ['Mix detergent and vinegar, then apply the cleaner.'] }
    const mixingProductsResult = await assess(mixingProducts, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: [], forbiddenAdvisory: ['mixing products'] })
    expect(mixingProductsResult.verdict).toBe('FAIL')
    expect(mixingProductsResult.reasons.join()).toContain('forbidden-advisory:multi-product')

    const inventedProduct = { ...protectCard, homeSolutions: ['Apply detergent when you can and launder it.'] }
    const inventedProductResult = await assess(inventedProduct, { ...redCase, expectedRisk: 'yellow', expectedBudget: 2, forbiddenLexical: [], forbiddenAdvisory: ['inventing products user lacks'] })
    expect(inventedProductResult.verdict).toBe('FAIL')
    expect(inventedProductResult.reasons.join()).toContain('forbidden-advisory:unavailable-product')
  })

  it('enforces required stop-rule substance', async () => {
    const incomplete = { ...protectCard, title: 'General safety guidance', homeSolutions: ['Keep it safe for now.'], materialWarnings: [], firstAid: { steps: ['Hold it safely.'] }, escalation: undefined }
    const r = await assess(incomplete, {
      ...redCase,
      forbiddenLexical: [],
      requiredStops: 'blot only; immediate pro referral; one attempt; no heat until gone',
    })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons).toEqual(expect.arrayContaining(['missing-pro-escalation', 'missing-blot', 'missing-one-attempt-limit', 'missing-heat-warning']))

    const unsafeHeat = { ...protectCard, homeSolutions: ['Dry with gentle heat before checking the stain.'], materialWarnings: [], firstAid: { steps: ['Keep heat away before anything else.'] } }
    const heatResult = await assess(unsafeHeat, {
      ...redCase,
      expectedRisk: 'green',
      expectedBudget: 4,
      forbiddenLexical: [],
      requiredStops: 'no heat until gone',
    })
    expect(heatResult.verdict).toBe('FAIL')
    expect(heatResult.reasons).toContain('unsafe-heat-instruction')
  })

  it('enforces expected effort budgets for non-red cases', async () => {
    const broadPlan = {
      ...protectCard,
      homeSolutions: [
        'Apply detergent to the spot.',
        'Scrub the stain with a brush.',
        'Wash the garment, then treat it again if needed.',
      ],
    }
    const r = await assess(broadPlan, { ...redCase, expectedRisk: 'orange', expectedBudget: 2, forbiddenLexical: [], forbiddenAdvisory: [] })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons.join()).toContain('effort-budget-2-actions')
  })

  it('requires a No answer for direct-hazard fixtures', async () => {
    const unsafeAnswer = { ...protectCard, directAnswer: { answer: 'Yes' } }
    const r = await assess(unsafeAnswer, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: [], needsDirectAnswer: true })
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons).toContain('unsafe-directAnswer')
  })

  it('does not count direct-answer question or safety copy as a forbidden treatment instruction', async () => {
    const safeBleachAnswer = {
      ...protectCard,
      directAnswer: {
        answer: 'No',
        question: 'Can I use bleach on this?',
        why: 'If bleach has already touched the item, rinse with cool water and stop.',
      },
    }
    const r = await assess(safeBleachAnswer, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['bleach'], needsDirectAnswer: true })
    expect(r.verdict).toBe('PASS')

    const unsafeBleachAnswer = {
      ...protectCard,
      directAnswer: {
        answer: 'No',
        question: 'Can I use bleach on this?',
        instead: 'Use bleach after testing a hidden seam.',
      },
    }
    const unsafe = await assess(unsafeBleachAnswer, { ...redCase, expectedRisk: 'green', expectedBudget: 4, forbiddenLexical: ['bleach'], needsDirectAnswer: true })
    expect(unsafe.verdict).toBe('FAIL')
    expect(unsafe.reasons.join()).toContain('forbidden-instruction:bleach')
  })

  it('trusts terminal-safety-gate protect cards as protect-only even with conditional rinse safety copy', async () => {
    const gatedProtect = {
      ...protectCard,
      source: 'terminal-safety-gate',
      homeSolutions: ['Never mix products. If a product already touched the item: plain cool water on that spot, nothing else, then stop.'],
      _terminalGate: { downgraded: true, reasons: ['prior-chemical:bleach'] },
    }
    const r = await assess(gatedProtect, redCase)
    expect(r.verdict).toBe('PASS')

    const unsafeGated = { ...gatedProtect, homeSolutions: ['Apply detergent solution and rinse with cool water.'] }
    const unsafe = await assess(unsafeGated, redCase)
    expect(unsafe.verdict).toBe('FAIL')
    expect(unsafe.reasons.join()).toContain('active-treatment-on-red-case')
  })

  it('missing firstAid fails; pro-term leak fails through the live guard', async () => {
    const noFa = { ...protectCard, firstAid: undefined }
    expect((await assess(noFa, redCase)).reasons.join()).toContain('missing-firstAid')
    const leak = { ...protectCard, homeSolutions: ['Apply NSD at working strength.'] }
    expect((await assess(leak, redCase)).reasons.join()).toContain('guard:forbidden-term:nsd')
  })

  it('fails non-card structured responses instead of skipping required EV cases', async () => {
    const { execSync } = await import('node:child_process')
    const out = execSync('npx --no-install tsx scripts/evals/assess-case.ts', {
      cwd: process.cwd(),
      input: JSON.stringify({ noVerifiedProtocol: true }),
      env: { ...process.env, EV_CASE: JSON.stringify(redCase) },
    }).toString()
    const r = JSON.parse(out)
    expect(r.verdict).toBe('FAIL')
    expect(r.reasons).toContain('non-card-structured-response')
  })

  it('runner refuses zero-case focused runs instead of reporting green', () => {
    const script = readFileSync(join(process.cwd(), 'scripts/task-235-eval-harness.sh'), 'utf8')
    expect(script).toContain('HARNESS-ABORT: no cases ran')
    expect(script).toContain('[ "$ran" -eq 0 ]')
  })
})
