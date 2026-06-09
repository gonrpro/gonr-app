import { engineStainTerm } from '@/lib/intake/orchestrator'
import { lookupProtocol } from '@/lib/protocols/lookup'
import { buildEngineSolveBody, emptySolveInput } from '@/lib/consumer-safety/solve-input'
import type { ParsedFacts } from '@/lib/intake/orchestrator'

// TASK-218 — canonicalization gate (Atlas, 2026-06-08).
//
// The agentic intake forwards its assembled facts to the deterministic /api/solve
// engine. The engine library lookup slugifies the stain term; a VERBOSE blob
// ("coffee on cotton shirt. coffee (tannin-based beverage stain)") never reduces to
// the canonical "coffee" slug, so a case WITH a curated core card silently fell to
// the tier-4 AI card. engineStainTerm() leads with the deterministically-resolved
// canonical stain so the curated card is hit. These fixtures lock both the helper
// and the end-to-end library hit, and document the failure mode the fix closes.

const coffee: ParsedFacts = {
  stain: 'coffee', stainFamily: 'tannin', fabric: 'cotton',
  stainKnown: true, fabricKnown: true, stainConfidence: 'high', fabricConfidence: 'high',
}
const redWine: ParsedFacts = {
  stain: 'red wine', stainFamily: 'tannin', fabric: 'silk',
  stainKnown: true, fabricKnown: true, stainConfidence: 'high', fabricConfidence: 'low',
}
const unknown: ParsedFacts = { stainKnown: false, fabricKnown: false }

describe('engineStainTerm — leads with the canonical stain so the library hits', () => {
  it('returns the canonical stain when resolved (not the verbose blob)', () => {
    expect(engineStainTerm(coffee, 'coffee on cotton shirt', 'coffee (tannin-based beverage stain)')).toBe('coffee')
    expect(engineStainTerm(redWine, 'red wine on silk dress', 'red wine (tannin/dye-type stain)')).toBe('red wine')
  })

  it('falls back to the free-text blob when no stain was resolved', () => {
    expect(engineStainTerm(unknown, 'there is a mark', 'some kind of mark')).toBe('there is a mark. some kind of mark')
    expect(engineStainTerm(unknown, '', '')).toBe('this stain')
  })
})

describe('canonicalization gate — assembled term hits the core library', () => {
  it('coffee/cotton resolves to a core card (not tier-4 ai)', async () => {
    const term = engineStainTerm(coffee, 'coffee on cotton shirt', 'coffee (tannin-based beverage stain)')
    const r = await lookupProtocol(term, 'cotton shirt')
    expect(r.source).toBe('core')
    expect(r.tier).toBe(1)
    expect(r.card).toBeTruthy()
  })

  it('red-wine/silk resolves to a core card (not tier-4 ai)', async () => {
    const term = engineStainTerm(redWine, 'red wine on silk dress', 'red wine (tannin/dye-type stain)')
    const r = await lookupProtocol(term, 'silk dress')
    expect(r.source).toBe('core')
    expect(r.tier).toBe(1)
    expect(r.card).toBeTruthy()
  })

  it('documents the bug: the verbose blob misses the library and falls to ai', async () => {
    const r = await lookupProtocol('coffee on cotton shirt. coffee (tannin-based beverage stain)', 'cotton shirt')
    expect(r.source).not.toBe('core')
  })

  // End-to-end through the REAL engine body the orchestrator builds (description ->
  // buildEngineSolveBody -> /api/solve lookup), to lock the full fold path, not just
  // the helper in isolation.
  it('the full engine body for a fresh coffee/cotton case hits the core library', async () => {
    const term = engineStainTerm(coffee, 'coffee on cotton shirt', 'coffee (tannin-based beverage stain)')
    const body = buildEngineSolveBody({ ...emptySolveInput(), stainDescription: term }, { surfaceBase: 'cotton shirt' })
    const r = await lookupProtocol(body.stain, body.surface ?? '')
    expect(r.source).toBe('core')
    expect(r.tier).toBe(1)
  })
})
