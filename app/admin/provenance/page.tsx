'use client'

// app/admin/provenance/page.tsx
//
// Founder-only read surface for TASK-055 provenance state. Three blocks:
//   Summary — counts by verification_level across the active canonical library
//   Drafts — the gap queue Atlas asked for: cards at verification_level='draft'
//   Recent — last 50 cards by updated_at
//
// Minimal UI. The data is the point. Founder gate enforced by the API.

import { useCallback, useEffect, useState } from 'react'

type CardRow = {
  card_key: string
  stain_canonical: string | null
  surface_canonical: string | null
  verification_level: string | null
  sources: string[] | null
  cross_refs: string[] | null
  updated_at: string
}

type Summary = {
  draft: number
  single_source: number
  cross_ref: number
  pro_verified: number
  unknown: number
  total: number
}

interface ProvenanceResponse {
  summary: Summary
  drafts: CardRow[]
  recent: CardRow[]
  _columnMissing?: boolean
  _migrationPath?: string
}

function fmtTs(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function LevelBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-[10px] text-gray-400">—</span>
  const colors: Record<string, string> = {
    draft: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
    single_source: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    cross_ref: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
    pro_verified: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  }
  const cls = colors[level] ?? 'bg-slate-500/10 text-slate-600 border-slate-500/30'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${cls}`}>
      {level}
    </span>
  )
}

export default function AdminProvenancePage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ProvenanceResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [forbidden, setForbidden] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/provenance', { cache: 'no-store' })
      if (res.status === 403) {
        setForbidden(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ProvenanceResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (forbidden) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="mt-2 text-sm text-gray-500">This page is founder-only. Sign in with a founder email to view.</p>
      </main>
    )
  }

  if (loading && !data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-gray-500">Loading provenance data…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-red-600">Error: {error}</p>
        <button onClick={() => void load()} className="mt-4 text-sm underline">retry</button>
      </main>
    )
  }

  if (!data) return null

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Provenance</h1>
          <p className="mt-1 text-sm text-gray-500">
            TASK-055 · honest verification levels across {data.summary.total} active canonical cards. Cards default to <code>draft</code> when heuristics can&apos;t verify a source.
          </p>
        </div>
        <button onClick={() => void load()} className="text-xs text-gray-500 underline">refresh</button>
      </header>

      {data._columnMissing && (
        <div className="border border-amber-500/40 bg-amber-500/10 rounded p-4 text-sm">
          <strong>Migration pending:</strong> the <code>verification_level</code> column isn&apos;t live yet.
          Apply <code>{data._migrationPath}</code> via the Supabase dashboard or CLI, then reload this page.
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryTile label="draft" value={data.summary.draft} tone="slate" hint="no verified source" />
          <SummaryTile label="single_source" value={data.summary.single_source} tone="blue" hint="one verified source" />
          <SummaryTile label="cross_ref" value={data.summary.cross_ref} tone="violet" hint="2+ agree" />
          <SummaryTile label="pro_verified" value={data.summary.pro_verified} tone="emerald" hint="pro signed off" />
          <SummaryTile label="total" value={data.summary.total} tone="gray" hint="active canonical" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Drafts — gap queue ({data.drafts.length}{data.drafts.length >= 200 ? '+' : ''})
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Cards the library serves without a verified source. Target for the evidence-queue sprint.
        </p>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-3 py-2">Card</th>
                <th className="text-left px-3 py-2">Stain</th>
                <th className="text-left px-3 py-2">Surface</th>
                <th className="text-left px-3 py-2">Level</th>
                <th className="text-left px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.drafts.map((row) => (
                <tr key={row.card_key} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2 font-mono text-xs">{row.card_key}</td>
                  <td className="px-3 py-2">{row.stain_canonical ?? '—'}</td>
                  <td className="px-3 py-2">{row.surface_canonical ?? '—'}</td>
                  <td className="px-3 py-2"><LevelBadge level={row.verification_level} /></td>
                  <td className="px-3 py-2 text-xs text-gray-500">{fmtTs(row.updated_at)}</td>
                </tr>
              ))}
              {data.drafts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">
                    No draft cards. Library is fully verified.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Recent — last 50 updated</h2>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-3 py-2">Card</th>
                <th className="text-left px-3 py-2">Level</th>
                <th className="text-left px-3 py-2">Sources</th>
                <th className="text-left px-3 py-2">Cross-refs</th>
                <th className="text-left px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row) => (
                <tr key={row.card_key} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2 font-mono text-xs">{row.card_key}</td>
                  <td className="px-3 py-2"><LevelBadge level={row.verification_level} /></td>
                  <td className="px-3 py-2 text-xs text-gray-500">{row.sources && row.sources.length > 0 ? row.sources.join(', ') : '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{row.cross_refs && row.cross_refs.length > 0 ? row.cross_refs.join(', ') : '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{fmtTs(row.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function SummaryTile({ label, value, tone, hint }: { label: string; value: number; tone: 'slate' | 'blue' | 'violet' | 'emerald' | 'gray'; hint: string }) {
  const tones: Record<typeof tone, string> = {
    slate: 'border-slate-500/30 bg-slate-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    violet: 'border-violet-500/30 bg-violet-500/5',
    emerald: 'border-emerald-500/30 bg-emerald-500/5',
    gray: 'border-gray-500/30 bg-gray-500/5',
  }
  return (
    <div className={`rounded border p-3 ${tones[tone]}`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] font-mono uppercase tracking-wide text-gray-600 dark:text-gray-400">{label}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{hint}</div>
    </div>
  )
}
