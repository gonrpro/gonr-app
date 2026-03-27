import type { Tier } from '../types'

/**
 * Feature access matrix — pure function, works on both client and server.
 * Tiers: free (trial) → spotter → operator → founder
 * No "home" tier.
 */
const FEATURE_ACCESS: Record<string, Tier[]> = {
  // Trial + all paid tiers
  solve:            ['free', 'spotter', 'operator', 'founder'],

  // Spotter tier — chemistry & protocol tools (the person at the spotting board)
  spotter:          ['spotter', 'operator', 'founder'],
  stain_brain:      ['spotter', 'operator', 'founder'],
  deep_solve:       ['spotter', 'operator', 'founder'],
  garment_analysis: ['spotter', 'operator', 'founder'],

  // Operator tier — counter/team tools (plant owner buys for staff)
  handoff:          ['operator', 'founder'],
  dashboard:        ['operator', 'founder'],
  team:             ['operator', 'founder'],
}

export function canAccessFeature(tier: Tier, feature: string): boolean {
  const allowed = FEATURE_ACCESS[feature]
  if (!allowed) return false
  return allowed.includes(tier)
}

export function minTierForFeature(feature: string): Tier | null {
  const allowed = FEATURE_ACCESS[feature]
  if (!allowed || allowed.length === 0) return null
  return allowed[0]
}
