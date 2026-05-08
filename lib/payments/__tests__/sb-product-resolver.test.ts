// lib/payments/__tests__/sb-product-resolver.test.ts — TASK-154 phase 2 fix #4
//
// Atlas review fix #4 (2026-05-07): product-name fallback updated to locked
// naming. "plant bridge" no longer matches; "plant brain runtime" / "plant brain"
// / "spottingboard + gonr" do.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveSpottingBoardProduct, SBPRO_FAMILY, isSpottingBoardProduct } from '../sb-product-resolver'

const ENV_KEYS = [
  'LS_SBPRO_VARIANT_ID',
  'LS_SBPRO_ANNUAL_VARIANT_ID',
  'LS_PLANT_BRAIN_RUNTIME_VARIANT_ID',
  'LS_PLANT_BRAIN_RUNTIME_ANNUAL_VARIANT_ID',
  'LS_STARTER_PACK_VARIANT_ID',
] as const

const original: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of ENV_KEYS) {
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

describe('resolveSpottingBoardProduct — variant ID match (authoritative)', () => {
  it('matches SBPro by variant ID', () => {
    process.env.LS_SBPRO_VARIANT_ID = '1001'
    expect(resolveSpottingBoardProduct('Whatever', '1001')).toBe('spottingboard_pro')
  })

  it('matches SBPro annual variant', () => {
    process.env.LS_SBPRO_ANNUAL_VARIANT_ID = '1002'
    expect(resolveSpottingBoardProduct('Whatever', '1002')).toBe('spottingboard_pro')
  })

  it('matches Plant Brain Runtime by variant ID', () => {
    process.env.LS_PLANT_BRAIN_RUNTIME_VARIANT_ID = '2001'
    expect(resolveSpottingBoardProduct('Whatever', '2001')).toBe('plant_brain_runtime')
  })

  it('matches Plant Brain Runtime annual variant', () => {
    process.env.LS_PLANT_BRAIN_RUNTIME_ANNUAL_VARIANT_ID = '2002'
    expect(resolveSpottingBoardProduct('Whatever', '2002')).toBe('plant_brain_runtime')
  })

  it('matches Starter Pack by variant ID', () => {
    process.env.LS_STARTER_PACK_VARIANT_ID = '3001'
    expect(resolveSpottingBoardProduct('Whatever', '3001')).toBe('starter_pack')
  })

  it('variant ID takes precedence over name when both set', () => {
    process.env.LS_PLANT_BRAIN_RUNTIME_VARIANT_ID = '2001'
    expect(resolveSpottingBoardProduct('SpottingBoard Pro', '2001')).toBe('plant_brain_runtime')
  })
})

describe('resolveSpottingBoardProduct — product-name fallback (Atlas fix #4)', () => {
  it('matches "Plant Brain Runtime" exact', () => {
    expect(resolveSpottingBoardProduct('Plant Brain Runtime')).toBe('plant_brain_runtime')
  })

  it('matches "Plant Brain Runtime - Monthly"', () => {
    expect(resolveSpottingBoardProduct('Plant Brain Runtime - Monthly')).toBe('plant_brain_runtime')
  })

  it('matches "Plant Brain" alone (less specific, also Plant Brain Runtime)', () => {
    expect(resolveSpottingBoardProduct('Plant Brain')).toBe('plant_brain_runtime')
  })

  it('matches case-insensitively', () => {
    expect(resolveSpottingBoardProduct('PLANT BRAIN RUNTIME')).toBe('plant_brain_runtime')
    expect(resolveSpottingBoardProduct('plant brain runtime')).toBe('plant_brain_runtime')
  })

  it('matches Starter Pack', () => {
    expect(resolveSpottingBoardProduct('SpottingBoard Starter Pack')).toBe('starter_pack')
  })

  it('matches SpottingBoard + GONR bundle name → SBPro', () => {
    expect(resolveSpottingBoardProduct('SpottingBoard + GONR')).toBe('spottingboard_pro')
  })

  it('matches "SpottingBoard Pro - Monthly"', () => {
    expect(resolveSpottingBoardProduct('SpottingBoard Pro - Monthly')).toBe('spottingboard_pro')
  })

  it('matches generic "SpottingBoard" → SBPro', () => {
    expect(resolveSpottingBoardProduct('SpottingBoard')).toBe('spottingboard_pro')
  })

  it('matches "Spotting Board" with space', () => {
    expect(resolveSpottingBoardProduct('Spotting Board Pro')).toBe('spottingboard_pro')
  })

  it('does NOT match obsolete "plant bridge" name', () => {
    // The internal name was renamed mid-build. If LS still sends "plant bridge",
    // it should NOT silently route to plant_brain_runtime — that would mask
    // a misconfigured LS product. Returns null instead.
    expect(resolveSpottingBoardProduct('GONR Plant Bridge')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(resolveSpottingBoardProduct('')).toBeNull()
  })

  it('returns null for unrelated product names', () => {
    expect(resolveSpottingBoardProduct('GONR Home')).toBeNull()
    expect(resolveSpottingBoardProduct('GONR Spotter')).toBeNull()
    expect(resolveSpottingBoardProduct('GONR Operator')).toBeNull()
    expect(resolveSpottingBoardProduct('Random Product')).toBeNull()
  })

  it('orders most specific first — "Plant Brain Runtime" wins over "spotting board"', () => {
    // If both phrases somehow appeared, the more specific one matches first.
    expect(resolveSpottingBoardProduct('Plant Brain Runtime for Spotting Board users')).toBe('plant_brain_runtime')
  })

  it('orders Starter Pack ahead of generic SpottingBoard match', () => {
    expect(resolveSpottingBoardProduct('SpottingBoard Starter Pack — Onboarding')).toBe('starter_pack')
  })
})

describe('SBPRO_FAMILY + isSpottingBoardProduct', () => {
  it('SBPRO_FAMILY contains exactly the three SB products', () => {
    expect(SBPRO_FAMILY.size).toBe(3)
    expect(SBPRO_FAMILY.has('spottingboard_pro')).toBe(true)
    expect(SBPRO_FAMILY.has('plant_brain_runtime')).toBe(true)
    expect(SBPRO_FAMILY.has('starter_pack')).toBe(true)
  })

  it('isSpottingBoardProduct narrows correctly', () => {
    expect(isSpottingBoardProduct('spottingboard_pro')).toBe(true)
    expect(isSpottingBoardProduct('plant_brain_runtime')).toBe(true)
    expect(isSpottingBoardProduct('starter_pack')).toBe(true)
    expect(isSpottingBoardProduct(null)).toBe(false)
    expect(isSpottingBoardProduct('home')).toBe(false)
    expect(isSpottingBoardProduct('something_else')).toBe(false)
  })
})
