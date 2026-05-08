// lib/payments/__tests__/spottingboard-checkout.test.ts — TASK-154

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  buildSpottingBoardCheckoutUrl,
  isSpottingBoardCheckoutLive,
  spottingBoardCheckoutEnvStatus,
} from '../spottingboard-checkout'

const ENV_KEYS = {
  spottingboard_pro: 'NEXT_PUBLIC_SBPRO_CHECKOUT_URL',
  plant_brain_runtime: 'NEXT_PUBLIC_PLANT_BRAIN_RUNTIME_CHECKOUT_URL',
  starter_pack: 'NEXT_PUBLIC_STARTER_PACK_CHECKOUT_URL',
} as const

const original: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of Object.values(ENV_KEYS)) {
    original[k] = process.env[k]
    delete process.env[k]
  }
})

afterEach(() => {
  for (const [k, v] of Object.entries(original)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

describe('buildSpottingBoardCheckoutUrl', () => {
  it('returns null when env URL is unset', () => {
    expect(buildSpottingBoardCheckoutUrl('spottingboard_pro', 'plant-uuid-1')).toBeNull()
  })

  it('returns null when plantId is empty', () => {
    process.env[ENV_KEYS.spottingboard_pro] = 'https://gonrlabs.lemonsqueezy.com/checkout/buy/sbpro'
    expect(buildSpottingBoardCheckoutUrl('spottingboard_pro', '')).toBeNull()
  })

  it('always carries plant_id custom data', () => {
    process.env[ENV_KEYS.spottingboard_pro] = 'https://gonrlabs.lemonsqueezy.com/checkout/buy/sbpro'
    const url = buildSpottingBoardCheckoutUrl('spottingboard_pro', 'plant-uuid-1')
    expect(url).toContain('checkout%5Bcustom%5D%5Bplant_id%5D=plant-uuid-1')
  })

  it('carries product_key custom data', () => {
    process.env[ENV_KEYS.plant_brain_runtime] = 'https://gonrlabs.lemonsqueezy.com/checkout/buy/runtime'
    const url = buildSpottingBoardCheckoutUrl('plant_brain_runtime', 'plant-uuid-2')
    expect(url).toContain('checkout%5Bcustom%5D%5Bproduct_key%5D=plant_brain_runtime')
  })

  it('appends email when supplied', () => {
    process.env[ENV_KEYS.spottingboard_pro] = 'https://gonrlabs.lemonsqueezy.com/checkout/buy/sbpro'
    const url = buildSpottingBoardCheckoutUrl('spottingboard_pro', 'plant-uuid-1', 'owner@plant.com')
    expect(url).toContain('checkout%5Bemail%5D=owner%40plant.com')
  })

  it('builds URL for starter_pack from its own env', () => {
    process.env[ENV_KEYS.starter_pack] = 'https://gonrlabs.lemonsqueezy.com/checkout/buy/starter'
    const url = buildSpottingBoardCheckoutUrl('starter_pack', 'plant-uuid-1')
    expect(url).toMatch(/^https:\/\//)
    expect(url).toContain('starter')
  })

  it('preserves existing query params on base URL', () => {
    process.env[ENV_KEYS.spottingboard_pro] = 'https://gonrlabs.lemonsqueezy.com/checkout/buy/sbpro?utm_source=site'
    const url = buildSpottingBoardCheckoutUrl('spottingboard_pro', 'plant-uuid-1')
    expect(url).toContain('utm_source=site')
    // URL-encoded: checkout[custom][plant_id]=plant-uuid-1
    expect(url).toContain('checkout%5Bcustom%5D%5Bplant_id%5D=plant-uuid-1')
  })
})

describe('isSpottingBoardCheckoutLive', () => {
  it('returns false when env unset', () => {
    expect(isSpottingBoardCheckoutLive('spottingboard_pro')).toBe(false)
  })

  it('returns true when env set to non-empty URL', () => {
    process.env[ENV_KEYS.spottingboard_pro] = 'https://example.com/checkout'
    expect(isSpottingBoardCheckoutLive('spottingboard_pro')).toBe(true)
  })

  it('returns false when env set to empty string', () => {
    process.env[ENV_KEYS.spottingboard_pro] = ''
    expect(isSpottingBoardCheckoutLive('spottingboard_pro')).toBe(false)
  })
})

describe('spottingBoardCheckoutEnvStatus', () => {
  it('reports configured=false for all when env unset', () => {
    const status = spottingBoardCheckoutEnvStatus()
    expect(status).toHaveLength(3)
    for (const row of status) {
      expect(row.configured).toBe(false)
    }
  })

  it('reports configured=true only for set envs', () => {
    process.env[ENV_KEYS.spottingboard_pro] = 'https://example.com/sbpro'
    const status = spottingBoardCheckoutEnvStatus()
    const sbpro = status.find((s) => s.product === 'spottingboard_pro')
    const runtime = status.find((s) => s.product === 'plant_brain_runtime')
    expect(sbpro?.configured).toBe(true)
    expect(runtime?.configured).toBe(false)
  })
})
