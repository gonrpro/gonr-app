import type { Tier, User } from '../types'
import { createServerSupabaseClient } from '../supabase/server'

const FOUNDER_EMAILS = ['tyler@gonr.pro', 'tyler@nexshift.co', 'twfyke@me.com']

// Re-export pure feature access for backward compatibility
export { canAccessFeature } from './features'

export async function resolveTier(email: string): Promise<User> {
  // Founder override
  if (FOUNDER_EMAILS.includes(email.toLowerCase())) {
    return {
      id: 'founder',
      email,
      tier: 'founder',
      isFounder: true,
      isActive: true,
    }
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, email, tier, status')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !data) {
      return {
        id: '',
        email,
        tier: 'free',
        isFounder: false,
        isActive: true,
      }
    }

    return {
      id: data.id,
      email: data.email,
      tier: (data.tier as Tier) || 'free',
      isFounder: false,
      isActive: data.status === 'active',
    }
  } catch {
    return {
      id: '',
      email,
      tier: 'free',
      isFounder: false,
      isActive: true,
    }
  }
}

