'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tier } from '@/lib/types'

interface UserState {
  email: string | null
  tier: Tier
  isFounder: boolean
  loading: boolean
}

/**
 * Client-side hook to get the current user's email and tier.
 * Reads Supabase session from cookies, then fetches tier from /api/auth/tier.
 */
export function useUser(): UserState {
  const [state, setState] = useState<UserState>({
    email: null,
    tier: 'free',
    isFounder: false,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user?.email) {
          if (!cancelled) setState({ email: null, tier: 'free', isFounder: false, loading: false })
          return
        }

        const email = session.user.email

        // Fetch tier from server
        const res = await fetch('/api/auth/tier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setState({
              email,
              tier: data.tier || 'free',
              isFounder: data.isFounder || false,
              loading: false,
            })
          }
        } else {
          if (!cancelled) setState({ email, tier: 'free', isFounder: false, loading: false })
        }
      } catch {
        if (!cancelled) setState(prev => ({ ...prev, loading: false }))
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return state
}
