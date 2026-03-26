/**
 * Client-side trial state manager for free users
 * Manages free_solves counter in localStorage
 */

export type Tier = 'free' | 'home' | 'spotter' | 'operator' | 'founder'

const TRIAL_SOLVES_KEY = 'free_solves'
const USER_TIER_KEY = 'gonr_user_tier'
const INITIAL_SOLVES = 3

/**
 * Initialize trial state on first visit
 */
export function initializeTrialState(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(TRIAL_SOLVES_KEY) === null) {
    localStorage.setItem(TRIAL_SOLVES_KEY, String(INITIAL_SOLVES))
  }
}

/**
 * Get current trial state
 */
export function getTrialState(): { solvesRemaining: number; tier: Tier } {
  if (typeof window === 'undefined') {
    return { solvesRemaining: 0, tier: 'free' }
  }

  const solvesRemaining = parseInt(localStorage.getItem(TRIAL_SOLVES_KEY) || '3', 10)
  const tier = (localStorage.getItem(USER_TIER_KEY) || 'free') as Tier

  return {
    solvesRemaining: Math.max(0, solvesRemaining),
    tier,
  }
}

/**
 * Decrement solves remaining (called after successful solve)
 */
export function decrementSolve(): void {
  if (typeof window === 'undefined') return
  
  const current = parseInt(localStorage.getItem(TRIAL_SOLVES_KEY) || '3', 10)
  const newValue = Math.max(0, current - 1)
  localStorage.setItem(TRIAL_SOLVES_KEY, String(newValue))
}

/**
 * Set tier in localStorage (called after login)
 */
export function setUserTier(tier: Tier): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_TIER_KEY, tier)
}

/**
 * Get remaining text for UI display
 */
export function getRemainingText(): string {
  const { solvesRemaining } = getTrialState()
  if (solvesRemaining === 0) return 'No solves remaining'
  if (solvesRemaining === 1) return '1 solve remaining'
  return `${solvesRemaining} solves remaining`
}

/**
 * Clear trial state (on logout)
 */
export function clearTrialState(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TRIAL_SOLVES_KEY)
  localStorage.removeItem(USER_TIER_KEY)
}

/**
 * Reset trial to initial state
 */
export function resetTrial(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TRIAL_SOLVES_KEY, String(INITIAL_SOLVES))
}
