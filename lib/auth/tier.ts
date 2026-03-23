import type { Tier, User } from '../types'
import { createServerSupabaseClient } from '../supabase/server'

const FOUNDER_EMAIL = 'tyler@gonr.pro'

// Re-export pure feature access for backward compatibility
export { canAccessFeature } from './features'

export async function resolveTier(email: string): Promise<User> {
  // Founder override
  if (email.toLowerCase() === FOUNDER_EMAIL) {
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
      .select('id, email, tier, is_active')
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
      isActive: data.is_active ?? true,
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

