// lib/solve/reviewQueue.ts
//
// Write-side helper for the solve review queue (`public.solve_review_queue`).
// Every /api/solve call should log one row here — that data stream is our
// "what verified cards do we still need to author?" signal and feeds the
// promotion pipeline (Atlas 8088 + 8090).
//
// Fire-and-forget semantics: the helper swallows all errors. A telemetry
// log must never break the main /api/solve response path.

import { createClient } from '@supabase/supabase-js'

export interface SolveReviewEntry {
  queryRaw: string
  stain: string | null
  surface: string | null
  tierRequested: string
  matchedCardKey: string | null
  usedAiFallback: boolean
  userId: string | null
  sessionId: string | null
}

export function logSolveReview(entry: SolveReviewEntry): void {
  // Don't let telemetry slow down the request. Resolve or reject silently.
  ;(async () => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) return
      const supabase = createClient(url, key, { auth: { persistSession: false } })
      await supabase.from('solve_review_queue').insert({
        query_raw: entry.queryRaw.slice(0, 2000),
        stain: entry.stain,
        surface: entry.surface,
        tier_requested: entry.tierRequested,
        matched_card_key: entry.matchedCardKey,
        used_ai_fallback: entry.usedAiFallback,
        user_id: entry.userId,
        session_id: entry.sessionId,
      })
    } catch {
      // Swallow — telemetry never breaks the main flow.
    }
  })()
}
