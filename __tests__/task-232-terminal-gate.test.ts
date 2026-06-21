// TASK-232 — result contract + terminal safety gate + first-aid replay suite.
// Encodes the pressure-test replay cases the spec requires: unknown+DCO,
// dye-transfer override, rubbed-hard, heat exposure, explicit bleach question,
// fabricated history, title/absent-step/direct-rec contract rules.

import { describe, it, expect } from 'vitest'
import { parseSessionEvidence } from '@/lib/solve/session-evidence'
import {
  firedRedCells,
  cardHasActiveTreatment,
  applyTerminalGate,
  buildDowngradeCard,
} from '@/lib/solve/terminal-safety-gate'
import { buildFirstAid, buildDirectAnswer } from '@/lib/solve/first-aid'
import { validateConsumerCard } from '@/lib/solve/consumer-output-guard'

const wetCard = () => ({
  title: 'Red Wine on Cotton',
  homeSolutions: [
    'Dab the area with a mild dish soap solution in cold water.',
    'Rinse with cold water and blot dry.',
  ],
  materialWarnings: ['Never use hot water on fresh wine.'],
  escalation: { whatToTell: 'Red wine on cotton, blotted only.' },
})

const protectCard = () => ({
  title: 'Protect the item — this one needs a professional',
  homeSolutions: ['Blot gently with a clean white cloth from the outside in. No rubbing, no heat.'],
  materialWarnings: [],
  escalation: { whatToTell: 'Describe the stain and the garment.' },
})

describe('TASK-232 — session evidence parsing', () => {
  it('question about bleach is NOT prior bleach (646aad2 discipline)', () => {
    const ev = parseSessionEvidence({ stain: 'coffee stain, can I just use bleach?', surface: 'cotton shirt' })
    expect(ev.priorChems).not.toContain('bleach')
    expect(ev.directHazardQuestion).toBe('chlorine-bleach')
  })

  it('disclosed prior bleach IS evidence', () => {
    const ev = parseSessionEvidence({ stain: 'coffee, I already used bleach on it', surface: 'cotton' })
    expect(ev.priorChems).toContain('bleach')
  })

  it('care-label restriction is care evidence, not prior chemistry', () => {
    const ev = parseSessionEvidence({
      stain: 'coffee',
      surface: 'dress (dry-clean-only)',
      careSymbols: ['dry-clean-only', 'no-bleach'],
    })
    expect(ev.dryCleanOnly).toBe(true)
    expect(ev.priorChems).toEqual([])
  })

  it('detects dye transfer, heat, rubbing, leather+liquid, valuable', () => {
    expect(parseSessionEvidence({ stain: 'wine, color transferred onto my cloth during spot test', surface: 'shirt' }).dyeTransferPositive).toBe(true)
    expect(parseSessionEvidence({ stain: 'mud, I used hot water and a hair dryer on it', surface: 'pants' }).heatApplied).toBe(true)
    expect(parseSessionEvidence({ stain: 'ink, I rubbed it hard', surface: 'sleeve' }).rubbedHard).toBe(true)
    const leather = parseSessionEvidence({ stain: 'wine spill', surface: 'suede jacket' })
    expect(leather.leatherSuede).toBe(true)
    expect(leather.liquidOrSolventRisk).toBe(true)
    expect(parseSessionEvidence({ stain: 'sauce on heirloom wedding dress, not sure what fiber', surface: 'dress' }).valuableItem).toBe(true)
  })
})

