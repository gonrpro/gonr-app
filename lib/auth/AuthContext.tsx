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

    // TASK-233 — consumer beta has NO tiers: /api/auth/tier is deliberately
    // hard-closed by the consumer proxy (every call 404'd in prod, and the old
    // failure log printed the user's EMAIL to the console — the pressure
    // test's PII finding). Resolve 'free' locally; when Pro tiers become real,
    // rewire this through an allowed endpoint. NEVER log emails or account
    // identifiers here.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fetchAndSetTier = async (_email: string | null | undefined): Promise<void> => {
      setTier('free')
      setUserTier('free')
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
