/**
 * Solve-count trial gate (server-truth).
 *
 * Pre-TASK-027 this file ran a 7-day localStorage countdown that did not match
 * the canonical rule and could be cleared/falsified by users. The actual gate
 * has always lived in /api/solve (see route.ts:checkAndIncrementSolve), but
 * the UI was reading the wrong source of truth.
 *
 * Now: this module fetches /api/usage and surfaces server-truth solve counts.
 * The localStorage `gonr_user_tier` key is preserved as a hint for AuthContext
 * during page load; the source of truth is /api/auth/tier and /api/usage.
 */

export type Tier = 'free' | 'home' | 'spotter' | 'operator' | 'founder'

const USER_TIER_KEY = 'gonr_user_tier'

export interface UsageState {
  tier: Tier
  gateType: 'founder' | 'subscription' | 'trial' | 'anon' | 'unknown'
  solvesUsed: number
  solvesRemaining: number  // -1 means unlimited
  limit: number             // -1 means unlimited
  expired: boolean
}

const UNKNOWN_STATE: UsageState = {
  tier: 'free',
  gateType: 'unknown',
  solvesUsed: 0,
  solvesRemaining: 0,
  limit: 3,
  expired: false,
}

/**
 * Fetch live usage from server. Throws on network/Supabase error so callers
 * can render a "—" placeholder rather than fabricating a count.
 */
export async function fetchUsageState(): Promise<UsageState> {
  if (typeof window === 'undefined') return UNKNOWN_STATE

  const res = await fetch('/api/usage', { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`usage fetch failed: ${res.status}`)
  }
  const data = await res.json()
  const tier = (data.tier || 'free') as Tier
  const limit = typeof data.limit === 'number' ? data.limit : 3
  const remaining = typeof data.solves_remaining === 'number' ? data.solves_remaining : 0

  return {
    tier,
    gateType: data.gate_type || 'unknown',
    solvesUsed: typeof data.solves_used === 'number' ? data.solves_used : 0,
    solvesRemaining: remaining,
    limit,
    expired: tier === 'free' && remaining === 0,
  }
}

/**
 * Set tier in localStorage as a UI hint (e.g. used by AuthContext on initial
 * paint). Server-side gates do not trust this value.
 */
export function setUserTier(tier: Tier): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_TIER_KEY, tier)
}

/**
 * Read the tier hint from localStorage. Returns 'free' if missing.
 * UI hint only — server is the source of truth.
 */
export function getCachedTierHint(): Tier {
  if (typeof window === 'undefined') return 'free'
  return ((localStorage.getItem(USER_TIER_KEY) || 'free') as Tier)
}

export function clearTrialState(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_TIER_KEY)
  // Legacy keys from the pre-TASK-027 7-day-trial implementation. Removing on
  // logout so stale values don't bleed into a different account.
  localStorage.removeItem('gonr_trial_start')
  localStorage.removeItem('gonr_solves_remaining')
}

export function getRemainingTextFromState(state: UsageState): string {
  if (state.gateType === 'founder' || state.gateType === 'subscription') return ''
  if (state.solvesRemaining === -1) return ''
  if (state.solvesRemaining === 0) return 'Free solves used — upgrade to keep going'
  if (state.solvesRemaining === 1) return '1 free solve left'
  return `${state.solvesRemaining} free solves left`
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy shims for compatibility during the rollout. Remove in a follow-up
// after callers (app/page.tsx, profile/page.tsx) are updated to use the
// async fetchUsageState() pattern.
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated 7-day trial is removed. Returns 0 always. */
export function getDaysRemaining(): number { return 0 }

/** @deprecated server gate is the source of truth. Returns false. */
export function isTrialExpired(): boolean { return false }

/** @deprecated returns synthetic state for callers not yet on fetchUsageState. */
export function getTrialState(): { daysRemaining: number; tier: Tier; expired: boolean } {
  return { daysRemaining: 0, tier: getCachedTierHint(), expired: false }
}

/** @deprecated server tracks solves now. No-op. */
export function decrementSolve(): void {}

/** @deprecated server tracks solves now. No-op. */
export function resetTrial(): void {}

/** @deprecated 7-day trial is removed. No-op. */
export function initializeTrialState(): void {}

/** @deprecated synchronous version returns empty; use getRemainingTextFromState. */
export function getRemainingText(): string { return '' }
