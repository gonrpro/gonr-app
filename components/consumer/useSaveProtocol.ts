'use client'

import { useCallback } from 'react'
import { useSessionEmail } from '@/components/consumer/useSessionEmail'
import type { EngineCard } from '@/components/consumer/screens/ResultsScreen'

// TASK-218 FRONTIER — Save-to-Library handler (screen 10 / BUILD-SPEC S5).
//
// The frontier never authors a protocol: this persists the FULL deterministic
// engine card (verdict + steps + safetyMatrix.neverDo + materialWarnings) exactly
// as /api/solve returned it, so the saved protocol_json is never steps-only. Email
// is resolved from the live session; a signed-out user gets 'needs-auth' so the CTA
// can invite sign-in instead of silently failing (no signup wall — the answer has
// already rendered).

export type SaveResult = 'saved' | 'needs-auth' | 'error'

export function useSaveProtocol(): (protocol: EngineCard) => Promise<SaveResult> {
  const { email } = useSessionEmail()
  return useCallback(
    async (protocol: EngineCard): Promise<SaveResult> => {
      if (!email) return 'needs-auth'
      try {
        const res = await fetch('/api/protocols/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, protocol }),
        })
        return res.ok ? 'saved' : 'error'
      } catch {
        return 'error'
      }
    },
    [email],
  )
}
