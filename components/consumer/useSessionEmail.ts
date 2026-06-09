'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getStoredUserEmail } from '@/lib/auth/clientEmail'

// TASK-218 SHARED FOUNDATION — resolve the consumer's email client-side.
// The consumer data APIs (/api/profile, /api/protocols/saved) key off email,
// while /api/solves/history reads the session cookie. This hook resolves the
// authenticated Supabase email (source of truth) and falls back to the locally
// stored address so a returning device still sees its saved library before the
// session rehydrates. Mirrors the legacy profile page's auth pattern.

export interface SessionEmailState {
  /** Lower-cased email, or null when signed out / unknown. */
  email: string | null
  /** True until the first auth check resolves. */
  loading: boolean
}

export function useSessionEmail(): SessionEmailState {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const supabase = createClient()

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return
        setEmail(data.user?.email?.toLowerCase() ?? getStoredUserEmail() ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setEmail(getStoredUserEmail() ?? null)
        setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setEmail(session?.user?.email?.toLowerCase() ?? getStoredUserEmail() ?? null)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { email, loading }
}
