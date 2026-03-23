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
    // DEMO MODE: always operator tier — remove after launch
    setState({
      email: 'tyler@gonr.pro',
      tier: 'operator',
      isFounder: true,
      loading: false,
    })
  }, [])

  return state
}
