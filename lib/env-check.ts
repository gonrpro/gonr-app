// TASK-142 Step 2 (C2): boot-time env-var validator.
//
// Throws at module load if any required env var is missing. This causes the
// route handler module to fail on first request rather than silently mis-handling
// real LemonSqueezy events. Symptom shifts from "customer paid, no subscription
// row" to "Vercel function 500 on every request to this route" — observable
// immediately via deploy smoke test or Vercel monitoring.
//
// Usage:
//   import { assertRequiredEnv, REQUIRED_LS_WEBHOOK_ENV } from '@/lib/env-check'
//   assertRequiredEnv(REQUIRED_LS_WEBHOOK_ENV, 'LemonSqueezy webhook')

export function assertRequiredEnv(vars: readonly string[], context: string): void {
  const missing = vars.filter((v) => !process.env[v])
  if (missing.length > 0) {
    throw new Error(
      `[env-check] ${context}: missing required env var(s): ${missing.join(', ')}. ` +
        `Set in Vercel project env or local .env.local before deploy.`,
    )
  }
}

export const REQUIRED_LS_WEBHOOK_ENV = [
  'LEMONSQUEEZY_WEBHOOK_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

export const REQUIRED_TIER_AUTH_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

// Variant IDs are not strictly required (webhook falls back to product-name
// match) but missing them increases mis-tier risk. Logged as warning, not throw.
const RECOMMENDED_LS_VARIANT_ENV = [
  'LS_HOME_VARIANT_ID',
  'LS_SPOTTER_VARIANT_ID',
  'LS_OPERATOR_VARIANT_ID',
] as const

export function warnRecommendedLsVariantEnv(): void {
  const missing = RECOMMENDED_LS_VARIANT_ENV.filter((v) => !process.env[v])
  if (missing.length > 0) {
    console.warn(
      `[env-check] LS variant ID(s) not set: ${missing.join(', ')}. ` +
        `Webhook will fall back to product-name substring matching for these tiers.`,
    )
  }
}
