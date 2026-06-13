import { describe, it, expect } from 'vitest'
import { lookupProtocol } from '@/lib/protocols/lookup'

// TASK-257 Slice 1.5 — verified-card reachability fix.
// Replays the 7 tier-4 AI-fallback cases from Cowork's Slice 2 coverage CSV. After the
// alias-target + surface-normalization fixes, 6 must route to a verified card (tier < 4);
// grease+wool (suit) stays a documented coverage gap (tier 4 → AI), where the deterministic
// wool floor still gates DIY safely. Tier 3 family fallback stays intentionally disabled
// (lib/protocols/lookup.ts: "wrong card is worse than AI") — a grease-cotton card on wool
// would be unsafe, so the gap is correct, not a routing miss.

const AI_FALLBACK_CASES: Array<{ stain: string; surface: string; expect: 'verified' | 'gap'; why: string }> = [
  { stain: 'foundation', surface: 'cotton', expect: 'verified', why: 'alias foundation→makeup (makeup-cotton)' },
  { stain: 'sharpie', surface: 'cotton', expect: 'verified', why: 'alias sharpie→ink-permanent-marker' },
  { stain: 'permanent marker', surface: 'cotton', expect: 'verified', why: 'alias permanent marker→ink-permanent-marker' },
  { stain: 'coffee', surface: 't-shirt', expect: 'verified', why: 'surface t-shirt→cotton-dark→cotton (coffee-cotton)' },
  { stain: 'grease', surface: 'hoodie', expect: 'verified', why: 'surface hoodie→cotton-dark→cotton (grease-cotton)' },
  { stain: 'blood', surface: 'sheets', expect: 'verified', why: 'surface sheets→cotton-white→cotton (blood-cotton)' },
  { stain: 'grease', surface: 'suit', expect: 'gap', why: 'suit→wool, no grease-wool card → documented gap → AI (wool floor gates)' },
]

describe('TASK-257 Slice 1.5 — verified-card reachability (7 Cowork AI-fallback cases)', () => {
  for (const c of AI_FALLBACK_CASES) {
    it(`${c.stain} on ${c.surface} → ${c.expect} (${c.why})`, async () => {
      const r = await lookupProtocol(c.stain, c.surface)
      if (c.expect === 'verified') {
        expect(r.tier).toBeLessThan(4)
        expect(r.card).not.toBeNull()
      } else {
        expect(r.tier).toBe(4)
        expect(r.card).toBeNull()
      }
    })
  }
})

describe('TASK-257 Slice 1.5 — regression: existing routing unchanged', () => {
  it('exact-match still tier 1 (coffee + cotton)', async () => {
    const r = await lookupProtocol('coffee', 'cotton')
    expect(r.tier).toBe(1)
    expect(r.card).not.toBeNull()
  })
  it('the makeup card direct path is intact (makeup + silk)', async () => {
    const r = await lookupProtocol('makeup', 'silk')
    expect(r.tier).toBeLessThan(4)
    expect(r.card).not.toBeNull()
  })
  it('silk/leather cards still resolve at the lookup layer (ink + silk)', async () => {
    const r = await lookupProtocol('ink', 'silk')
    expect(r.tier).toBeLessThan(4)
    expect(r.card).not.toBeNull()
  })
})