describe('TASK-232 — red cells and terminal gate', () => {
  it('REPLAY unknown stain + DCO: wet DIY downgrades to protect/refer', () => {
    const ev = parseSessionEvidence({
      stain: 'unknown stain, not sure what caused it',
      surface: 'dress labeled dry-clean-only (fiber unknown)',
    })
    expect(firedRedCells(ev)).toContain('unknown-stain-on-dry-clean-only')
    const out = applyTerminalGate(wetCard(), ev, { stain: 'unknown stain', surface: 'dco dress' })
    expect(out.downgraded).toBe(true)
    expect(out.card.id).toBe('terminal-gate-protect-refer')
    expect(JSON.stringify(out.card)).toMatch(/professional/i)
  })

  it('REPLAY dye-transfer positive: even a verified card cannot render wet DIY', () => {
    const ev = parseSessionEvidence({ stain: 'red wine, dye bled onto my towel when I spot tested', surface: 'cotton dress' })
    const out = applyTerminalGate(wetCard(), ev, { stain: 'red wine', surface: 'cotton' })
    expect(out.downgraded).toBe(true)
    expect(out.reasons).toContain('positive-dye-transfer')
  })

  it('REPLAY heat applied and rubbed hard: downgrade fires', () => {
    for (const text of ['mud, I already used hot water and the hair dryer', 'makeup, I rubbed it hard first']) {
      const ev = parseSessionEvidence({ stain: text, surface: 'wool blazer' })
      const out = applyTerminalGate(wetCard(), ev, { stain: text, surface: 'wool' })
      expect(out.downgraded).toBe(true)
    }
  })

  it('protect-only card passes a red cell (annotated, not downgraded)', () => {
    const ev = parseSessionEvidence({ stain: 'unknown stain not sure what', surface: 'dry-clean-only dress' })
    const out = applyTerminalGate(protectCard(), ev, { stain: 'unknown', surface: 'dress' })
    expect(out.downgraded).toBe(false)
    expect(out.card._terminalGate?.reasons?.length).toBeGreaterThan(0)
  })

  it('no red cell: card passes untouched', () => {
    const ev = parseSessionEvidence({ stain: 'fresh coffee', surface: 'white cotton shirt' })
    const card = wetCard()
    const out = applyTerminalGate(card, ev, { stain: 'coffee', surface: 'cotton' })
    expect(out.downgraded).toBe(false)
    expect(out.card).toBe(card)
  })

  it('active-treatment detector: wet instructions yes, protect-only no, negated no', () => {
    expect(cardHasActiveTreatment(wetCard())).toBe(true)
    expect(cardHasActiveTreatment(protectCard())).toBe(false)
    expect(
      cardHasActiveTreatment({ homeSolutions: ['Do not apply water or soap to this area.'] }),
    ).toBe(false)
  })

  it('downgrade card passes the consumer contract and preserves warnings', () => {
    const down = buildDowngradeCard(wetCard(), ['positive-dye-transfer'], 'wine', 'cotton')
    expect(validateConsumerCard(down, { requestText: 'wine on cotton, dye bled in spot test' })).toEqual([])
    expect(down.materialWarnings).toContain('Never use hot water on fresh wine.')
    expect(cardHasActiveTreatment(down)).toBe(false)
  })
})

describe('TASK-232 — direct answers and first aid', () => {
  it('REPLAY "can I just use bleach?": explicit No with never-mix', () => {
    const ev = parseSessionEvidence({ stain: 'coffee, can I just use bleach?', surface: 'cotton' })
    expect(ev.directHazardQuestion).toBe('chlorine-bleach')
    const ans = buildDirectAnswer('chlorine-bleach')
    expect(ans.answer).toBe('No')
    expect(`${ans.why} ${ans.instead}`).toMatch(/never mix bleach/i)
  })

  it('ammonia and mixing questions answer No with hazard reasoning', () => {
    expect(buildDirectAnswer('ammonia').answer).toBe('No')
    expect(buildDirectAnswer('acid-mix').why).toMatch(/toxic gas/i)
  })

  it('direct-answer "instead" copy is protect-only — safe above stop cards (codex P1)', () => {
    for (const q of ['chlorine-bleach', 'ammonia', 'acid-mix'] as const) {
      const text = buildDirectAnswer(q).instead
      // No positive treatment instruction may appear: this block can render
      // above a protect-only downgrade card.
      expect(text).not.toMatch(/(?<!never )(?<!not )\b(?:use one|apply|dab|treat with|work in|scrub)\b/i)
    }
  })

  it('first aid is always conservative and adapts to evidence', () => {
    const base = buildFirstAid()
    expect(base.steps.join(' ')).toMatch(/blot/i)
    expect(base.steps.join(' ')).toMatch(/never mix bleach/i)
    // No POSITIVE treatment instruction — "do not apply" warnings are required copy.
    expect(base.steps.join(' ')).not.toMatch(/(?<!not )\b(?:apply|treat with|work in)\b/i)
    const dco = buildFirstAid({ dryCleanOnly: true })
    expect(dco.steps.join(' ')).toMatch(/do not soak|water marks/i)
    const prior = buildFirstAid({ priorChems: ['bleach'] })
    expect(prior.steps.join(' ')).toMatch(/cool water only, then stop/i)
  })

  it('first aid + downgrade card pass the forbidden-term contract', () => {
    const fa = buildFirstAid({ leatherSuede: true, priorChems: ['ammonia'] })
    expect(validateConsumerCard({ title: 'x', homeSolutions: fa.steps }, { requestText: 'ammonia was used' })).toEqual([])
  })
})

