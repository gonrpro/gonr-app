// TASK-247 — repo-level consumer-card guard: run the REAL tier sanitize +
// output-guard enforce over every library card in data/core/*.json and assert
// no forbidden pro term survives in the fields a consumer can receive.
//
// This is the data-side twin of scripts/check-static-chunks.mjs: the chunk
// gate proves the pro corpus never ships in static JS; this test proves the
// card library never ships pro terms through the consumer API path. The
// sanitize step is the same function the solve route calls
// (lib/solve/sanitize-card.ts — extracted from app/api/solve/route.ts in
// TASK-247 precisely so this test exercises production code, not a copy).

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sanitizeCardForTier, PAID_TIERS } from '@/lib/solve/sanitize-card'
import {
  validateConsumerCard,
  enforceConsumerCard,
  minimalSafeCard,
  FORBIDDEN_CONSUMER_TERMS,
} from '@/lib/solve/consumer-output-guard'

const coreDir = join(process.cwd(), 'data', 'core')
const files = readdirSync(coreDir).filter((f) => f.endsWith('.json'))

type AnyCard = Record<string, unknown>

function loadCard(file: string): AnyCard {
  return JSON.parse(readFileSync(join(coreDir, file), 'utf8')) as AnyCard
}

function forbiddenTermHits(card: unknown): string[] {
  const text = JSON.stringify(card ?? '')
  const hits: string[] = []
  for (const { id, re } of FORBIDDEN_CONSUMER_TERMS) {
    const m = text.match(re)
    if (m) hits.push(`${id} ("${m[0]}")`)
  }
  return hits
}

describe('TASK-247 — consumer-card guard over data/core', () => {
  it('sees the full card library', () => {
    expect(files.length).toBeGreaterThan(200)
  })

  it('sanitize strips every pro-only field from every card (anon tier)', () => {
    const offenders: string[] = []
    for (const file of files) {
      const sanitized = sanitizeCardForTier(loadCard(file), 'anon') as AnyCard
      const leftover = [
        'spottingProtocol',
        'professionalProtocol',
        'customerHandoff',
        'deepSolve',
        'deepSolvePrompt',
        'pro',
        'pro_es',
      ].filter((k) => k in sanitized)
      const products = sanitized.products as { professional?: unknown } | undefined
      if (products && !Array.isArray(products) && 'professional' in products) {
        leftover.push('products.professional')
      }
      if (leftover.length > 0) offenders.push(`${file}: ${leftover.join(', ')}`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  // 2026-06-12 baseline: 195/270 library cards carry trade terms (NSD, POG,
  // acetic acid, sodium hydrosulfite, spotter-refs…) in consumer-kept
  // educational fields (scienceNote / whyThisWorks / stainChemistry /
  // safetyMatrix / escalation / homeSolutions). The runtime guard blocks these
  // to the safe fallback (next test proves it), so no term reaches a consumer
  // — but those cards cannot serve their real content to anon/free users.
  // Cleaning the card copy is SB/source work, not Lab's. This test is a
  // RATCHET: the baseline may shrink, never grow.
  it('no card OUTSIDE the known-dirty baseline has pro terms in consumer-kept fields', () => {
    const baseline = new Set<string>(
      JSON.parse(readFileSync(join(process.cwd(), '__tests__', 'task-247-dirty-cards-baseline.json'), 'utf8')),
    )
    const newOffenders: string[] = []
    const nowClean: string[] = []
    for (const file of files) {
      const sanitized = sanitizeCardForTier(loadCard(file), 'anon')
      const hits = forbiddenTermHits(sanitized)
      if (hits.length > 0 && !baseline.has(file)) newOffenders.push(`${file}: ${hits.join(', ')}`)
      if (hits.length === 0 && baseline.has(file)) nowClean.push(file)
    }
    if (nowClean.length > 0) {
      // Not a failure — remove these from the baseline file to lock the gain.
      console.log(`[task-247] ${nowClean.length} baseline cards are now clean: ${nowClean.join(', ')}`)
    }
    expect(newOffenders, `new cards with pro terms in consumer-kept fields:\n${newOffenders.join('\n')}`).toEqual([])
  })

  it('the full sanitize→enforce pipeline never emits a forbidden term', () => {
    const offenders: string[] = []
    for (const file of files) {
      const card = loadCard(file)
      const sanitized = sanitizeCardForTier(card, 'anon')
      const { card: finalCard } = enforceConsumerCard(
        sanitized,
        () => minimalSafeCard(String(card.stain ?? ''), String(card.surface ?? '')),
        { requestText: '' },
      )
      const hits = forbiddenTermHits(finalCard)
      if (hits.length > 0) offenders.push(`${file}: ${hits.join(', ')}`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('paid tiers keep the card untouched (sanitize is consumer-scoped)', () => {
    const card = loadCard(files[0])
    for (const tier of PAID_TIERS) {
      expect(sanitizeCardForTier(card, tier)).toBe(card)
    }
  })

  it('guard regexes still catch a seeded pro leak (self-test)', () => {
    const dirty = sanitizeCardForTier(
      { title: 'Test', warnings: ['Apply StreeTAN then General Formula No. 209'] },
      'anon',
    )
    const violations = validateConsumerCard(dirty, { requestText: '' })
    const termRules = violations.filter((v) => v.rule.startsWith('forbidden-term:'))
    expect(termRules.length).toBeGreaterThanOrEqual(2)
  })
})
