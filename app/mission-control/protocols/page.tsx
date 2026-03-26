/**
 * File: app/mission-control/protocols/page.tsx
 *   (or wherever Mission Control lives — standalone page)
 *
 * TASK-122: Protocol Review Dashboard
 *
 * Features:
 * - Table of all pending_protocols sorted by newest / most traffic
 * - Filter tabs: All | Unverified | Verified | High Traffic (solve_count > 5)
 * - Card preview: click row → expand to show full protocol card rendered
 * - Verify button: one-click verify
 * - Reject button: delete bad AI cards
 * - Promote button: download card as data/core/ JSON
 * - Search: filter by stain or surface
 *
 * Stack: Next.js page, Supabase admin client, dark theme
 *
 * NOTE: This is a self-contained 'use client' page. If Mission Control
 * is a separate Next.js app, drop this file at app/protocols/page.tsx
 * and ensure the Supabase admin client is available.
 * If MC doesn't exist yet, this can be added to gonr-app at
 * app/mission-control/protocols/page.tsx with a simple layout wrapper.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

/* ── Types ────────────────────────────────────── */

interface PendingProtocol {
  id: string
  stain: string
  surface: string
  cache_key: string
  card: any
  source: string
  verified: boolean
  verified_at: string | null
  verified_by: string | null
  solve_count: number
  created_at: string
  updated_at: string
}

type FilterTab = 'all' | 'unverified' | 'verified' | 'high-traffic'

/* ── Supabase client ─── */
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = 'https://ljcmslyirxqtmdaxzuiq.supabase.co'
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqY21zbHlpcnhxdG1kYXh6dWlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTQwNjEsImV4cCI6MjA4Njc3MDA2MX0.RTh4Ms3108s5iyTZMSVB9tLd7N79XjmICcLn8j3NOR0'
  return createClient(url, key)
}
const supabase = getSupabase()

/* ── Page Component ───────────────────────────── */

const PASSCODE = 'GONR33'

