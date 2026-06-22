import { describe, expect, it } from 'vitest'
import { extractConsumerDisplayQuery, inferColorfastnessFromText } from '../display-context'

describe('consumer display context', () => {
  it('preserves stain, color, material, and garment in the visible query', () => {
    expect(extractConsumerDisplayQuery('Coffee on white cotton pants')).toBe('Coffee on White Cotton Pants')
  })

  it('trims treatment history out of the display title', () => {
    expect(extractConsumerDisplayQuery('coffee on white cotton pants, already blotted with water')).toBe('Coffee on White Cotton Pants')
    expect(extractConsumerDisplayQuery('coffee on white cotton pants already blotted with water')).toBe('Coffee on White Cotton Pants')
  })

  it('infers white garments as colorfast without overriding explicit user choice', () => {
    expect(inferColorfastnessFromText('coffee on white cotton pants', 'unknown')).toBe('colorfast')
    expect(inferColorfastnessFromText('coffee on white cotton pants', 'prone_to_bleed')).toBe('prone_to_bleed')
  })

  it('does not mistake white wine for a white garment', () => {
    expect(inferColorfastnessFromText('white wine on cotton pants', 'unknown')).toBe('unknown')
  })
})
