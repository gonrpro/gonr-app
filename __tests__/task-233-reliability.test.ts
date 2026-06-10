// TASK-233 — reliability + telemetry + history persistence locks.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('TASK-233 — consumer client no longer calls blocked endpoints', () => {
  it('no consumer client code fetches /api/auth/tier', () => {
    for (const p of ['lib/auth/AuthContext.tsx', 'lib/hooks/useUser.ts']) {
      const src = read(p)
      expect(src, `${p} still fetches auth/tier`).not.toMatch(/fetch\(['"]\/api\/auth\/tier/)
    }
  })

  it('no email/account identifier reaches the console in the auth flow (PII lock)', () => {
    const src = read('lib/auth/AuthContext.tsx')
    // No console call may interpolate the email variable.
    const consoleLines = src.split('\n').filter((l) => /console\.(log|warn|error|info)/.test(l))
    for (const line of consoleLines) {
      expect(line, `console line leaks identifier: ${line.trim()}`).not.toMatch(/\bemail\b|user\.id|account/i)
    }
  })

  it('proxy allows /api/events/record and still blocks /api/auth/tier', () => {
    const src = read('proxy.ts')
    expect(src).toMatch(/'\/api\/events\/record',/)
    // auth/tier must NOT be in the allowlist (only ever mentioned in comments).
    const allowlist = src.slice(src.indexOf('CONSUMER_API_EXACT'), src.indexOf('CONSUMER_API_PREFIXES'))
    expect(allowlist).not.toMatch(/'\/api\/auth\/tier'/)
  })
})

describe('TASK-233 — failure paths carry deterministic safe guidance', () => {
  it('ResultsScreen error states render the first-aid banner', () => {
    const src = read('components/consumer/screens/ResultsScreen.tsx')
    // Both the 429 and generic error returns must include FirstAidBanner.
    const rate = src.slice(src.indexOf('http === 429'), src.indexOf('6. Disambiguation prompt'))
    expect((rate.match(/FirstAidBanner/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('AgenticIntake unavailable state renders first aid and has a client timeout', () => {
    const src = read('components/consumer/AgenticIntake.tsx')
    const unavailable = src.slice(src.indexOf("phase === 'unavailable'"))
    expect(unavailable).toMatch(/FirstAidBanner/)
    expect(src).toMatch(/AbortController/)
    expect(src).toMatch(/75_000/)
  })

  it('error-state i18n copy exists in both languages', async () => {
    const { strings, t } = await import('@/lib/i18n/strings')
    expect(strings['results.errorSafeFallbackLine']).toBeDefined()
    for (const lang of ['en', 'es'] as const) {
      expect(t('results.errorSafeFallbackLine', lang)).not.toBe('results.errorSafeFallbackLine')
    }
  })

  it('/api/intake fails closed server-side (structured 503s, bounded duration)', () => {
    const src = read('app/api/intake/route.ts')
    expect(src).toMatch(/export const maxDuration/)
    expect((src.match(/status: 503/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })
})

describe('TASK-233 — history store', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubLocalStorage() {
    const store = new Map<string, string>()
    const ls = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
    vi.stubGlobal('window', { localStorage: ls } as unknown as Window & typeof globalThis)
    return store
  }

  it('saves, reopens by id, dedupes, and ring-caps at 50', async () => {
    stubLocalStorage()
    const { saveHistoryEntry, getHistoryEntry, listHistoryIds } = await import('@/lib/solve/history-store')
    saveHistoryEntry({ id: 'c1', ts: 1, input: { stainDescription: 'coffee' }, response: { card: { title: 'Coffee on Cotton' } } })
    saveHistoryEntry({ id: 'c1', ts: 2, input: {}, response: { card: { title: 'Updated' } } })
    expect(getHistoryEntry('c1')?.response.card.title).toBe('Updated')
    for (let i = 0; i < 60; i++) saveHistoryEntry({ id: `x${i}`, ts: i, input: {}, response: {} })
    expect(listHistoryIds().size).toBeLessThanOrEqual(50)
    expect(getHistoryEntry('missing')).toBeNull()
  })

  it('stored response preserves TASK-232 evidence fields verbatim', async () => {
    stubLocalStorage()
    const { saveHistoryEntry, getHistoryEntry } = await import('@/lib/solve/history-store')
    const response = {
      card: {
        title: 'Stop here — protect it and see a pro',
        firstAid: { steps: ['Blot gently.'] },
        directAnswer: { answer: 'No' },
        _terminalGate: { downgraded: true, reasons: ['positive-dye-transfer'] },
      },
    }
    saveHistoryEntry({ id: 'ev1', ts: 1, input: {}, response })
    const got = getHistoryEntry('ev1')
    expect(got?.response.card._terminalGate.reasons).toContain('positive-dye-transfer')
    expect(got?.response.card.directAnswer.answer).toBe('No')
  })

  it('is a silent no-op without window/localStorage (SSR safety)', async () => {
    const { saveHistoryEntry, getHistoryEntry, listHistoryIds } = await import('@/lib/solve/history-store')
    expect(() => saveHistoryEntry({ id: 's1', ts: 1, input: {}, response: {} })).not.toThrow()
    expect(getHistoryEntry('s1')).toBeNull()
    expect(listHistoryIds().size).toBe(0)
  })

  it('SolveFlow opens stored results and HistoryScreen links them', () => {
    const flow = read('components/consumer/SolveFlow.tsx')
    expect(flow).toMatch(/getHistoryEntry\(hidParam\)/)
    expect(flow).toMatch(/prefetched=\{\{ http: 200, data: stored\.response \}\}/)
    const hist = read('components/consumer/screens/HistoryScreen.tsx')
    expect(hist).toMatch(/hid=\$\{encodeURIComponent\(row\.correlation_id\)\}/)
  })
})
