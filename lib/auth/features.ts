import type { Tier } from '../types'

/**
 * Feature access matrix — pure function, works on both client and server.
 * Tiers: free (trial) → home → spotter → operator → founder
 *
 * TASK-049 Phase 2 P2-c: `home` tier added to `solve` only. Home users
 * can solve but cannot access any pro feature (spotter toolkit, stain_brain,
 * handoff, deep_solve, garment_analysis, or operator dashboard/team/counter).
 * This is what gates the bottom-nav tabs on the client side (ResultCard +
 * navigation components read canAccessFeature(tier, 'spotter') etc.).
 */
const FEATURE_ACCESS: Record<string, Tier[]> = {
  // Trial (free) + home + all paid tiers
  solve:            ['free', 'home', 'spotter', 'operator', 'founder'],

  // Spotter ($49/mo) — full professional toolkit, one user
  spotter:          ['spotter', 'operator', 'founder'],
  stain_brain:      ['spotter', 'operator', 'founder'],
  deep_solve:       ['spotter', 'operator', 'founder'],
  garment_analysis: ['spotter', 'operator', 'founder'],
  handoff:          ['spotter', 'operator', 'founder'],

  // Operator ($99/mo) — coming soon: team seats, counter access, dashboard
  dashboard:        ['operator', 'founder'],
  team:             ['operator', 'founder'],
  counter:          ['operator', 'founder'],
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
