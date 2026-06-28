// Batch-3 Phase-0 coverage render-proof (2026-06-28). Atlas gate: this FAILS if any of the
// 53 SB-approved stain/fabric pairs cannot resolve through findConsumerCard with steps.
// publishReady:false is intentional (trust label, not a render gate) and must NOT dark them.
import { describe, expect, it } from 'vitest'
import { CARD_MATCH_TERMS, CONSUMER_CARDS_PHASE0, findConsumerCard } from '@/lib/consumer-cards/cards'
import { classify } from '@/lib/consumer-safety/classifier'
import { normalizeInput } from '@/lib/consumer-safety/helpers'
import type { SolveInput } from '@/lib/consumer-safety/types'

function approvedInput(id: string): SolveInput {
  const card = CONSUMER_CARDS_PHASE0.find((c) => c.id === id)!
  const term = (CARD_MATCH_TERMS[id] ?? [])[0] ?? id
  return {
    stainDescription: `${term} on ${card.materials[0]}`,
    stainType: card.stainType,
    material: card.materials[0],
    careStatus: 'machine_washable',
    heatExposure: 'none',
    colorfastness: 'colorfast',
    stainAge: 'fresh',
    priorTreatment: [],
    itemValue: 'everyday',
  }
}

const NEW_53 = [
  'consumer-coffee-black-cotton',
  'consumer-coffee-cotton',
  'consumer-coffee-cream-polyester',
  'consumer-coffee-linen',
  'consumer-coffee-polyester',
  'consumer-tea-linen',
  'consumer-tea-polyester',
  'consumer-red-wine-linen',
  'consumer-red-wine-polyester',
  'consumer-white-wine-cotton',
  'consumer-berry-cotton',
  'consumer-berry-linen',
  'consumer-berry-polyester',
  'consumer-tomato-sauce-linen',
  'consumer-tomato-sauce-polyester',
  'consumer-barbecue-sauce-cotton',
  'consumer-soy-sauce-cotton',
  'consumer-soy-sauce-linen',
  'consumer-soy-sauce-polyester',
  'consumer-beer-cotton',
  'consumer-grease-cotton',
  'consumer-grease-denim',
  'consumer-grease-polyester',
  'consumer-grease-cooking-oil-cotton',
  'consumer-grease-cooking-oil-polyester',
  'consumer-cooking-oil-linen',
  'consumer-cooking-oil-polyester',
  'consumer-olive-oil-cotton',
  'consumer-olive-oil-linen',
  'consumer-olive-oil-polyester',
  'consumer-motor-oil-cotton',
  'consumer-motor-oil-denim',
  'consumer-body-oil-cotton',
  'consumer-body-oil-polyester',
  'consumer-cosmetic-oil-cotton',
  'consumer-cosmetic-oil-polyester',
  'consumer-butter-linen',
  'consumer-butter-polyester',
  'consumer-chocolate-polyester',
  'consumer-lipstick-cotton',
  'consumer-lipstick-polyester',
  'consumer-makeup-cotton',
  'consumer-makeup-polyester',
  'consumer-milk-cotton',
  'consumer-milk-polyester',
  'consumer-egg-cotton',
  'consumer-egg-polyester',
  'consumer-grass-cotton',
  'consumer-grass-polyester',
  'consumer-mud-cotton',
  'consumer-sweat-cotton',
  'consumer-sweat-polyester',
  'consumer-sweat-stain-cotton',
]

describe('Batch-3 Phase-0 coverage - every approved card renders', () => {
  it('adds 53 new consumer cards (74 total)', () => {
    for (const id of NEW_53) expect(CONSUMER_CARDS_PHASE0.some((c) => c.id === id)).toBe(true)
    expect(CONSUMER_CARDS_PHASE0.length).toBeGreaterThanOrEqual(74)
  })

  it('RENDER-PROOF: every new stain/fabric pair resolves through findConsumerCard with steps', () => {
    const dark: string[] = []
    for (const id of NEW_53) {
      const resolved = findConsumerCard(normalizeInput(approvedInput(id)))
      if (!resolved || resolved.safeSteps.length === 0) dark.push(`${id} -> ${resolved ? resolved.id : 'NONE'}`)
    }
    expect(dark).toEqual([])
  })

  it('CLASSIFY-PROOF: every new pair serves a stepped card through the production classify() path', () => {
    const dark: string[] = []
    for (const id of NEW_53) {
      const verdict = classify(approvedInput(id))
      const served = verdict.card ? CONSUMER_CARDS_PHASE0.find((c) => c.id === verdict.card) : null
      if (!served || served.safeSteps.length === 0) dark.push(`${id} -> ${verdict.verdict}/card=${verdict.card}`)
    }
    expect(dark).toEqual([])
  })

  it('new cards are publishReady:false, consumerSafe, and carry no oxygen/peroxide/solvent steps', () => {
    const OXY = /oxygen bleach|oxiclean|percarbonate|hydrogen peroxide|peroxide|acetone|solvent|chlorine bleach/
    for (const id of NEW_53) {
      const card = CONSUMER_CARDS_PHASE0.find((c) => c.id === id)!
      expect(card.publishReady).toBe(false)
      expect(card.consumerSafe).toBe(true)
      expect(card.safeSteps.length).toBeGreaterThan(0)
      expect(card.safeSteps.join(' ').toLowerCase()).not.toMatch(OXY)
    }
  })
})