export default function ProtocolReviewPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [passcodeError, setPasscodeError] = useState(false)

  const [protocols, setProtocols] = useState<PendingProtocol[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'created_at' | 'solve_count'>('created_at')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  if (!unlocked) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0e14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '360px', textAlign: 'center' }}>
          <p style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</p>
          <h1 style={{ color: '#f9fafb', fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>Protocol Review</h1>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>Enter passcode to continue</p>
          <input
            type="password"
            value={passcode}
            onChange={e => { setPasscode(e.target.value); setPasscodeError(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (passcode === PASSCODE) setUnlocked(true)
                else setPasscodeError(true)
              }
            }}
            placeholder="Passcode"
            autoFocus
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '10px',
              background: '#1f2937', border: `1.5px solid ${passcodeError ? '#ef4444' : '#374151'}`,
              color: '#f9fafb', fontSize: '15px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box'
            }}
          />
          {passcodeError && <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>Incorrect passcode</p>}
          <button
            onClick={() => { if (passcode === PASSCODE) setUnlocked(true); else setPasscodeError(true) }}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#22c55e', color: '#000', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer' }}
          >
            Unlock →
          </button>
        </div>
      </div>
    )
  }

  /* ── Fetch ─────────────────────────────────── */

  const fetchProtocols = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('pending_protocols')
      .select('*')
      .order(sortBy, { ascending: false })

    if (filter === 'unverified') query = query.eq('verified', false)
    if (filter === 'verified') query = query.eq('verified', true)
    if (filter === 'high-traffic') query = query.gt('solve_count', 5)

    if (search.trim()) {
      query = query.or(`stain.ilike.%${search.trim()}%,surface.ilike.%${search.trim()}%`)
    }

    const { data, error } = await query.limit(200)

    if (error) {
      console.error('Fetch error:', error)
    } else {
      setProtocols(data || [])
    }
    setLoading(false)
  }, [filter, search, sortBy])

  useEffect(() => {
    fetchProtocols()
  }, [fetchProtocols])

  /* ── Actions ───────────────────────────────── */

  async function handleVerify(id: string) {
    setActionLoading(id)
    const { error } = await supabase
      .from('pending_protocols')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        verified_by: 'tyler',
        source: 'verified',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (!error) {
      setProtocols(prev => prev.map(p =>
        p.id === id ? { ...p, verified: true, source: 'verified', verified_by: 'tyler', verified_at: new Date().toISOString() } : p
      ))
    }
    setActionLoading(null)
  }

  async function handleReject(id: string) {
    if (!confirm('Delete this AI-generated card? This cannot be undone.')) return
    setActionLoading(id)
    const { error } = await supabase
      .from('pending_protocols')
      .delete()
      .eq('id', id)

    if (!error) {
      setProtocols(prev => prev.filter(p => p.id !== id))
      if (expandedId === id) setExpandedId(null)
    }
    setActionLoading(null)
  }

  function handlePromote(protocol: PendingProtocol) {
    // Build data/core/ compatible JSON
    const coreCard = {
      ...protocol.card,
      source: 'verified',
      meta: {
        ...(protocol.card.meta || {}),
        stainCanonical: protocol.stain,
        surfaceCanonical: protocol.surface,
        tier: 'verified',
      },
    }

    // Download as JSON file
    const filename = `${protocol.stain}-${protocol.surface}.json`.replace(/\s+/g, '-').toLowerCase()
    const blob = new Blob([JSON.stringify(coreCard, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── Stats ─────────────────────────────────── */

  const stats = {
    total: protocols.length,
    unverified: protocols.filter(p => !p.verified).length,
    verified: protocols.filter(p => p.verified).length,
    highTraffic: protocols.filter(p => p.solve_count > 5).length,
  }

  /* ── Render ────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#0a0e14] text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Protocol Review</h1>
            <p className="text-sm text-gray-500 mt-1">
              AI-generated cards pending verification. High-traffic combos = priority.
            </p>
          </div>
          <button
            onClick={fetchProtocols}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Cached', value: stats.total, color: 'text-white' },
            { label: 'Unverified', value: stats.unverified, color: 'text-amber-400' },
            { label: 'Verified', value: stats.verified, color: 'text-green-400' },
            { label: 'High Traffic', value: stats.highTraffic, color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs + Search + Sort */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {([
              ['all', 'All'],
              ['unverified', 'Unverified'],
              ['verified', 'Verified'],
              ['high-traffic', 'High Traffic'],
            ] as [FilterTab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${filter === key
                    ? 'bg-green-500 text-white'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search stain or surface..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
          />

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'created_at' | 'solve_count')}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 focus:outline-none"
          >
            <option value="created_at">Newest First</option>
            <option value="solve_count">Most Traffic</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : protocols.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No protocols found.</div>
        ) : (
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Stain</th>
                  <th className="px-4 py-3">Surface</th>
                  <th className="px-4 py-3 text-center">Solves</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {protocols.map(p => (
                  <>
                    <tr
                      key={p.id}
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-white capitalize">{p.stain}</td>
                      <td className="px-4 py-3 text-gray-400 capitalize">{p.surface || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold
                          ${p.solve_count > 10 ? 'bg-purple-500/20 text-purple-400' :
                            p.solve_count > 5 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-white/5 text-gray-400'}`}>
                          {p.solve_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.source}</td>
                      <td className="px-4 py-3">
                        {p.verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {!p.verified && (
                            <button
                              onClick={() => handleVerify(p.id)}
                              disabled={actionLoading === p.id}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                            >
                              Verify
                            </button>
                          )}
                          <button
                            onClick={() => handlePromote(p)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                          >
                            Promote
                          </button>
                          <button
                            onClick={() => handleReject(p.id)}
                            disabled={actionLoading === p.id}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded card preview */}
                    {expandedId === p.id && (
                      <tr key={`${p.id}-preview`}>
                        <td colSpan={7} className="p-0">
                          <CardPreview card={p.card} cacheKey={p.cache_key} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Card Preview Component ───────────────────── */

function CardPreview({ card, cacheKey }: { card: any; cacheKey: string }) {
  const [showRaw, setShowRaw] = useState(false)

  return (
    <div className="bg-[#0d1117] border-t border-white/10 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{card.title || cacheKey}</h3>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="px-3 py-1 rounded-md text-xs bg-white/5 text-gray-400 hover:text-white transition-colors"
        >
          {showRaw ? 'Formatted' : 'Raw JSON'}
        </button>
      </div>

      {showRaw ? (
        <pre className="bg-black/50 rounded-lg p-4 text-xs text-green-400 overflow-auto max-h-96 font-mono">
          {JSON.stringify(card, null, 2)}
        </pre>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Left column: protocol info */}
          <div className="space-y-3">
            {card.stainFamily && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Stain Family</p>
                <p className="text-sm text-white capitalize">{card.stainFamily}</p>
              </div>
            )}
            {card.stainChemistry && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Chemistry</p>
                <p className="text-sm text-gray-300 leading-relaxed">{card.stainChemistry}</p>
              </div>
            )}
            {card.whyThisWorks && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Why This Works</p>
                <p className="text-sm text-gray-300 leading-relaxed">{card.whyThisWorks}</p>
              </div>
            )}
            {card.difficulty && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Difficulty</p>
                <p className="text-sm text-white">{card.difficulty}/10</p>
              </div>
            )}
          </div>

          {/* Right column: protocol steps */}
          <div className="space-y-3">
            {card.spottingProtocol && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Pro Steps</p>
                <div className="space-y-2">
                  {card.spottingProtocol.map((step: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-green-400 text-xs font-bold flex-shrink-0">{step.step}.</span>
                      <div>
                        {step.agent && <p className="text-xs text-green-400 font-bold uppercase">{step.agent}</p>}
                        <p className="text-xs text-gray-400">{step.instruction}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {card.materialWarnings && card.materialWarnings.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Warnings</p>
                {card.materialWarnings.map((w: string, i: number) => (
                  <p key={i} className="text-xs text-red-400">• {w}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
