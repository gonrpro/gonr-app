'use client'

// TASK-052 Stage C — /admin/ratings
// Internal triage page for the pro team. Minimal UI by design: two tables,
// one for underperforming cards, one for pending notes. Founder-only gate
// enforced by the backing APIs (page has no anon-safe state; a non-founder
// hitting it just sees "forbidden" badges).

import { useCallback, useEffect, useState } from 'react'

type UnderperformerRow = {
  card_id: string
  user_count: number
  user_avg_stars: number | null
  user_worked_pct: number | null
  seeded_count: number
  seed_sources: string[] | null
}

type PendingNoteRow = {
  id: string
  card_id: string
  rater_tier: string
  stars: number
  worked: 'yes' | 'no' | 'partial'
  note: string | null
  created_at: string
}

export default function AdminRatingsPage() {
  const [uploading, setUploading] = useState(true)
  const [ploading, setPloading] = useState(true)
  const [underperformers, setUnderperformers] = useState<UnderperformerRow[]>([])
  const [pending, setPending] = useState<PendingNoteRow[]>([])
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string>('')

  const loadUnderperformers = useCallback(async () => {
    setUploading(true)
    try {
      const res = await fetch('/api/admin/ratings/underperformers', { cache: 'no-store' })
      if (res.status === 403) {
        setForbidden(true)
        return
      }
      if (!res.ok) throw new Error(`http_${res.status}`)
      const data = await res.json()
      setUnderperformers((data.cards ?? []) as UnderperformerRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed')
    } finally {
      setUploading(false)
    }
  }, [])

  const loadPending = useCallback(async () => {
    setPloading(true)
    try {
      const res = await fetch('/api/admin/ratings/pending-notes', { cache: 'no-store' })
      if (res.status === 403) {
        setForbidden(true)
        return
      }
      if (!res.ok) throw new Error(`http_${res.status}`)
      const data = await res.json()
      setPending((data.pending ?? []) as PendingNoteRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed')
    } finally {
      setPloading(false)
    }
  }, [])

  useEffect(() => {
    loadUnderperformers()
    loadPending()
  }, [loadUnderperformers, loadPending])

  async function moderate(id: string, decision: 'approved' | 'rejected') {
    try {
      const res = await fetch('/api/admin/ratings/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      })
      if (!res.ok) throw new Error(`http_${res.status}`)
      // Optimistic drop from the pending list
      setPending((rows) => rows.filter((r) => r.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'moderate_failed')
    }
  }

  if (forbidden) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Admin — Ratings</h1>
        <p className="mt-2 text-sm" style={{ color: '#ef4444' }}>
          403 — not authorized. Sign in with a founder account.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">Admin — Ratings triage</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Internal dashboard. Underperforming canonical cards and pending community notes.
        </p>
        {error && (
          <p className="text-xs mt-2" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}
      </div>

      {/* Underperformers */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Underperforming cards
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {uploading ? 'loading…' : `${underperformers.length} need review`}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Threshold: user_worked_pct &lt; 70% or avg_stars &lt; 3.5, with at least 5 user ratings.
        </p>
        {!uploading && underperformers.length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
            Nothing flagged — all scored cards are above the threshold.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-2 pr-4">Card</th>
                  <th className="text-right py-2 pr-4">Ratings</th>
                  <th className="text-right py-2 pr-4">Avg ⭐</th>
                  <th className="text-right py-2 pr-4">Worked %</th>
                  <th className="text-right py-2">Seed sources</th>
                </tr>
              </thead>
              <tbody>
                {underperformers.map((row) => (
                  <tr key={row.card_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-4 font-mono text-xs">{row.card_id}</td>
                    <td className="py-2 pr-4 text-right">{row.user_count}</td>
                    <td className="py-2 pr-4 text-right">{row.user_avg_stars?.toFixed(2) ?? '—'}</td>
                    <td className="py-2 pr-4 text-right">{row.user_worked_pct ?? '—'}%</td>
                    <td className="py-2 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {row.seed_sources && row.seed_sources.length > 0 ? row.seed_sources.join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pending notes */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Pending notes
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {ploading ? 'loading…' : `${pending.length} awaiting review`}
          </span>
        </div>
        {!ploading && pending.length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
            No notes in the queue.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((row) => (
              <li
                key={row.id}
                className="rounded-lg p-3"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {row.card_id} · {row.rater_tier} · {row.worked} · {row.stars}⭐
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(row.created_at).toLocaleString()}
                  </div>
                </div>
                <p className="mt-1.5 text-sm whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
                  {row.note}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => moderate(row.id, 'approved')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md"
                    style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.3)' }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => moderate(row.id, 'rejected')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
