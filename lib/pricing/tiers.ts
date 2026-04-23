// lib/pricing/tiers.ts — TASK-057a single pricing source of truth.
//
// Both TierGate (`/pro` pricing modal) and PaywallModal's `trial_expired`
// branch read from this file. Previously each component hardcoded its own
// TIERS array — that's how TierGate ended up without a Home card after
// TASK-050/051 shipped Home as the primary revenue path, and how
// `tierFeatureDiyProtocols` ended up rendered as a literal i18n key.
//
// Single source of truth for:
//   - tier order (Home first — primary revenue)
//   - display names + prices
//   - feature bullet copy
//   - CTA label
//   - badges (most-popular / coming-soon)
//   - checkout URL + availability (imported from checkoutUrls.ts)
//
// Display copy is plain English. Spanish parity is a later i18n pass; the
// shared source makes that pass trivial when we get to it (one dictionary
// keyed by tier.key → translations, applied at render time).

import { buildCheckoutUrl, isCheckoutLive, type Tier as PaymentTier } from '@/lib/payments/checkoutUrls'

export type TierKey = 'home' | 'spotter' | 'operator'

export type TierBadge = 'most_popular' | 'coming_soon' | null

export type TierDisplay = {
  /** Stable key used for analytics + payment routing */
  key: TierKey
  /** Display name (e.g. "Home", "Spotter", "Operator") */
  name: string
  /** Short 1-line description under the name */
  description: string
  /** Full price label (e.g. "$7.99/mo") */
  priceLabel: string
  /** Numeric price in dollars, for analytics + sorting */
  price: number
  /** Ordered feature bullets */
  features: string[]
  /** Primary CTA label */
  ctaLabel: string
  /** Badge to render on the card, if any */
  badge: TierBadge
  /** Tailwind border-color class for the card accent (used by TierGate) */
  accentBorderClass: string
  /** Tailwind background-tint class for the card (used by TierGate) */
  accentBgClass: string
  /** Get the checkout URL for this tier (null if not live yet) */
  getCheckoutUrl: (email?: string) => string | null
  /** Whether the checkout is currently live */
  isLive: () => boolean
}

/** The canonical tier order + display config. Home first — primary revenue path. */
export const TIERS: TierDisplay[] = [
  {
    key: 'home',
    name: 'Home',
    description: 'Confident stain removal at home',
    priceLabel: '$7.99/mo',
    price: 7.99,
    features: [
      'Unlimited solves',
      'Safe home-ingredient protocols',
      'Step-by-step guidance',
      'Cancel anytime',
    ],
    ctaLabel: 'Get GONR Home',
    badge: 'most_popular',
    accentBorderClass: 'border-green-500',
    accentBgClass: 'bg-green-500/5',
    getCheckoutUrl: (email) => buildCheckoutUrl('home' as PaymentTier, email),
    isLive: () => isCheckoutLive('home' as PaymentTier),
  },
  {
    key: 'spotter',
    name: 'Spotter',
    description: 'Full professional toolkit — one user',
    priceLabel: '$49/mo',
    price: 49,
    features: [
      'Everything in Home',
      'Full pro spotting protocols',
      'Stain Brain AI chat',
      'Deep Solve + garment analysis',
      'Customer handoff scripts',
      'Priority support',
    ],
    ctaLabel: 'Upgrade to Spotter',
    badge: null,
    accentBorderClass: 'border-amber-500',
    accentBgClass: 'bg-amber-500/5',
    getCheckoutUrl: (email) => buildCheckoutUrl('spotter' as PaymentTier, email),
    isLive: () => isCheckoutLive('spotter' as PaymentTier),
  },
  {
    key: 'operator',
    name: 'Operator',
    description: 'Built for the plant owner who runs the whole operation',
    priceLabel: '$99/mo',
    price: 99,
    features: [
      'Everything in Spotter',
      'Unlimited Deep Solve',
      'Team seats (up to 5)',
      'Custom protocol library',
      'API access',
      'White-glove onboarding',
    ],
    ctaLabel: 'Upgrade to Operator',
    badge: 'coming_soon',
    accentBorderClass: 'border-purple-500',
    accentBgClass: 'bg-purple-500/5',
    getCheckoutUrl: (email) => buildCheckoutUrl('operator' as PaymentTier, email),
    isLive: () => isCheckoutLive('operator' as PaymentTier),
  },
]

/** Lookup helper */
export function getTier(key: TierKey): TierDisplay | undefined {
  return TIERS.find((t) => t.key === key)
}

/** Convenience: the tiers that should render in a pricing grid, in display order. */
export function getVisibleTiers(): TierDisplay[] {
  return TIERS
}

/** Badge → display-text + Tailwind style-class tuple. Keeps badge styling consistent across surfaces. */
export function getBadgeDisplay(badge: TierBadge): { text: string; className: string } | null {
  if (badge === 'most_popular') {
    return {
      text: 'Most popular',
      className: 'bg-green-500 text-white',
    }
  }
  if (badge === 'coming_soon') {
    return {
      text: 'Coming soon',
      className: 'bg-amber-500 text-white',
    }
  }
  return null
}
