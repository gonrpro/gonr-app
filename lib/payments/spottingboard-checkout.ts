// lib/payments/spottingboard-checkout.ts
//
// Builds LemonSqueezy checkout URLs for SpottingBoard products.
//
// Atlas wiring decision (TASK-154 review 2026-05-07):
//   - Build code with env-driven variant/url only; do NOT hard-code prices.
//   - Starter Pack stays Tyler-approved before LS creation.
//
// Critical UX choice (design §6.3): every SpottingBoard checkout URL must
// carry `?checkout[custom][plant_id]=<uuid>` so the webhook can route the
// entitlement to the correct plant on first payment without guessing from
// the buyer's email. Email lookups break for users in multiple plants.

import type { SpottingBoardProduct } from '../entitlements/types'

const ENV_KEYS: Record<SpottingBoardProduct, string> = {
  spottingboard_pro: 'NEXT_PUBLIC_SBPRO_CHECKOUT_URL',
  plant_brain_runtime: 'NEXT_PUBLIC_PLANT_BRAIN_RUNTIME_CHECKOUT_URL',
  starter_pack: 'NEXT_PUBLIC_STARTER_PACK_CHECKOUT_URL',
}

export function isSpottingBoardCheckoutLive(product: SpottingBoardProduct): boolean {
  const url = process.env[ENV_KEYS[product]]
  return Boolean(url && url.length > 0)
}

/**
 * Builds the checkout URL for a SpottingBoard product. Always carries
 * `plant_id` as a custom data field so the webhook can route the entitlement.
 *
 * Returns null if the product's env-configured URL is not set.
 *
 * @param product   SpottingBoard SKU
 * @param plantId   UUID of the target plant (REQUIRED — without it, the
 *                  webhook cannot route the entitlement)
 * @param email     Optional checkout email prefill
 */
export function buildSpottingBoardCheckoutUrl(
  product: SpottingBoardProduct,
  plantId: string,
  email?: string,
): string | null {
  if (!plantId) return null
  const baseUrl = process.env[ENV_KEYS[product]]
  if (!baseUrl) return null

  const url = new URL(baseUrl)

  // LemonSqueezy custom-data convention: checkout[custom][<key>]=<value>
  url.searchParams.set('checkout[custom][plant_id]', plantId)
  url.searchParams.set('checkout[custom][product_key]', product)

  if (email) {
    url.searchParams.set('checkout[email]', email)
  }

  return url.toString()
}

/**
 * Returns env keys + presence flags for diagnostics / admin readiness check.
 * Useful for a /admin/spottingboard/billing-readiness page.
 */
export function spottingBoardCheckoutEnvStatus(): Array<{
  product: SpottingBoardProduct
  envKey: string
  configured: boolean
}> {
  return (Object.keys(ENV_KEYS) as SpottingBoardProduct[]).map((product) => ({
    product,
    envKey: ENV_KEYS[product],
    configured: Boolean(process.env[ENV_KEYS[product]]),
  }))
}
