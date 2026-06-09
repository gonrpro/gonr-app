// TASK-218 (Tyler 2026-06-09) — Spanish-language safety coverage.
// Once ES requests reach the AI tier (ResultsScreen now sends the user's lang),
// an AI card may name a banned agent in Spanish despite the prompt directive.
// The nuclear rules must catch the Spanish names too, and a Spanish safety
// WARNING must NOT be misread as a recommendation.

import { describe, test, expect } from 'vitest'
import { runSafetyFilter } from '../filter'
import { applyHeatCaveat } from '../../../components/consumer/ResultsStepList'

function makeCard(agent: string, surface = 'cotton') {
  return {
    title: 'Test Protocol',
    stainFamily: 'tannin',
    surface,
    stainChemistry: 'Test chemistry.',
    whyThisWorks: 'Test explanation.',
    spottingProtocol: [{ step: 1, agent, technique: 'aplicar', instruction: `Aplique ${agent}.` }],
    homeSolutions: [],
    materialWarnings: [],
    escalation: 'Llévelo a un profesional.',
    products: { professional: [], consumer: [] },
    meta: { riskLevel: 'low', tier: 'ai-generated' },
  }
}

describe('RULE-13 — alkali/ammonia on tannin, Spanish names blocked (#1 nuclear)', () => {
  test('blocks Spanish "Amoníaco" on wine (the exact pressure-test exploit)', () => {
    const r = runSafetyFilter(makeCard('Amoníaco'), 'wine', 'cotton')
    expect(r.safe).toBe(false)
  })
  test('blocks unaccented "amoniaco" on wine', () => {
    expect(runSafetyFilter(makeCard('amoniaco'), 'wine', 'cotton').safe).toBe(false)
  })
  test('still blocks English "Ammonia" on wine (no regression)', () => {
    expect(runSafetyFilter(makeCard('Ammonia'), 'wine', 'cotton').safe).toBe(false)
  })
  test('blocks "bicarbonato de sodio" on coffee', () => {
    expect(runSafetyFilter(makeCard('bicarbonato de sodio'), 'coffee', 'cotton').safe).toBe(false)
  })
  test('blocks "sosa cáustica" on tea', () => {
    expect(runSafetyFilter(makeCard('sosa cáustica'), 'tea', 'cotton').safe).toBe(false)
  })
})

describe('Spanish warning context is not a recommendation (#10)', () => {
  test('"Nunca use amoníaco" in an instruction does NOT trigger a block', () => {
    const card = makeCard('agua fría')
    card.spottingProtocol[0].instruction = 'Nunca use amoníaco en manchas de vino: oscurece la fibra.'
    const r = runSafetyFilter(card, 'wine', 'cotton')
    expect(r.safe).toBe(true)
  })
})

describe('Other nuclear rules — Spanish names blocked', () => {
  test('RULE-4: "Acetona" on acetate blocked', () => {
    expect(runSafetyFilter(makeCard('Acetona', 'acetate'), 'ink', 'acetate').safe).toBe(false)
  })
  test('RULE-7: "Peróxido de hidrógeno" on silk blocked', () => {
    expect(runSafetyFilter(makeCard('Peróxido de hidrógeno', 'silk'), 'blood', 'silk').safe).toBe(false)
  })
  test('RULE-2S: "enzima" on silk blocked', () => {
    expect(runSafetyFilter(makeCard('detergente con enzima', 'silk'), 'chocolate', 'silk').safe).toBe(false)
  })
})

describe('applyHeatCaveat — Spanish heat detection (#8)', () => {
  test('detects "agua caliente" and appends a caveat', () => {
    const out = applyHeatCaveat('Lave con agua caliente')
    expect(out.length).toBeGreaterThan('Lave con agua caliente'.length)
    expect(out).toMatch(/care label|etiqueta/i)
  })
  test('detects Spanish heat process "secadora" and appends a caveat', () => {
    const out = applyHeatCaveat('Seque en la secadora')
    expect(out.length).toBeGreaterThan('Seque en la secadora'.length)
  })
  test('does NOT caveat "agua fría" (steers away from heat — no contradiction)', () => {
    expect(applyHeatCaveat('Enjuague con agua fría')).toBe('Enjuague con agua fría')
  })
  test('does NOT caveat a Spanish avoid-heat instruction', () => {
    const instr = 'Evite el agua caliente en esta fibra'
    expect(applyHeatCaveat(instr)).toBe(instr)
  })
  test('English hot water still caveated (no regression)', () => {
    const out = applyHeatCaveat('Wash in hot water')
    expect(out).toMatch(/care label/i)
  })
  // #20 — "warm setting" / "hot cycle" fell through both regexes before.
  test('caveats "warm setting" (#20)', () => {
    expect(applyHeatCaveat('Machine wash on the warm setting')).toMatch(/care label/i)
  })
  test('caveats "hot cycle" (#20)', () => {
    expect(applyHeatCaveat('Run a hot cycle')).toMatch(/care label/i)
  })
  test('still caveats "hottest setting" (no regression after consolidating the branch)', () => {
    expect(applyHeatCaveat('Use the hottest setting')).toMatch(/care label/i)
  })
})
