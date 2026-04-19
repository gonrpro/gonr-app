import { describe, it, expect } from 'vitest'
import { lookupProtocol } from '../lookup'
import { runSafetyFilter } from '../../safety/filter'

describe('lookupProtocol', () => {
  it('resolves white wine on cotton to a safe core card', async () => {
    const result = await lookupProtocol('white wine', 'cotton')

    expect(result.card).toBeTruthy()
    expect(result.card?.id).toBe('white-wine-cotton')
    expect(result.tier).toBe(1)
    expect(result.source).toBe('core')
    expect(result.card?.meta.stainCanonical).toBe('white-wine')
    const card = result.card as { stainFamily?: string; stainType?: string } | null
    expect(card?.stainFamily || card?.stainType).toBe('tannin')

    const safety = runSafetyFilter(result.card, 'white wine', 'cotton')
    expect(safety.safe).toBe(true)
    expect(JSON.stringify(safety.card)).not.toContain('Professional Assessment Required')
  })

  it('resolves champagne on cotton through the white-wine alias', async () => {
    const result = await lookupProtocol('champagne', 'cotton')

    expect(result.card?.id).toBe('white-wine-cotton')
    expect(result.tier).toBe(2)
  })

  // TASK-045 follow-up — cosmetic surface prefix handling
  it('strips cosmetic color prefix so "White carpet" resolves to the carpet card (G16)', async () => {
    const result = await lookupProtocol('Red Wine', 'White carpet')

    expect(result.card).toBeTruthy()
    expect(result.card?.id).toBe('red-wine-carpet')
    expect(result.tier).toBe(1)
    expect(result.source).toBe('core')

    const fullText = JSON.stringify(result.card).toLowerCase()
    expect(fullText).toContain('cold')
    expect(fullText).toContain('blot')
  })

  it('resolves black tea on cotton to the new canonical card (C8 base)', async () => {
    const result = await lookupProtocol('Black Tea', 'cotton')

    expect(result.card).toBeTruthy()
    expect(result.card?.id).toBe('black-tea-cotton')
    expect(result.tier).toBe(1)
    expect(result.source).toBe('core')
    const card = result.card as { stainFamily?: string; stainType?: string } | null
    expect(card?.stainFamily || card?.stainType).toBe('tannin')

    const fullText = JSON.stringify(result.card).toLowerCase()
    expect(fullText).toContain('cold')
    expect(fullText).toContain('blot')
  })

  it('routes "White cotton tablecloth" through cosmetic-strip + alias to black-tea-cotton (C8)', async () => {
    const result = await lookupProtocol('Black Tea', 'White cotton tablecloth')

    expect(result.card).toBeTruthy()
    expect(result.card?.id).toBe('black-tea-cotton')
    // tier 2 (alias-resolved via "cotton tablecloth" → "cotton") is acceptable;
    // tier 1 is also acceptable if the surface-aliases file happens to resolve
    // through SURFACE_NORMALIZE to "cotton" directly.
    expect([1, 2]).toContain(result.tier)
    expect(result.source).toBe('core')

    const fullText = JSON.stringify(result.card).toLowerCase()
    expect(fullText).toContain('cold')
    expect(fullText).toContain('blot')
  })

  it('does not strip non-cosmetic prefixes (silk blouse stays routed to silk aliases)', async () => {
    // Silk is not a cosmetic prefix — must not be collapsed to "blouse".
    // Behavior test: lookup must not return a card whose surfaceCanonical is
    // literally "blouse" for a silk input.
    const result = await lookupProtocol('Blood', 'Silk blouse')
    if (result.card) {
      expect(result.card.meta?.surfaceCanonical).not.toBe('blouse')
    }
  })
})
