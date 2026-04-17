'use client'

// app/history/page.tsx — TASK-043 Slice 4
// Solve History view. Reads GET /api/solves/history and renders a scrollable
// list of recent solves with outcome badges. Filters: stain, surface, outcome.
//
// Auth: cookie-based via the API. 401 → "sign in to view history" state.
// Not a tab on /saved — this lives at its own route per Atlas's call.

import { useCallback, useEffect, useState } from 'react'

interface HistoryRow {
  correlation_id: string
  stain: string | null
  surface: string | null
  procedure_id: string | null
  procedure_type: string | null
  source: string | null
  confidence: number | null
  tier: number | null
  served_at: string
  outcome: string | null
  outcome_notes: string | null
  outcome_reported_at: string | null
}

type OutcomeFilter = '' | 'solved' | 'partial' | 'failed' | 'escalated'

const OUTCOME_OPTIONS: Array<{ value: OutcomeFilter; label: string }> = [
  { value: '', label: 'All' },
  { value: 'solved', label: 'Solved' },
  { value: 'partial', label: 'Partial' },
  { value: 'failed', label: 'Failed' },
  { value: 'escalated', label: 'Escalated' },
]

function outcomeBadge(outcome: string | null) {
  if (!outcome) {
    return { label: 'No report', bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)' }
  }
  if (outcome === 'solved') return { label: 'Solved', bg: 'rgba(34,197,94,0.12)', color: '#22c55e' }
  if (outcome === 'partial') return { label: 'Partial', bg: 'rgba(234,179,8,0.14)', color: '#eab308' }
  if (outcome === 'failed') return { label: 'Failed', bg: 'rgba(220,38,38,0.12)', color: 'var(--danger)' }
  if (outcome === 'escalated') return { label: 'Escalated', bg: 'rgba(147,51,234,0.12)', color: 'var(--purple)' }
  return { label: outcome, bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)' }
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [stainFilter, setStainFilter] = useState('')
  const [surfaceFilter, setSurfaceFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (stainFilter.trim()) params.set('stain', stainFilter.trim())
      if (surfaceFilter.trim()) params.set('surface', surfaceFilter.trim())
      if (outcomeFilter) params.set('outcome', outcomeFilter)

      const res = await fetch(`/api/solves/history?${params.toString()}`, { credentials: 'include' })
      if (res.status === 401) {
        setAuthRequired(true)
        setRows([])
        return
      }
      const data = await res.json()
      if (!data.ok) {
        setError(data.error || 'request_failed')
        setRows([])
        return
      }
      setAuthRequired(false)
      setRows(data.results || [])
    } catch {
      setError('network_error')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [stainFilter, surfaceFilter, outcomeFilter])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
          Solve History
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {loading ? 'Loading…' : `${rows.length} recent ${rows.length === 1 ? 'solve' : 'solves'}`}
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={stainFilter}
            onChange={e => setStainFilter(e.target.value)}
            placeholder="Filter stain…"
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <input
            value={surfaceFilter}
            onChange={e => setSurfaceFilter(e.target.value)}
            placeholder="Filter surface…"
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {OUTCOME_OPTIONS.map(o => {
            const active = outcomeFilter === o.value
            return (
              <button
                key={o.value || 'all'}
                onClick={() => setOutcomeFilter(o.value)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: active ? 'var(--accent-soft)' : 'var(--surface)',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  border: `1px solid ${active ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                }}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Auth required */}
      {authRequired && (
        <div className="text-center py-12 space-y-2">
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Sign in to view your solve history
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            History is scoped to your account and plant
          </p>
        </div>
      )}

      {/* Error */}
      {error && !authRequired && (
        <div className="rounded-lg p-3 text-xs"
          style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--danger)' }}>
          Couldn&apos;t load history: {error}
        </div>
      )}

      {/* Loading */}
      {loading && !authRequired && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !authRequired && !error && rows.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            No solves yet
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {(stainFilter || surfaceFilter || outcomeFilter)
              ? 'Try clearing filters'
              : 'Run a solve and your history will appear here'}
          </p>
        </div>
      )}

      {/* Rows */}
      {!loading && !authRequired && rows.map(r => {
        const badge = outcomeBadge(r.outcome)
        const expanded = expandedId === r.correlation_id
        return (
          <div
            key={r.correlation_id}
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}
          >
            <button
              onClick={() => setExpandedId(expanded ? null : r.correlation_id)}
              className="w-full text-left px-4 py-3 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                    {[r.stain, r.surface].filter(Boolean).join(' · ') || 'Solve'}
                  </p>
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {formatWhen(r.served_at)}
                  {r.tier ? ` · Tier ${r.tier}` : ''}
                  {r.source ? ` · ${r.source}` : ''}
                </p>
              </div>
              <span
                className={`transition-transform duration-200 mt-1 ${expanded ? 'rotate-180' : ''}`}
                style={{ color: 'var(--text-secondary)' }}
              >
                &#9662;
              </span>
            </button>

            {expanded && (
              <div className="px-4 py-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="text-[11px] space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  {r.procedure_type && (
                    <p>Procedure type: <span style={{ color: 'var(--text)' }}>{r.procedure_type}</span></p>
                  )}
                  {r.procedure_id && (
                    <p>Procedure: <span style={{ color: 'var(--text)' }}>{r.procedure_id}</span></p>
                  )}
                  {typeof r.confidence === 'number' && (
                    <p>Confidence: <span style={{ color: 'var(--text)' }}>{Math.round(r.confidence * 100)}%</span></p>
                  )}
                  {r.outcome_reported_at && (
                    <p>Reported: <span style={{ color: 'var(--text)' }}>{formatWhen(r.outcome_reported_at)}</span></p>
                  )}
                  {r.outcome_notes && (
                    <p className="mt-2 p-2 rounded" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
                      {r.outcome_notes}
                    </p>
                  )}
                </div>
                <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                  {r.correlation_id}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
