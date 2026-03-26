/**
 * Client-side 7-day trial gate
 * Stores trial start date in localStorage.
 * Full access for 7 days. After that → paywall.
 */

export type Tier = 'free' | 'home' | 'spotter' | 'operator' | 'founder'

const TRIAL_START_KEY = 'gonr_trial_start'
const USER_TIER_KEY = 'gonr_user_tier'
const TRIAL_DAYS = 7

/**
 * Initialize trial on first visit. Records start date if not set.
 */
export function initializeTrialState(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(TRIAL_START_KEY) === null) {
    localStorage.setItem(TRIAL_START_KEY, String(Date.now()))
  }
}

/**
 * Get days remaining in trial (0 if expired).
 */
export function getDaysRemaining(): number {
  if (typeof window === 'undefined') return TRIAL_DAYS
  const start = parseInt(localStorage.getItem(TRIAL_START_KEY) || '0', 10)
  if (!start) return TRIAL_DAYS
  const elapsed = Date.now() - start
  const daysElapsed = elapsed / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.ceil(TRIAL_DAYS - daysElapsed))
}

/**
 * Returns true if the 7-day trial has expired.
 */
export function isTrialExpired(): boolean {
  if (typeof window === 'undefined') return false
  const tier = (localStorage.getItem(USER_TIER_KEY) || 'free') as Tier
  if (tier !== 'free') return false // paid users never expire
  return getDaysRemaining() === 0
}

/**
 * Get current trial state.
 */
export function getTrialState(): { daysRemaining: number; tier: Tier; expired: boolean } {
  if (typeof window === 'undefined') {
    return { daysRemaining: TRIAL_DAYS, tier: 'free', expired: false }
  }
  const tier = (localStorage.getItem(USER_TIER_KEY) || 'free') as Tier
  const daysRemaining = getDaysRemaining()
  return {
    daysRemaining,
    tier,
    expired: tier === 'free' && daysRemaining === 0,
  }
}

/**
 * Set tier in localStorage (called after login/subscription).
 */
export function setUserTier(tier: Tier): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_TIER_KEY, tier)
}

/**
 * Get human-readable trial status for UI.
 */
export function getRemainingText(): string {
  const { daysRemaining, tier } = getTrialState()
  if (tier !== 'free') return ''
  if (daysRemaining === 0) return 'Trial expired'
  if (daysRemaining === 1) return '1 day left in trial'
  return `${daysRemaining} days left in trial`
}

/**
 * Clear trial state (on logout).
 */
export function clearTrialState(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TRIAL_START_KEY)
  localStorage.removeItem(USER_TIER_KEY)
}

// Legacy exports for any consumers still using solve-counter API
// These are no-ops — kept to avoid import errors during migration
export function decrementSolve(): void {}
export function resetTrial(): void {}
