'use client'

// app/admin/review-queue/page.tsx
//
// Founder-only read surface for solve_review_queue. Three tables:
//   Top Uncovered — stain × surface combos with no canonical match (authoring
//                   priority; pro-tier frequency weighted first)
//   Pro-Tier Misses — last 50 Spotter/Operator queries that hit the gate
//   Recent Activity — last 50 solve requests, any tier
//
// Minimal UI by design. The data is the point. Founder gate enforced by the
// backing API.

import { useCallback, useEffect, useState } from 'react'

type QueueRow = {
  id: string
  created_at: string
  query_raw: string | null
  stain: string | null
  surface: string | null
  tier_requested: string | null
  matched_card_key: string | null
  used_ai_fallback: boolean
  user_id: string | null
  session_id: string | null
  resolved_at: string | null
  promoted_card_key: string | null
}

type UncoveredAgg = {
  stain: string | null
  surface: string | null
  count: number
  last_seen: string
  pro_tier_count: number
}

interface QueueResponse {
  recent: QueueRow[]
  proMisses: QueueRow[]
  topUncovered: UncoveredAgg[]
  _tableMissing?: boolean
  _migrationPath?: string
}

function fmtTs(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-[10px] text-gray-400">—</span>
  const colors: Record<string, string> = {
    spotter: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
    operator: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    home: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    free: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    anon: 'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/30',
    founder: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  }
  const cls = colors[tier] ?? 'bg-slate-500/10 text-slate-600 border-slate-500/30'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${cls}`}>
      {tier}
    </span>
  )
}

export default function AdminReviewQueuePage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<QueueResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [forbidden, setForbidden] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/review-queue', { cache: 'no-store' })
      if (res.status === 403) {
        setForbidden(true)
        return
      }
      if (!res.ok) throw new Error(`http_${res.status}`)
      const json = (await res.json()) as QueueResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (forbidden) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
        <p className="text-sm">Forbidden — founder only.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Review Queue</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Every solve request is logged here. Pro-tier misses and high-frequency uncovered combos are the &ldquo;what to author next&rdquo; signal.
        </p>
        <button
          onClick={load}
          className="mt-3 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
        >
          {loading ? 'loading…' : '↻ refresh'}
        </button>
      </div>

      {data?._tableMissing && (
        <div
          className="rounded-xl p-4 text-sm leading-relaxed space-y-2"
          style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', color: 'var(--text)' }}
        >
          <p>
            <span className="font-semibold">Migration not applied yet.</span> The <code>solve_review_queue</code> table
            doesn&apos;t exist in the Supabase database. Every <code>/api/solve</code> call tries to write but the writes
            silently fail.
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            Apply the migration: run the SQL in <code>{data._migrationPath}</code> via the Supabase dashboard SQL editor.
            Data will start flowing immediately. No app redeploy required.
          </p>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl p-3 text-xs"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626' }}
        >
          Load failed: {error}
        </div>
      )}

      {/* ── Top Uncovered ── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text)' }}>
            Top Uncovered (last 30 days)
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Stain × surface combos with no canonical match. Sorted by pro-tier frequency first, then total frequency.
            These are your authoring priorities.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
              <tr>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">Stain</th>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">Surface</th>
                <th className="text-right px-3 py-2 font-mono font-bold uppercase tracking-wider">Pro Hits</th>
                <th className="text-right px-3 py-2 font-mono font-bold uppercase tracking-wider">Total</th>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {!data?.topUncovered?.length && (
                <tr><td colSpan={5} className="text-center py-6" style={{ color: 'var(--text-secondary)' }}>
                  {loading ? 'loading…' : 'no uncovered queries yet'}
                </td></tr>
              )}
              {data?.topUncovered?.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text)' }}>{row.stain ?? '—'}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{row.surface ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: row.pro_tier_count > 0 ? '#dc2626' : 'var(--text-secondary)' }}>
                    {row.pro_tier_count}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text)' }}>{row.count}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{fmtTs(row.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Pro-Tier Misses ── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text)' }}>
            Pro-Tier Misses (last 50)
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Spotter and Operator queries that hit the verified-only gate. Every one of these saw <em>&ldquo;No verified protocol yet&rdquo;</em> — author a canonical card to close it.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
              <tr>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">When</th>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">Tier</th>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">Stain</th>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">Surface</th>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">Query</th>
              </tr>
            </thead>
            <tbody>
              {!data?.proMisses?.length && (
                <tr><td colSpan={5} className="text-center py-6" style={{ color: 'var(--text-secondary)' }}>
                  {loading ? 'loading…' : 'no pro-tier misses yet'}
                </td></tr>
              )}
              {data?.proMisses?.map(row => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-3 py-2 font-mono whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{fmtTs(row.created_at)}</td>
                  <td className="px-3 py-2"><TierBadge tier={row.tier_requested} /></td>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text)' }}>{row.stain ?? '—'}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{row.surface ?? '—'}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{row.query_raw ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Recent ── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text)' }}>
            Recent Activity (last 50)
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            All solve requests regardless of tier or outcome. AI-fallback and matched rows included.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
              <tr>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">When</th>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">Tier</th>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">Stain / Surface</th>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">Matched</th>
                <th className="text-left px-3 py-2 font-mono font-bold uppercase tracking-wider">AI?</th>
              </tr>
            </thead>
            <tbody>
              {!data?.recent?.length && (
                <tr><td colSpan={5} className="text-center py-6" style={{ color: 'var(--text-secondary)' }}>
                  {loading ? 'loading…' : 'no solve activity yet'}
                </td></tr>
              )}
              {data?.recent?.map(row => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-3 py-2 font-mono whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{fmtTs(row.created_at)}</td>
                  <td className="px-3 py-2"><TierBadge tier={row.tier_requested} /></td>
                  <td className="px-3 py-2" style={{ color: 'var(--text)' }}>
                    <span className="font-medium">{row.stain ?? '—'}</span>
                    {row.surface && <span style={{ color: 'var(--text-secondary)' }}> on {row.surface}</span>}
                  </td>
                  <td className="px-3 py-2 font-mono" style={{ color: row.matched_card_key ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {row.matched_card_key ?? '—'}
                  </td>
                  <td className="px-3 py-2 font-mono" style={{ color: row.used_ai_fallback ? '#c084fc' : 'var(--text-secondary)' }}>
                    {row.used_ai_fallback ? 'AI' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
