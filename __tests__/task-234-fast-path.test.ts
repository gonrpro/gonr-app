// TASK-234 — deterministic fast path + latency separation + anon 401 cleanup.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseSessionEvidence } from '@/lib/solve/session-evidence'
import { firedRedCells, buildDowngradeCard, cardHasActiveTreatment } from '@/lib/solve/terminal-safety-gate'
import { validateConsumerCard } from '@/lib/solve/consumer-output-guard'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('TASK-234 — deterministic fast path', () => {
  it('route serves red-cell sessions before the AI call, consumer tiers only', () => {
    const src = read('app/api/solve/route.ts')
    const fastIdx = src.indexOf('deterministic fast path for red-cell sessions')
    const aiIdx = src.indexOf('AI fallback (Home / Free / Anon only)')
    expect(fastIdx).toBeGreaterThan(-1)
    expect(fastIdx).toBeLessThan(aiIdx)
    const block = src.slice(fastIdx, aiIdx)
    expect(block).toMatch(/PAID_TIERS\.has\(viewerTier\)/) // paid tiers excluded
    expect(block).toMatch(/firedRedCells/)
    expect(block).toMatch(/buildDowngradeCard/)
    expect(block).toMatch(/finalizeCardForResponse/) // still passes the chokepoint
    expect(block).toMatch(/'deterministic-fast-path'/)
  })

  it('fast-path card (no original) is contract-clean and protect-only', () => {
    const ev = parseSessionEvidence({
      stain: 'unknown stain, not sure what caused it',
      surface: 'dress labeled dry-clean-only (fiber unknown)',
    })
    const reasons = firedRedCells(ev)
    expect(reasons.length).toBeGreaterThan(0)
    const card = buildDowngradeCard({}, reasons, 'unknown stain', 'dco dress')
    expect(validateConsumerCard(card, { requestText: 'unknown stain dco dress' })).toEqual([])
    expect(cardHasActiveTreatment(card)).toBe(false)
    expect(card.materialWarnings.length).toBeGreaterThan(0) // default warning kicks in
  })

  it('clean sessions do NOT fire the fast path (no red cells)', () => {
    const ev = parseSessionEvidence({ stain: 'fresh coffee', surface: 'white cotton shirt' })
    expect(firedRedCells(ev)).toEqual([])
  })

  it('response timing field is PII-free server-millis only', () => {
    const src = read('app/api/solve/route.ts')
    expect(src).toMatch(/_serverMs: Date\.now\(\) - _t0/)
    // No email/identifier may ride the timing additions.
    const timingLines = src.split('\n').filter((l) => l.includes('_serverMs'))
    for (const line of timingLines) expect(line).not.toMatch(/email|actor|user/i)
  })
})

describe('TASK-234 — anon 401 cleanup', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('hasLikelySession detects sb- cookies and is SSR-safe', async () => {
    const { hasLikelySession } = await import('@/lib/auth/has-session')
    expect(hasLikelySession()).toBe(false) // node env: no document
    vi.stubGlobal('document', { cookie: 'sb-abc-auth-token=xyz; other=1' } as unknown as Document)
    expect(hasLikelySession()).toBe(true)
    vi.stubGlobal('document', { cookie: 'plain=1' } as unknown as Document)
    expect(hasLikelySession()).toBe(false)
  })

  it('Home and History skip the cookie-auth fetch for anon sessions', () => {
    for (const p of ['components/consumer/screens/HomeScreen.tsx', 'components/consumer/screens/HistoryScreen.tsx']) {
      const src = read(p)
      const guardIdx = src.indexOf('hasLikelySession()')
      const fetchIdx = src.indexOf("fetch('/api/solves/history")
      expect(guardIdx, `${p} missing anon guard`).toBeGreaterThan(-1)
      expect(guardIdx, `${p} guard must precede the fetch`).toBeLessThan(fetchIdx)
    }
  })
})
