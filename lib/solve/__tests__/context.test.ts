import { describe, expect, it } from 'vitest'
import { buildSolveContext } from '../context'

describe('buildSolveContext', () => {
  it('keeps normalized lookup surface separate from verbose care context', () => {
    const ctx = buildSolveContext({
      stainResult: null,
      labelResult: null,
      stainHint: 'red wine',
      surfaceHint: 'silk',
      fabricDescription: 'Original surface detail: Silk dress; dry-clean-only; do-not-wash; prone to bleed',
    })

    expect(ctx.surface).toBe('silk')
    expect(ctx.isDryCleanOnly).toBe(true)
    expect(ctx.isDelicateFiber).toBe(true)
  })

  it('derives no-bleach and no-heat flags from preserved text context', () => {
    const ctx = buildSolveContext({
      stainResult: null,
      labelResult: null,
      stainHint: 'coffee',
      surfaceHint: 'cotton',
      fabricDescription: 'Original surface detail: Cotton shirt; no bleach; no dryer',
    })

    expect(ctx.surface).toBe('cotton')
    expect(ctx.hasNoBleach).toBe(true)
    expect(ctx.hasNoHeat).toBe(true)
  })
})
