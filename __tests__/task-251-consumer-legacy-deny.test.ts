// TASK-251 — anon/free/home may not receive unratified legacy data/core cards.

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { decide } from '../lib/decision/engine'
import {
  isCardRatifiedForConsumer,
  isConsumerSolveTier,
  RATIFIED_CARD_ALLOWLIST_VERSION,
  type RatifiedCardAllowlist,
} from '@/lib/solve/ratified-cards'

describe('TASK-251 — consumer legacy-card deny-by-default gate', () => {
  it('ships only SB-ratified legacy cards for consumer exposure', () => {
    const allowlist = JSON.parse(readFileSync(join(process.cwd(), 'data', 'ratified-cards.json'), 'utf8'))
    expect(allowlist.schemaVersion).toBe(RATIFIED_CARD_ALLOWLIST_VERSION)
    expect(allowlist.entries).toHaveLength(63)
    expect(allowlist.entries.map((entry: { cardId: string }) => entry.cardId)).toEqual([
      'barbecue-sauce-cotton',
      'beer-cotton',
      'berry-cotton',
      'berry-linen',
      'berry-polyester',
      'body-oil-cotton',
      'body-oil-polyester',
      'butter-cotton',
      'butter-linen',
      'butter-polyester',
      'chocolate-cotton',
      'chocolate-polyester',
      'coffee-black-cotton',
      'coffee-cotton',
      'coffee-cream-cotton',
      'coffee-cream-polyester',
      'coffee-linen',
      'coffee-polyester',
      'cooking-oil-cotton',
      'cooking-oil-linen',
      'cooking-oil-polyester',
      'cosmetic-oil-cotton',
      'cosmetic-oil-polyester',
      'egg-cotton',
      'egg-polyester',
      'grass-cotton',
      'grass-polyester',
      'grease-cooking-oil-cotton',
      'grease-cooking-oil-polyester',
      'grease-cotton',
      'grease-denim',
      'grease-polyester',
      'juice-cotton',
      'lipstick-cotton',
      'lipstick-polyester',
      'makeup-cotton',
      'makeup-polyester',
      'milk-cotton',
      'milk-polyester',
      'motor-oil-cotton',
      'motor-oil-denim',
      'mud-cotton',
      'mud-denim',
      'olive-oil-cotton',
      'olive-oil-linen',
      'olive-oil-polyester',
      'red-wine-cotton',
      'red-wine-linen',
      'red-wine-polyester',
      'soy-sauce-cotton',
      'soy-sauce-linen',
      'soy-sauce-polyester',
      'sweat-cotton',
      'sweat-polyester',
      'sweat-stain-cotton',
      'sweat-white-cotton',
      'tea-cotton',
      'tea-linen',
      'tea-polyester',
      'tomato-sauce-cotton',
      'tomato-sauce-linen',
      'tomato-sauce-polyester',
      'white-wine-cotton',
    ])
    expect(allowlist.entries.map((entry: { cardId: string }) => entry.cardId)).not.toContain('body-oil-white-cotton')
    expect(allowlist.entries.map((entry: { cardId: string }) => entry.cardId)).not.toContain('grass-denim')
  })

  it.each(['anon', 'free', 'home'] as const)('admits SB-ratified legacy core cards for %s', async (viewerTier) => {
    const result = await decide({ stain: 'coffee', surface: 'cotton', lang: 'en', viewerTier })

    expect(result.card).not.toBeNull()
    expect(result.card?.id).toBe('coffee-cotton')
    expect([1, 2]).toContain(result.tier)
    expect(result.source).toBe('core')
    expect(result.legacyDenied).toBeUndefined()
  })

  it.each(['anon', 'free', 'home'] as const)('still denies unlisted legacy core cards for %s', async (viewerTier) => {
    const result = await decide({ stain: 'mustard', surface: 'cotton', lang: 'en', viewerTier })

    expect(result.card).toBeNull()
    expect(result.tier).toBe(4)
    expect(result.confidence).toBe(0)
    expect(result.source).toBe('core')
    expect(result.legacyDenied).toMatchObject({
      reason: 'unratified_legacy_card',
      allowlistVersion: RATIFIED_CARD_ALLOWLIST_VERSION,
      cardId: 'mustard-cotton',
    })
  })

  it.each(['spotter', 'operator', 'founder'] as const)('leaves paid/pro tier %s library behavior unchanged', async (viewerTier) => {
    const result = await decide({ stain: 'coffee', surface: 'cotton', lang: 'en', viewerTier })

    expect(result.card).not.toBeNull()
    expect(result.card?.id).toBeTruthy()
    expect([1, 2]).toContain(result.tier)
    expect(result.source).toBe('core')
    expect(result.legacyDenied).toBeUndefined()
  })

  it('admits only cards with explicit ratification metadata', () => {
    const allowlist: RatifiedCardAllowlist = {
      schemaVersion: 'test',
      entries: [
        { cardId: 'coffee-cotton', ratificationSource: '500 Agents/Stain Brain/Reviews/TASK-238/example.md', ratifiedAt: '2026-06-12' },
        { cardId: 'red-wine-cotton', ratificationSource: '', ratifiedAt: '2026-06-12' },
      ],
    }

    expect(isCardRatifiedForConsumer('coffee-cotton', allowlist)).toBe(true)
    expect(isCardRatifiedForConsumer('red-wine-cotton', allowlist)).toBe(false)
    expect(isCardRatifiedForConsumer('missing-card', allowlist)).toBe(false)
  })

  it('treats missing/consumer tiers as deny-scoped and paid tiers as unchanged', () => {
    expect(isConsumerSolveTier(undefined)).toBe(true)
    expect(isConsumerSolveTier('anon')).toBe(true)
    expect(isConsumerSolveTier('free')).toBe(true)
    expect(isConsumerSolveTier('home')).toBe(true)
    expect(isConsumerSolveTier('spotter')).toBe(false)
    expect(isConsumerSolveTier('operator')).toBe(false)
    expect(isConsumerSolveTier('founder')).toBe(false)
  })

  it('solve route handles deny results before any library card can be served', () => {
    const route = readFileSync(join(process.cwd(), 'app', 'api', 'solve', 'route.ts'), 'utf8')
    const decideIdx = route.indexOf('const result = await decide')
    const denyIdx = route.indexOf('if (result.legacyDenied)')
    const serveIdx = route.indexOf('if (result.card)')
    const block = route.slice(denyIdx, serveIdx)

    expect(decideIdx).toBeGreaterThan(-1)
    expect(denyIdx).toBeGreaterThan(decideIdx)
    expect(denyIdx).toBeLessThan(serveIdx)
    expect(block).toContain('buildUnratifiedLegacyFallback')
    expect(block).toContain('finalizeCardForResponse(fallback, viewerTier, ctx)')
    expect(block).toContain("source: 'library-unratified-denied'")
  })
})
