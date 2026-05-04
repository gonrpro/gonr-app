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

// TASK-142 Step 2 (C3): retry-poll schedule when post-checkout race is in play.
// Total wait budget ~7.5s, then accept whatever tier we have.
const LS_RETRY_DELAYS_MS = [0, 500, 1000, 2000, 4000] as const

/**
 * Client-side hook to get the current user's email and tier.
 *
 * Logic:
 * 1. initializeTrialState() is a legacy no-op (7-day trial was removed in
 *    TASK-027; canonical gate is the 3-free-solve counter in /api/solve).
 * 2. Check Supabase session for logged-in email.
 * 3. If logged in → POST /api/auth/tier to resolve tier from Supabase subscriptions.
 * 4. If not logged in → 'free' tier, gate via /api/usage (solve count, not day count).
 *
 * TASK-142 Step 2 (C3): if URL has `?ls_completed=1` AND tier comes back 'free'
 * for a logged-in user, retry-poll the tier endpoint with backoff. The LS
 * webhook may not have committed the subscription row by the time the user
 * lands back on the app from checkout — without the poll, the user sees a
 * paywall after they've already paid until they refresh. After resolution
 * (success OR retry exhaustion) the `ls_completed` query param is stripped so
 * a manual refresh doesn't re-poll.
 *
 * Founder override: handled server-side in resolveTier (tyler@gonr.pro → founder).
 * `trialDaysRemaining` on the returned state is retained as 0/7 for legacy callers
 * but no longer drives any gate — safe to remove once all consumers migrate off it.
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

    let cancelled = false

    async function fetchTier(): Promise<{ tier: Tier; isFounder: boolean } | null> {
      try {
        const res = await fetch('/api/auth/tier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (!res.ok) return null
        const json = await res.json()
        return { tier: json.tier as Tier, isFounder: json.isFounder ?? false }
      } catch {
        return null
      }
    }

    function clearLsCompletedParam(): void {
      try {
        const url = new URL(window.location.href)
        if (!url.searchParams.has('ls_completed')) return
        url.searchParams.delete('ls_completed')
        const cleanQs = url.searchParams.toString()
        const cleanUrl =
          window.location.pathname + (cleanQs ? `?${cleanQs}` : '') + window.location.hash
        window.history.replaceState({}, '', cleanUrl)
      } catch {
        // history API not available (SSR or strict sandbox) — non-fatal
      }
    }

    async function resolveUser() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user?.email) {
          // Not logged in — use trial state
          const daysRemaining = getDaysRemaining()
          if (!cancelled) {
            setState({
              email: null,
              tier: 'free',
              isFounder: false,
              loading: false,
              trialDaysRemaining: daysRemaining,
            })
          }
          return
        }

        const email = session.user.email
        const lsCompleted =
          typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).has('ls_completed')

        // Single attempt unless we're handling a post-checkout race.
        const delays = lsCompleted ? LS_RETRY_DELAYS_MS : ([0] as const)

        let resolved: { tier: Tier; isFounder: boolean } | null = null
        for (const delay of delays) {
          if (cancelled) return
          if (delay > 0) await new Promise((r) => setTimeout(r, delay))
          const result = await fetchTier()
          if (!result) continue
          resolved = result
          // Stop polling early if tier is no longer free, or if we weren't
          // waiting on ls_completed in the first place.
          if (result.tier !== 'free' || !lsCompleted) break
        }

        if (cancelled) return

        if (resolved) {
          setState({
            email,
            tier: resolved.tier,
            isFounder: resolved.isFounder,
            loading: false,
            trialDaysRemaining: 0, // logged-in users don't use trial gate
          })
          if (lsCompleted) clearLsCompletedParam()
          return
        }

        // All fetch attempts failed — fall through to safe default below.
        throw new Error('tier resolution failed after retries')
      } catch {
        // Safe fallback: unauthenticated free user
        if (cancelled) return
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

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
