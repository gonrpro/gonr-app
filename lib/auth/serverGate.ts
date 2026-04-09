import { createClient } from '@supabase/supabase-js'

const FOUNDER_EMAILS = ['tyler@gonr.pro', 'tyler@nexshift.co', 'twfyke@me.com']
const PRO_TIERS = ['spotter', 'operator', 'founder']

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

/**
 * Server-side check: is this email authorized for pro features?
 * Returns { allowed: true, tier } or { allowed: false, reason }.
 */
export async function checkProAccess(email: string | null | undefined): Promise<{
  allowed: boolean
  tier?: string
  reason?: string
}> {
  if (!email) return { allowed: false, reason: 'login_required' }

  const normalizedEmail = email.toLowerCase()

  // Founder bypass
  if (FOUNDER_EMAILS.includes(normalizedEmail)) {
    return { allowed: true, tier: 'founder' }
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, tier')
      .eq('email', normalizedEmail)
      .single()

    if (subscription && subscription.status === 'active' && PRO_TIERS.includes(subscription.tier)) {
      return { allowed: true, tier: subscription.tier }
    }

    return { allowed: false, reason: 'tier_required' }
  } catch {
    // If Supabase fails, deny access (fail closed)
    return { allowed: false, reason: 'auth_error' }
  }
}
