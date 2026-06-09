import { describe, it, expect } from 'vitest'
import type { AttachContext } from '@/components/consumer/AttachMenu'
import { contextFromAttach } from '@/lib/consumer-safety/attach-hints'
import {
  emptySolveInput,
  buildEngineSolveBody,
  type SolveInput,
} from '@/lib/consumer-safety/solve-input'

// REGRESSION (care-label fallback override): the agentic path forwards restrictive
// care-label symbols (no-bleach/no-heat/no-iron) as hard constraints; the deterministic
// FALLBACK used to drop them because careFromSymbols only maps wash-method symbols to a
// CareStatus and treatment-only symbols have no CareStatus slot. This locks the fix:
// contextFromAttach now carries them as SolveInput.careSymbols and the engine body the
// fallback Results screen builds includes them.
describe('care-label fallback forwards restrictive treatment symbols (no-bleach/no-heat)', () => {
  it('a care-label with [no-bleach, no-heat] and NO wash symbol reaches the engine body as careSymbols', () => {
    const ctx: AttachContext = {
      source: 'care-label',
      capturedAt: '2026-06-09T00:00:00.000Z',
      care: { fiber: 'cotton', careSymbols: ['no-bleach', 'no-heat'], warnings: [] },
    }

    // 1. contextFromAttach extracts the restrictive symbols. careStatus stays undefined —
    //    there is no wash-method symbol to map, which is exactly the gap that lost them.
    const fallbackCtx = contextFromAttach(ctx, 'coffee on my shirt')
    expect(fallbackCtx.detected?.careStatus).toBeUndefined()
    expect(fallbackCtx.detected?.careSymbols).toEqual(['no-bleach', 'no-heat'])

    // 2. The assembled fallback SolveInput carries them (as ChatIntakeScreen does), and the
    //    engine body the fallback Results screen builds includes them as hard constraints.
    const input: SolveInput = {
      ...emptySolveInput(),
      stainDescription: 'coffee on my shirt',
      careSymbols: fallbackCtx.detected?.careSymbols,
    }
    const body = buildEngineSolveBody(input, { careSymbols: input.careSymbols })
    expect(body.careSymbols).toContain('no-bleach')
    expect(body.careSymbols).toContain('no-heat')
  })

  it('a wash-method symbol still maps to careStatus (additive, not a replacement)', () => {
    const ctx: AttachContext = {
      source: 'care-label',
      capturedAt: '2026-06-09T00:00:00.000Z',
      care: { fiber: 'wool', careSymbols: ['dry-clean-only', 'no-bleach'], warnings: [] },
    }
    const fallbackCtx = contextFromAttach(ctx, '')
    expect(fallbackCtx.detected?.careStatus).toBe('dry_clean_only')
    expect(fallbackCtx.detected?.careSymbols).toContain('dry-clean-only')
    expect(fallbackCtx.detected?.careSymbols).toContain('no-bleach')
  })

  it('a non-restrictive care symbol is not forwarded as a hard constraint', () => {
    const ctx: AttachContext = {
      source: 'care-label',
      capturedAt: '2026-06-09T00:00:00.000Z',
      care: { fiber: 'cotton', careSymbols: ['machine-wash-warm'], warnings: [] },
    }
    const fallbackCtx = contextFromAttach(ctx, '')
    expect(fallbackCtx.detected?.careSymbols).toBeUndefined()
    expect(fallbackCtx.detected?.careStatus).toBe('machine_washable')
  })
})
