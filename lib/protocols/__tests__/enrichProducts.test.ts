import { describe, it, expect } from 'vitest'
import { enrichProductsWithAffiliates, buildAmazonUrl, AFFILIATE_TAG } from '../enrichProducts'

describe('enrichProductsWithAffiliates', () => {
  it('aliases library "household" into "consumer" with affiliate URLs', () => {
    const card: {
      products?: {
        household?: Array<{ name: string; amazonSearchQuery?: string; affiliateTag?: string; url?: string }>
        consumer?: Array<{ url?: string }>
        professional?: Array<{ name: string; url?: string }>
      }
    } = {
      products: {
        household: [
          { name: 'White Vinegar', amazonSearchQuery: 'white vinegar 5%', affiliateTag: 'gonr08-20' },
        ],
        professional: [
          { name: 'Tannin Spotter' },
        ],
      },
    }

    enrichProductsWithAffiliates(card)

    expect(card.products?.consumer).toBeDefined()
    expect(card.products?.consumer?.length).toBe(1)
    expect(card.products?.consumer?.[0].url).toContain('gonr08-20')
    expect(card.products?.consumer?.[0].url).toContain(encodeURIComponent('white vinegar 5%'))
    expect(card.products?.professional?.[0].url).toContain('gonr08-20')
  })

  it('stamps URLs onto AI-style consumer products that lack URL + amazonSearchQuery', () => {
    const card: { products?: { consumer?: Array<{ name: string; url?: string; affiliateTag?: string }> } } = {
      products: { consumer: [{ name: 'Dawn Dish Soap' }] },
    }

    enrichProductsWithAffiliates(card)

    expect(card.products?.consumer?.[0].url).toContain('gonr08-20')
    expect(card.products?.consumer?.[0].url).toContain(encodeURIComponent('Dawn Dish Soap'))
    expect(card.products?.consumer?.[0].affiliateTag).toBe(AFFILIATE_TAG)
  })

  it('is a no-op on cards with no products', () => {
    const card: { title: string; products?: Record<string, unknown> } = { title: 'x' }
    const before = JSON.stringify(card)
    enrichProductsWithAffiliates(card)
    expect(JSON.stringify(card)).toBe(before)
  })

  it('preserves an existing URL rather than clobbering', () => {
    const card: { products?: { consumer?: Array<{ name: string; url?: string }> } } = {
      products: {
        consumer: [{ name: 'OxiClean', url: 'https://example.com/oxi?tag=gonr08-20' }],
      },
    }
    enrichProductsWithAffiliates(card)
    expect(card.products?.consumer?.[0].url).toBe('https://example.com/oxi?tag=gonr08-20')
  })

  it('buildAmazonUrl always carries the affiliate tag', () => {
    expect(buildAmazonUrl('dawn free clear')).toContain('tag=gonr08-20')
  })
})
