'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { initializeTrialState, getDaysRemaining } from '@/lib/auth/trialGuard'
import type { Tier } from '@/lib/types'

interface UserState {
  email: string | null
  tier: Tier
  isFounder: boolean
  loading: boolean
  trialDaysRemaining: number
}

/**
 * Client-side hook to get the current user's email and tier.
 *
 * Logic:
 * 1. Initialize 7-day trial (sets start date in localStorage if first visit)
 * 2. Check Supabase session for logged-in email
 * 3. If logged in → POST /api/auth/tier to resolve tier from Supabase subscriptions
 * 4. If not logged in → 'free' tier, trial gate via trialGuard
 *
 * Founder override: handled server-side in resolveTier (tyler@gonr.pro → founder)
 */
export function useUser(): UserState {
  const [state, setState] = useState<UserState>({
    email: null,
    tier: 'free',
    isFounder: false,
    loading: true,
    trialDaysRemaining: 7,
  })

  useEffect(() => {
    // Always initialize trial on mount (no-op if already initialized)
    initializeTrialState()

    async function resolveUser() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user?.email) {
          // Not logged in — use trial state
          const daysRemaining = getDaysRemaining()
          setState({
            email: null,
            tier: 'free',
            isFounder: false,
            loading: false,
            trialDaysRemaining: daysRemaining,
          })
          return
        }

        const email = session.user.email

        // Resolve tier from server (Supabase subscriptions + founder override)
        const res = await fetch('/api/auth/tier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        if (!res.ok) throw new Error('Tier resolution failed')

        const { tier, isFounder } = await res.json()

        setState({
          email,
          tier: tier as Tier,
          isFounder: isFounder ?? false,
          loading: false,
          trialDaysRemaining: 0, // logged-in users don't use trial gate
        })
      } catch {
        // Safe fallback: unauthenticated free user
        const daysRemaining = getDaysRemaining()
        setState({
          email: null,
          tier: 'free',
          isFounder: false,
          loading: false,
          trialDaysRemaining: daysRemaining,
        })
      }
    }

    resolveUser()
  }, [])

  return state
}
