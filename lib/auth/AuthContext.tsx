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
    const supabase = createClient()

    // Check current session
    const checkSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()

        setSession(currentSession)
        setUser(currentSession?.user || null)

        // If logged in, fetch tier from API
        if (currentSession?.user) {
          try {
            const res = await fetch('/api/auth/tier', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: currentSession.user.email }),
            })

            if (res.ok) {
              const data = await res.json()
              const userTier = data.tier as Tier
              setTier(userTier)
              setUserTier(userTier)
            }
          } catch (err) {
            console.error('Failed to fetch user tier:', err)
          }
        }
      } catch (err) {
        console.error('Failed to check session:', err)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user || null)

      if (newSession?.user) {
        // Fetch updated tier
        try {
          const res = await fetch('/api/auth/tier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: newSession.user.email }),
          })

          if (res.ok) {
            const data = await res.json()
            const userTier = data.tier as Tier
            setTier(userTier)
            setUserTier(userTier)
          }
        } catch (err) {
          console.error('Failed to fetch user tier on auth change:', err)
        }
      } else {
        setTier('free')
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
 * Hook to access session only (lighter weight)
 */
export function useSession(): { session: Session | null; isLoading: boolean } {
  const { session, isLoading } = useAuth()
  return { session, isLoading }
}
