import type { Tier } from '../types'

/**
 * Feature access matrix — pure function, works on both client and server.
 * Tiers: free (trial) → home → spotter → operator → founder
 *
 * TASK-049 Phase 2 P2-c: `home` tier added to `solve` only. Home users
 * can solve but cannot access any pro feature (spotter toolkit, stain_brain,
 * handoff, deep_solve, garment_analysis, or operator dashboard/team/counter).
 *
 * TASK-155: incident_desk added as Operator-tier value. The legacy
 * garment_analysis flag stays open to spotter+ for backward-compat (founder
 * access preserved per spec — no silent removals). New full Incident Desk
 * (intake → multi-document packet) is operator-and-up only.
 */
const FEATURE_ACCESS: Record<string, Tier[]> = {
  // Trial (free) + home + all paid tiers
  solve:            ['free', 'home', 'spotter', 'operator', 'founder'],

  // Spotter ($49/mo) — full professional toolkit, one user
  spotter:          ['spotter', 'operator', 'founder'],
  stain_brain:      ['spotter', 'operator', 'founder'],
  deep_solve:       ['spotter', 'operator', 'founder'],
  garment_analysis: ['spotter', 'operator', 'founder'], // legacy thin route — keep open
  handoff:          ['spotter', 'operator', 'founder'],

  // Operator ($99/mo) — team seats, counter access, dashboard, incident desk
  dashboard:        ['operator', 'founder'],
  team:             ['operator', 'founder'],
  counter:          ['operator', 'founder'],
  incident_desk:    ['operator', 'founder'], // TASK-155 — full intake + multi-document packet
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
