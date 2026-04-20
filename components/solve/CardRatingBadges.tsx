'use client'

// TASK-052 Stage B — CardRatingBadges.
//
// Renders at the top of the result card. Three possible badges, each with
// strict rules locked by Atlas 2026-04-20:
//
//   1. "GONR Lab tested"  — green trust badge. Fires only when the card has
//      `internal_eval` or `gonr_lab` seed signal. NEVER fires on pilot-only.
//   2. "Pilot tested"     — amber tag. Fires only when `pilot` seed signal is
//      present (and `gonr_lab_tested` is not). Intentionally a visually
//      lower-weight badge so it cannot read as canonical/pro validation.
//   3. Community rating   — ⭐ avg · worked % · rating count. Shown only when
//      user_count >= display_threshold (default 5). Seeded signal NEVER
//      blurs into these numbers (server-filtered at the aggregate view).
//      Below threshold: "Be one of the first to rate this" invitation.
//
// The aggregate is fetched lazily on mount. Empty state = soft invitation.

import { useEffect, useState } from 'react'
import { fetchRatingAggregate, type RatingAggregate } from '@/lib/ratings/fetch'

export default function CardRatingBadges({ cardId }: { cardId: string | undefined }) {
  const [agg, setAgg] = useState<RatingAggregate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cardId) return
    const ctl = new AbortController()
    setLoading(true)
    fetchRatingAggregate(cardId, ctl.signal).then((data) => {
      setAgg(data)
      setLoading(false)
    })
    return () => ctl.abort()
  }, [cardId])

  if (!cardId || loading) return null
  if (!agg) return null

  const { user_count, user_avg_stars, user_worked_pct, display_ready, gonr_lab_tested, pilot_tested } = agg

  // Nothing to show — no seed signal and no community ratings yet.
  if (!gonr_lab_tested && !pilot_tested && user_count === 0) {
    return (
      <div className="px-4 pt-3">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full"
          style={{
            border: '1px dashed var(--border)',
            color: 'var(--text-secondary)',
            background: 'transparent',
          }}
        >
          Be one of the first to rate this protocol
        </span>
      </div>
    )
  }

  return (
    <div className="px-4 pt-3 flex flex-wrap gap-1.5 items-center">
      {gonr_lab_tested && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
          style={{
            background: 'rgba(34,197,94,0.1)',
            color: 'var(--accent)',
            border: '1px solid rgba(34,197,94,0.3)',
          }}
          title="Verified by the GONR team"
        >
          <span aria-hidden="true">✓</span>
          GONR Lab tested
        </span>
      )}

      {pilot_tested && !gonr_lab_tested && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full"
          style={{
            background: 'rgba(245,158,11,0.08)',
            color: '#92400e',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
          title="Tested by a GONR pilot cleaner — not yet verified by the GONR team"
        >
          <span aria-hidden="true">◆</span>
          Pilot tested
        </span>
      )}

      {display_ready && user_avg_stars !== null && user_worked_pct !== null ? (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full"
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
          title={`Based on ${user_count} community rating${user_count === 1 ? '' : 's'}`}
        >
          <span aria-hidden="true">⭐</span>
          {user_avg_stars.toFixed(1)}
          <span style={{ opacity: 0.6 }}>·</span>
          {user_worked_pct}% said this worked
          <span style={{ opacity: 0.6 }}>·</span>
          {user_count} rating{user_count === 1 ? '' : 's'}
        </span>
      ) : user_count > 0 ? (
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full"
          style={{
            border: '1px dashed var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          Be one of the first to rate this protocol
        </span>
      ) : null}
    </div>
  )
}
