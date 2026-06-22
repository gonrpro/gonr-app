import { describe, expect, it } from 'vitest'
import { inferMaterialFromText, normalizeSurfaceHint } from '../material-inference'

describe('solve material inference', () => {
  it('auto-picks denim when jeans is the only material hint', () => {
    expect(inferMaterialFromText('blood on jeans', 'unknown')).toBe('denim')
    expect(inferMaterialFromText('grass on blue jeans', 'unknown')).toBe('denim')
  })

  it('does not override an explicit material selection or conflicting material text', () => {
    expect(inferMaterialFromText('blood on jeans', 'cotton')).toBe('cotton')
    expect(inferMaterialFromText('blood on silk-touch jeans', 'unknown')).toBe('unknown')
  })

  it('normalizes jeans surface aliases before runtime solve submit', () => {
    expect(normalizeSurfaceHint('jeans')).toBe('denim')
    expect(normalizeSurfaceHint('blue jeans')).toBe('denim')
    expect(normalizeSurfaceHint('cotton')).toBe('cotton')
  })

  it('reduces verbose intake surfaces to the lookup material when unambiguous', () => {
    expect(normalizeSurfaceHint('Cotton shirt; machine-washable; user reports white and colorfast.')).toBe('cotton')
    expect(normalizeSurfaceHint('Silk dress; dry-clean-only; do-not-wash; prone to bleed')).toBe('silk')
    expect(normalizeSurfaceHint('polyester blouse with prior dryer heat')).toBe('polyester')
  })

  it('preserves conflicting material surfaces for conservative lookup', () => {
    expect(normalizeSurfaceHint('silk-touch polyester blouse')).toBe('silk-touch polyester blouse')
  })
})
