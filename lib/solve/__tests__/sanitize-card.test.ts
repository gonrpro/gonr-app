import { describe, expect, it } from 'vitest'
import { sanitizeCardForTier } from '../sanitize-card'

function makeCard() {
  return {
    id: 'blood-cotton',
    title: 'Blood on Cotton',
    spottingProtocol: [{ step: 1, instruction: 'Professional step' }],
    professionalProtocol: { steps: ['Professional legacy step'] },
    homeSolutions: ['Consumer recipe step'],
    diyProtocol: { steps: ['Legacy DIY recipe step'] },
    diy: { steps: ['Legacy diy alias'] },
    diy_es: { steps: ['Legacy diy Spanish alias'] },
    customerHandoff: { customerScript: 'Pro-only handoff' },
    products: {
      professional: [{ name: 'Pro Product' }],
      consumer: [{ name: 'Consumer Product' }],
      household: [{ name: 'Household Product' }],
    },
    sources: ['source-a', 'source-b'],
  }
}

describe('sanitizeCardForTier', () => {
  it.each(['anon', 'free', 'home'] as const)('quarantines legacy consumer fields for %s runtime', (tier) => {
    const sanitized = sanitizeCardForTier(makeCard(), tier) as Record<string, unknown>

    expect(sanitized.homeSolutions).toBeUndefined()
    expect(sanitized.diyProtocol).toBeUndefined()
    expect(sanitized.diy).toBeUndefined()
    expect(sanitized.diy_es).toBeUndefined()
    expect(sanitized.spottingProtocol).toBeUndefined()
    expect(sanitized.professionalProtocol).toBeUndefined()
    expect(sanitized.customerHandoff).toBeUndefined()
    expect(sanitized.consumerSurfaceQuarantine).toMatchObject({
      status: 'legacy_consumer_fields_quarantined',
      fields: ['homeSolutions', 'diyProtocol'],
      directive: 'rewrite_from_stain_brain_claim_unit_model',
    })
    expect(sanitized.products).toEqual({
      consumer: [{ name: 'Consumer Product' }],
      household: [{ name: 'Household Product' }],
    })
    expect(sanitized.sources).toEqual(['source-a'])
  })

  it.each(['spotter', 'operator', 'founder'] as const)('keeps full card for %s runtime', (tier) => {
    const card = makeCard()
    const sanitized = sanitizeCardForTier(card, tier)

    expect(sanitized).toBe(card)
    expect((sanitized as Record<string, unknown>).homeSolutions).toEqual(['Consumer recipe step'])
    expect((sanitized as Record<string, unknown>).diyProtocol).toEqual({ steps: ['Legacy DIY recipe step'] })
  })
})
