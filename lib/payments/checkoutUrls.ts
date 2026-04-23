/**
 * Centralized checkout URL config.
 * Single source of truth for LemonSqueezy product URLs.
 *
 * Home: $7.99/mo consumer tier — unlimited solves (no monthly cap).
 *   Tyler decision 2026-04-20. Gated behind NEXT_PUBLIC_HOME_CHECKOUT_URL.
 * Spotter: live product (variant active, buy_now_url hardcoded).
 * Operator: product 892634 / variant 1404897. LemonSqueezy checkout wired via
 *   NEXT_PUBLIC_OPERATOR_CHECKOUT_URL, BUT the in-app feature delta over
 *   Spotter (team seats / priority Deep Solve / management tooling) is not
 *   shipped yet. Tyler + Atlas decision 2026-04-23: keep Operator visible in
 *   the UI as "Coming soon" — don't take money until the post-payment
 *   experience is meaningfully different from Spotter. Flip
 *   OPERATOR_PUBLICLY_SELLABLE to true when the feature delta ships (TASK-064).
 */

export type Tier = 'home' | 'spotter' | 'operator'

export const CHECKOUT_URLS = {
  home: process.env.NEXT_PUBLIC_HOME_CHECKOUT_URL || null,
  spotter: 'https://gonrlabs.lemonsqueezy.com/checkout/buy/67c21a2e-ae15-4b25-9021-42c791f80325',
  operator: process.env.NEXT_PUBLIC_OPERATOR_CHECKOUT_URL || null,
} as const

export const OPERATOR_PRODUCT = {
  productId: 892634,
  variantId: 1404897,
  price: 9999,
  status: 'pending' as const,
} as const

// Flip to `true` when the Operator feature delta is live in-app (TASK-064).
// Until then, Operator stays visible in the ladder but shows "Coming soon"
// instead of accepting payment.
export const OPERATOR_PUBLICLY_SELLABLE = false

export function isCheckoutLive(tier: Tier): boolean {
  if (tier === 'operator' && !OPERATOR_PUBLICLY_SELLABLE) return false
  return CHECKOUT_URLS[tier] !== null && CHECKOUT_URLS[tier] !== ''
}

/**
 * Build a checkout URL with optional email prefill.
 * Returns null if the tier's checkout is gated (Operator pre-launch) or
 * the URL env var isn't set.
 */
export function buildCheckoutUrl(tier: Tier, email?: string): string | null {
  if (tier === 'operator' && !OPERATOR_PUBLICLY_SELLABLE) return null
  const baseUrl = CHECKOUT_URLS[tier]
  if (!baseUrl) return null
  if (!email) return baseUrl
  const sep = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${sep}checkout[email]=${encodeURIComponent(email)}`
}