describe('TASK-232 — browser path: hazard questions never become history (Atlas repro)', () => {
  const repro = 'coffee stain on cotton shirt, can I just use bleach?'

  it('strips the question before prior-chem matching; chip and real disclosures survive', async () => {
    const { stripHazardQuestions } = await import('@/lib/intake/orchestrator')
    expect(stripHazardQuestions(repro)).not.toMatch(/bleach/i)
    expect(stripHazardQuestions('coffee on cotton, can I use vinegar?')).not.toMatch(/vinegar/i)
    expect(stripHazardQuestions('should I use rubbing alcohol on this?')).not.toMatch(/rubbing alcohol/i)
    expect(stripHazardQuestions('is it safe to use lye?')).not.toMatch(/lye/i)
    // A bare chip answer to the prior-treatment question is a disclosure — kept.
    expect(stripHazardQuestions('bleach')).toMatch(/bleach/i)
    expect(stripHazardQuestions('vinegar')).toMatch(/vinegar/i)
    expect(stripHazardQuestions('lye')).toMatch(/lye/i)
    // A genuine past-use disclosure — kept.
    expect(stripHazardQuestions('I already used bleach on it')).toMatch(/bleach/i)
    expect(stripHazardQuestions('I already used vinegar on it')).toMatch(/vinegar/i)
    expect(stripHazardQuestions('I already used lye on it')).toMatch(/lye/i)
  })

  it('engine body carries the question verbatim and fabricates no prior note', async () => {
    const { buildEngineSolveBody, emptySolveInput } = await import('@/lib/consumer-safety/solve-input')
    const body = buildEngineSolveBody(
      { ...emptySolveInput(), stainDescription: 'coffee' },
      { hazardQuestion: 'can I just use bleach?' },
    )
    expect(body.stain).not.toMatch(/prior\s+bleach/i)
    expect(body.hazardQuestion).toMatch(/bleach/i)
  })

  it('solve-side evidence answers the forwarded question with NO prior-chem red cell', () => {
    const ev = parseSessionEvidence({
      stain: 'coffee',
      surface: 'cotton shirt',
      hazardQuestion: 'can I just use bleach?',
    })
    expect(ev.directHazardQuestion).toBe('chlorine-bleach')
    expect(ev.priorChems).toEqual([])
    expect(firedRedCells(ev)).toEqual([])
  })
})

describe('TASK-232 — i18n keys resolve to real copy (Atlas review blocker)', () => {
  it('every TASK-232 UI key exists in the catalog for en AND es — t() never leaks a raw key', async () => {
    const { strings, t } = await import('@/lib/i18n/strings')
    const keys = [
      'results.directAnswerNo',
      'firstaid.aria',
      'firstaid.headline',
      'firstaid.blot',
      'firstaid.noheat',
      'firstaid.nochem',
      'firstaid.label',
    ]
    for (const key of keys) {
      expect(strings[key], `${key} missing from catalog`).toBeDefined()
      for (const lang of ['en', 'es'] as const) {
        const resolved = t(key, lang)
        expect(resolved, `${key}/${lang} resolved to raw key`).not.toBe(key)
        expect(resolved.length).toBeGreaterThan(2)
      }
    }
  })
})

describe('TASK-232 — contract extensions (pressure-test title/template classes)', () => {
  const req = { requestText: 'coffee on cotton' }

  it('blocks truncated/ellipsis titles', () => {
    const rules = validateConsumerCard(
      { title: 'Coffee on Dress …(care label: dry', homeSolutions: [] },
      req,
    ).map((v) => v.rule)
    expect(rules.some((r) => r.startsWith('title-'))).toBe(true)
  })

  it('blocks classifier-fragment and double-period titles', () => {
    const frag = validateConsumerCard(
      { title: 'Looks like unknown stain; user is unsure what caused it. on what seems to be dress', homeSolutions: [] },
      req,
    ).map((v) => v.rule)
    expect(frag.some((r) => r.startsWith('title-'))).toBe(true)
  })

  it('blocks escalation copy referencing steps never given (peroxide)', () => {
    const card = {
      title: 'Makeup on Wool',
      homeSolutions: ['Dab with mild dish soap solution.'],
      escalation: { when: 'After gentle detergent and peroxide treatment fails, see a pro.' },
    }
    const rules = validateConsumerCard(card, req).map((v) => v.rule)
    expect(rules).toContain('absent-step-reference:peroxide')
  })

  it('allows escalation copy referencing steps that exist', () => {
    const card = {
      title: 'Coffee on Cotton',
      homeSolutions: ['Apply diluted white vinegar and rinse.'],
      escalation: { when: 'If the vinegar treatment fails after two passes, see a pro.' },
    }
    const rules = validateConsumerCard(card, req).map((v) => v.rule)
    expect(rules).not.toContain('absent-step-reference:vinegar')
  })

  it('blocks positive chlorine/ammonia/acetone recommendations, allows warnings', () => {
    const bad = validateConsumerCard(
      { title: 'x', homeSolutions: ['Apply ammonia to the stain and blot.'] },
      req,
    ).map((v) => v.rule)
    expect(bad).toContain('unsupported-direct-recommendation')
    const good = validateConsumerCard(
      { title: 'x', homeSolutions: ['Never use ammonia on this stain.'] },
      req,
    ).map((v) => v.rule)
    expect(good).not.toContain('unsupported-direct-recommendation')
  })
})
