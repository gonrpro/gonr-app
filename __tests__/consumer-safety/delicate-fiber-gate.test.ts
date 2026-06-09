import { describe, expect, it } from 'vitest'
import { buildSolveContext } from '@/lib/solve/context'

// TASK-218 (#17) — water/solvent-sensitive materials must trip isDelicateFiber so the
// cautious-fallback gate routes them to refuse-only (no "blot with water" holding steps
// on leather/suede/velvet). Word-bounded so short tokens don't substring-collide.

function ctxFor(surfaceHint: string) {
  return buildSolveContext({ stainResult: null, labelResult: null, stainHint: 'coffee', surfaceHint })
}

describe('isDelicateFiber — newly-covered materials (#17)', () => {
  for (const m of ['leather jacket', 'velvet', 'suede boots', 'satin dress', 'taffeta', 'down jacket', 'fur collar']) {
    it(`flags "${m}" as delicate`, () => {
      expect(ctxFor(m).isDelicateFiber).toBe(true)
    })
  }
  for (const m of ['cuero', 'terciopelo', 'ante', 'raso', 'plumón']) {
    it(`flags Spanish "${m}" as delicate`, () => {
      expect(ctxFor(m).isDelicateFiber).toBe(true)
    })
  }
})

describe('isDelicateFiber — existing fibers still flagged (no regression)', () => {
  for (const m of ['100% Silk', 'wool', 'cashmere', 'acetate', 'silk dress']) {
    it(`flags "${m}"`, () => {
      expect(ctxFor(m).isDelicateFiber).toBe(true)
    })
  }
})

describe('isDelicateFiber — word boundaries prevent false positives', () => {
  for (const m of ['cotton shirt', 'polyester blend', 'furniture', 'necklace holder', 'denim']) {
    it(`does NOT flag "${m}"`, () => {
      expect(ctxFor(m).isDelicateFiber).toBe(false)
    })
  }
})
