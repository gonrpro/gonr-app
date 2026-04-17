'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { setUserTier, type Tier } from '@/lib/auth/trialGuard'

interface AuthContextType {
  session: Session | null
  user: SupabaseUser | null
  tier: Tier
  isLoading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * AuthProvider component - wrap your app with this
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [tier, setTier] = useState<Tier>('free')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('Supabase not configured, skipping auth initialization')
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    // Shared tier-fetch helper. On failure, logs loudly and leaves tier UNCHANGED
    // rather than silently downgrading a paid user to 'free'. Silent downgrade was
    // the root of the results-page CTA bug (TASK-022): a transient backend hiccup
    // flipped a founder into 'free' and surfaced the upgrade CTA.
    const fetchAndSetTier = async (email: string | null | undefined): Promise<void> => {
      if (!email) {
        setTier('free')
        setUserTier('free')
        return
      }
      try {
        const res = await fetch('/api/auth/tier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (!res.ok) {
          console.error('[Auth] tier fetch failed', res.status, 'for', email, '— leaving tier unchanged')
          return
        }
        const data = await res.json()
        const resolved = data.tier as Tier | undefined
        if (!resolved) {
          console.error('[Auth] tier fetch returned empty tier for', email, '— leaving tier unchanged')
          return
        }
        setTier(resolved)
        setUserTier(resolved)
      } catch (err) {
        console.error('[Auth] tier fetch threw for', email, err, '— leaving tier unchanged')
      }
    }

    // Initial session check
    const checkSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()

        setSession(currentSession)
        setUser(currentSession?.user || null)
        await fetchAndSetTier(currentSession?.user?.email)
      } catch (err) {
        console.error('Failed to check session:', err)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes. Critical: wrap the whole handler in
    // setIsLoading(true) / finally setIsLoading(false) so consumers see a
    // consistent loading state across the tier-resolve window. Before this
    // fix, onAuthStateChange left isLoading=false during the fetch, which
    // meant consumers could render with user=founder + tier='free' (stale)
    // + loading=false — exactly the results-page CTA bug.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setIsLoading(true)
      try {
        setSession(newSession)
        setUser(newSession?.user || null)
        if (newSession?.user) {
          await fetchAndSetTier(newSession.user.email)
        } else {
          setTier('free')
          setUserTier('free')
        }
      } finally {
        setIsLoading(false)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setTier('free')
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        tier,
        isLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

/**
 * Hook that returns auth context if available, or safe defaults if outside AuthProvider.
 */
export function useOptionalAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    return { session: null, user: null, tier: 'free', isLoading: false, logout: async () => {} }
  }
  return context
}

/**
 * Hook to access session only (lighter weight)
 */
export function useSession(): { session: Session | null; isLoading: boolean } {
  const { session, isLoading } = useAuth()
  return { session, isLoading }
}
