// TASK-218 FRONTIER — engine provenance mapping (regression for a real crash).
//
// The live /api/solve engine echoes `result.source` = 'core' for a matched verified
// protocol card (NOT 'library', which the contract doc wrongly claimed). The Results
// source line did `SOURCE_LABEL[source].label`, which threw "Cannot read properties
// of undefined (reading 'label')" on the real value — a full white-screen on the
// happy path. These tests lock the mapping + the fail-safe so it can't regress.

import { describe, expect, it } from 'vitest'
import { resolveSourceLabel, SOURCE_LABEL } from '@/lib/consumer-safety/solve-source'

describe('solve-source provenance mapping', () => {
  it("maps the live engine's verified-library source ('core') to verified Encyclopedia wording", () => {
    const entry = resolveSourceLabel('core')
    expect(entry).not.toBeNull()
    expect(entry?.verified).toBe(true)
    expect(entry?.label.toLowerCase()).toContain('verified')
    // It must also be present in the static map (so typed callers resolve it too).
    expect(SOURCE_LABEL.core).toBeDefined()
  })

  it('maps every real response-level source the engine can emit, without throwing', () => {
    // The values app/api/solve/route.ts actually returns in the response body.
    const liveSources = [
      'core',
      'hard-refuse',
      'ai',
      'ai-unavailable',
      'no-verified-protocol',
      'library-safety-blocked',
    ]
    for (const s of liveSources) {
      const entry = resolveSourceLabel(s)
      expect(entry, `source "${s}" must resolve`).not.toBeNull()
      expect(entry?.label.length).toBeGreaterThan(0)
    }
  })

  it('fails SAFE (honest, non-verified) on an unmapped/future source — never throws', () => {
    const entry = resolveSourceLabel('some-future-engine-tier')
    expect(entry).not.toBeNull()
    // An unrecognised source must NOT claim verified provenance.
    expect(entry?.verified).toBe(false)
    expect(entry?.label.length).toBeGreaterThan(0)
  })

  it('returns null for an absent source (no source line rendered)', () => {
    expect(resolveSourceLabel(undefined)).toBeNull()
  })

  it('only library-family sources earn the "verified" trust flag', () => {
    expect(resolveSourceLabel('ai')?.verified).toBe(false)
    expect(resolveSourceLabel('ai-unavailable')?.verified).toBe(false)
    expect(resolveSourceLabel('hard-refuse')?.verified).toBe(false)
    expect(resolveSourceLabel('no-verified-protocol')?.verified).toBe(false)
  })
})
