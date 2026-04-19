// lib/auth/__tests__/features.test.ts — TASK-049 Phase 2 P2-c
//
// Verifies the FEATURE_ACCESS matrix behaves correctly for the home tier.
// Home can access `solve` only. Every pro feature stays locked.

import { describe, it, expect } from 'vitest'
import { canAccessFeature, minTierForFeature } from '../features'
import type { Tier } from '../../types'

describe('canAccessFeature — home tier gating', () => {
  it('home tier can access solve', () => {
    expect(canAccessFeature('home', 'solve')).toBe(true)
  })

  it('home tier cannot access spotter features', () => {
    expect(canAccessFeature('home', 'spotter')).toBe(false)
    expect(canAccessFeature('home', 'stain_brain')).toBe(false)
    expect(canAccessFeature('home', 'deep_solve')).toBe(false)
    expect(canAccessFeature('home', 'garment_analysis')).toBe(false)
    expect(canAccessFeature('home', 'handoff')).toBe(false)
  })

  it('home tier cannot access operator features', () => {
    expect(canAccessFeature('home', 'dashboard')).toBe(false)
    expect(canAccessFeature('home', 'team')).toBe(false)
    expect(canAccessFeature('home', 'counter')).toBe(false)
  })

  it('free tier can access solve (preserved)', () => {
    expect(canAccessFeature('free', 'solve')).toBe(true)
  })

  it('free tier cannot access any pro feature (preserved)', () => {
    expect(canAccessFeature('free', 'spotter')).toBe(false)
    expect(canAccessFeature('free', 'stain_brain')).toBe(false)
    expect(canAccessFeature('free', 'handoff')).toBe(false)
  })

  it('spotter tier can access spotter features (preserved)', () => {
    expect(canAccessFeature('spotter', 'solve')).toBe(true)
    expect(canAccessFeature('spotter', 'spotter')).toBe(true)
    expect(canAccessFeature('spotter', 'stain_brain')).toBe(true)
    expect(canAccessFeature('spotter', 'handoff')).toBe(true)
  })

  it('spotter tier cannot access operator features (preserved)', () => {
    expect(canAccessFeature('spotter', 'dashboard')).toBe(false)
    expect(canAccessFeature('spotter', 'team')).toBe(false)
    expect(canAccessFeature('spotter', 'counter')).toBe(false)
  })

  it('operator tier can access everything except founder-only items', () => {
    expect(canAccessFeature('operator', 'solve')).toBe(true)
    expect(canAccessFeature('operator', 'spotter')).toBe(true)
    expect(canAccessFeature('operator', 'dashboard')).toBe(true)
    expect(canAccessFeature('operator', 'counter')).toBe(true)
  })

  it('founder tier can access everything', () => {
    const features = ['solve', 'spotter', 'stain_brain', 'deep_solve', 'garment_analysis', 'handoff', 'dashboard', 'team', 'counter']
    for (const f of features) {
      expect(canAccessFeature('founder', f)).toBe(true)
    }
  })

  it('unknown feature returns false for all tiers', () => {
    const tiers: Tier[] = ['free', 'home', 'spotter', 'operator', 'founder']
    for (const t of tiers) {
      expect(canAccessFeature(t, 'nonexistent_feature')).toBe(false)
    }
  })
})

describe('minTierForFeature', () => {
  it('returns free as the minimum for solve', () => {
    expect(minTierForFeature('solve')).toBe('free')
  })

  it('returns spotter as the minimum for pro features', () => {
    expect(minTierForFeature('spotter')).toBe('spotter')
    expect(minTierForFeature('stain_brain')).toBe('spotter')
    expect(minTierForFeature('handoff')).toBe('spotter')
  })

  it('returns operator as the minimum for operator features', () => {
    expect(minTierForFeature('dashboard')).toBe('operator')
    expect(minTierForFeature('team')).toBe('operator')
  })

  it('returns null for unknown features', () => {
    expect(minTierForFeature('nonexistent')).toBeNull()
  })
})
