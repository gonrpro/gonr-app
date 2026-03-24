import type { Tier } from '../types'

/**
 * Feature access matrix — pure function, works on both client and server.
 */
const FEATURE_ACCESS: Record<string, Tier[]> = {
  solve:            ['free', 'home', 'spotter', 'operator', 'founder'],
  unlimited_solve:  ['home', 'spotter', 'operator', 'founder'],
  deep_solve:       ['spotter', 'operator', 'founder'],
  handoff:          ['spotter', 'operator', 'founder'],
  spotter:          ['spotter', 'operator', 'founder'],
  garment_analysis: ['operator', 'founder'],
  dashboard:        ['operator', 'founder'],
}

export function canAccessFeature(tier: Tier, feature: string): boolean {
  const allowed = FEATURE_ACCESS[feature]
  if (!allowed) return false
  return allowed.includes(tier)
}

/**
 * Get the minimum tier required for a feature.
 */
export function minTierForFeature(feature: string): Tier | null {
  const allowed = FEATURE_ACCESS[feature]
  if (!allowed || allowed.length === 0) return null
  return allowed[0]
}
