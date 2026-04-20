/**
 * Centralized checkout URL config.
 * Single source of truth for LemonSqueezy product URLs.
 *
 * Home: $9.99/mo consumer tier. Gated behind NEXT_PUBLIC_HOME_CHECKOUT_URL;
 *   /auth/signup surfaces a friendly notice when the env var is not set.
 * Spotter: live product (variant active, buy_now_url ready).
 * Operator: product 892634 / variant 1404897 — variant status `pending` in
 *   LemonSqueezy, no live buy_now_url yet. Stays gated until the env var is set.
 *
 * To activate Home or Operator after LemonSqueezy publishes the buy_now_url:
 *   1. Set NEXT_PUBLIC_HOME_CHECKOUT_URL / NEXT_PUBLIC_OPERATOR_CHECKOUT_URL in Vercel
 *   2. Redeploy. The signup page and PaywallModal switch automatically.
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

export function isCheckoutLive(tier: Tier): boolean {
  return CHECKOUT_URLS[tier] !== null && CHECKOUT_URLS[tier] !== ''
}

/**
 * Build a checkout URL with optional email prefill.
 * Returns null if the tier's checkout is not live yet (Operator pre-launch).
 */
export function buildCheckoutUrl(tier: Tier, email?: string): string | null {
  const baseUrl = CHECKOUT_URLS[tier]
  if (!baseUrl) return null
  if (!email) return baseUrl
  const sep = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${sep}checkout[email]=${encodeURIComponent(email)}`
}
