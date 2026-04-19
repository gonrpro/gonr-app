// lib/protocols/enrichProducts.ts
//
// Systemic affiliate-tag enrichment for every solve response.
//
// Why: verified library cards carry `products.household` / `products.professional`
// with `amazonSearchQuery` + `affiliateTag` fields, while AI-fallback cards emit
// `products.consumer` with only `{name, use, note}` and no URL at all. The eval
// grader (and the live UI buy-links) read `products.consumer[*].url` and look
// for `gonr08-20`. Without a deterministic enricher, the WARN stream is chronic:
// AI cards emit consumer-without-URL, library cards emit household-not-consumer.
//
// This helper runs once before every solve response leaves the server:
//   1. If `products.household` is populated and `products.consumer` is not,
//      aliases household → consumer so downstream UI + eval read the same
//      canonical key.
//   2. For every product in consumer / household / professional, synthesize a
//      `url` built from `amazonSearchQuery` (falling back to `name`) and the
//      `affiliateTag` (defaulting to `AFFILIATE_TAG`).
//   3. Stamps every product with `affiliateTag` if it's missing so future
//      writers/editors see the canonical tag.
//
// Idempotent. Safe on partial cards (AI fallback, safety-blocked fallback).

export const AFFILIATE_TAG = 'gonr08-20'

export function buildAmazonUrl(query: string, tag: string = AFFILIATE_TAG): string {
  const q = String(query || '').trim()
  if (!q) return ''
  return `https://www.amazon.com/s?k=${encodeURIComponent(q)}&tag=${tag}`
}

interface EnrichableProduct {
  name?: string
  url?: string
  amazonSearchQuery?: string
  affiliateTag?: string
  [key: string]: unknown
}

function enrichProduct(p: EnrichableProduct | string): EnrichableProduct | string {
  if (typeof p === 'string') return p
  if (!p || typeof p !== 'object') return p
  const tag = typeof p.affiliateTag === 'string' && p.affiliateTag.trim() ? p.affiliateTag : AFFILIATE_TAG
  const query = typeof p.amazonSearchQuery === 'string' && p.amazonSearchQuery.trim()
    ? p.amazonSearchQuery
    : (typeof p.name === 'string' ? p.name : '')
  const next: EnrichableProduct = { ...p }
  if (!next.affiliateTag) next.affiliateTag = tag
  if (!next.url && query) next.url = buildAmazonUrl(query, tag)
  if (!next.amazonSearchQuery && query) next.amazonSearchQuery = query
  return next
}

type CardWithProducts = {
  products?: Record<string, unknown> | unknown[]
  [key: string]: unknown
}

const PRODUCT_BUCKETS = ['consumer', 'household', 'professional'] as const

export function enrichProductsWithAffiliates<T extends CardWithProducts>(card: T): T {
  if (!card || typeof card !== 'object') return card
  const products = card.products
  if (!products || typeof products !== 'object' || Array.isArray(products)) return card

  const p = products as Record<string, unknown>

  // Alias household → consumer (canonical key for the operator/consumer surface)
  if (Array.isArray(p.household) && !Array.isArray(p.consumer)) {
    p.consumer = (p.household as unknown[]).map(item => ({ ...(item as object) }))
  }

  for (const bucket of PRODUCT_BUCKETS) {
    const arr = p[bucket]
    if (Array.isArray(arr)) {
      p[bucket] = arr.map(item => enrichProduct(item as EnrichableProduct | string))
    }
  }

  return card
}
