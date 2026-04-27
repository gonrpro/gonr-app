// app/admin/cockpit/page.tsx
//
// TASK-107 Phase 1 — Master Protocol Backlog cockpit.
// Single read-surface that joins legacy + v1 + punch-list + audit + reviews +
// coverage gaps via the lab-generated `protocol-master-backlog.json`.
//
// 7 named filters w/ counts:
//   all_live · needs_review · create_next · quarantined · approved · missing · factory_drafts
//
// Active filter is the `?filter=` query param. Default = create_next (the work queue).
// All actions/links route out to existing /admin/cards/[cardKey] for detail.
// No destructive writes here. Read-only.
//
// Reads JSON from MASTER_BACKLOG_PATH env or default lab output. If the JSON
// is missing/stale, surface that loud (run the generator) instead of silently
// rendering an empty page.

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const FOUNDER_EMAILS = ['tyler@gonr.pro', 'tyler@nexshift.co', 'twfyke@me.com', 'eval@gonr.app', 'jeff@cleanersupply.com']

const BACKLOG_PATH = path.resolve(
  process.env.MASTER_BACKLOG_PATH
    ?? path.join(process.env.HOME ?? '/Users/tyler', 'lab/output/TASK-107/state/protocol-master-backlog.json')
)

type Cell = {
  card_key: string
  stain: string | null
  surface: string | null
  priority: string
  business_reason: string | null
  origin: 'legacy' | 'factory_v1' | 'candidate' | 'missing'
  current_state: string
  source_status: string
  has_punch_list_entry: boolean
  has_v1_row: boolean
  has_live_card: boolean
  review_count: number
  last_reviewed_at: string | null
  next_action: string
  owner: string | null
  review_url: string | null
  preview_url: string | null
  in_p1_grid: boolean
  first10_rank: number | null
  first10_tier: string | null
  quarantined: boolean
  queue_demand_count: number
  queue_pro_demand_count: number
  legacy_verification: string | null
  v1_status: string | null
}

type Backlog = {
  generated_at: string
  schema_version: number
  sources: Record<string, number>
  counts: { total_cells: number; by_state: Record<string, number>; by_origin: Record<string, number>; by_filter: Record<string, number> }
  cells: Cell[]
  filter_buckets: Record<FilterKey, string[]>
}

type FilterKey = 'all_live' | 'needs_review' | 'create_next' | 'quarantined' | 'approved' | 'missing' | 'factory_drafts'

const FILTER_DEFS: Array<{ key: FilterKey; label: string; hint: string }> = [
  { key: 'create_next',     label: 'Create next',    hint: 'Work queue: First-10 → quarantined → pro demand → P1 gaps' },
  { key: 'needs_review',    label: 'Needs review',   hint: 'v1 rows flagged or revision-requested. "No reviews yet" stays out.' },
  { key: 'quarantined',     label: 'Quarantined',    hint: 'Atlas msg 8952 list — safety/accuracy rebuild required' },
  { key: 'missing',         label: 'Missing P1',     hint: 'P1 grid cells with no card anywhere' },
  { key: 'factory_drafts',  label: 'Factory drafts', hint: 'protocol_cards_v1 rows (any status)' },
  { key: 'approved',        label: 'Approved',       hint: 'v1 status approved or published' },
  { key: 'all_live',        label: 'All live',       hint: 'protocol_cards rows currently active' },
]

async function isLocalDevBypass() {
  if (process.env.NODE_ENV !== 'development') return false
  const h = await headers()
  const host = h.get('host') ?? ''
  return host.startsWith('localhost:') || host.startsWith('127.0.0.1:')
}

async function getSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email?.toLowerCase() ?? null
  } catch {
    return null
  }
}

function loadBacklog(): { backlog: Backlog | null; error: string | null; ageMin: number | null } {
  if (!existsSync(BACKLOG_PATH)) return { backlog: null, error: `Backlog JSON missing at ${BACKLOG_PATH}. Run the generator: \`node ~/lab/output/TASK-107/generator/regen-master-backlog.mjs\`.`, ageMin: null }
  try {
    const raw = readFileSync(BACKLOG_PATH, 'utf8')
    const backlog = JSON.parse(raw) as Backlog
    const ageMs = Date.now() - new Date(backlog.generated_at).getTime()
    const ageMin = Math.round(ageMs / 60_000)
    return { backlog, error: null, ageMin }
  } catch (e) {
    return { backlog: null, error: `Failed to parse backlog JSON: ${(e as Error).message}`, ageMin: null }
  }
}

function tone(filter: FilterKey, state: string): string {
  if (state === 'quarantined') return 'bg-red-50 text-red-800'
  if (state === 'missing') return 'bg-amber-50 text-amber-800'
  if (state === 'approved') return 'bg-emerald-50 text-emerald-800'
  if (state === 'factory_draft') return 'bg-blue-50 text-blue-800'
  if (state === 'candidate') return 'bg-purple-50 text-purple-800'
  if (state.startsWith('legacy')) return 'bg-slate-50 text-slate-800'
  return 'bg-slate-50 text-slate-700'
}

export default async function ProtocolCockpitPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const localDev = await isLocalDevBypass()
  const email = localDev ? 'local-dev-founder-preview@gonr.local' : await getSessionEmail()
  if (!localDev && (!email || !FOUNDER_EMAILS.includes(email))) {
    return <div className="p-6 text-sm text-red-700">Founder access required.</div>
  }

  const { backlog, error, ageMin } = loadBacklog()
  const params = await searchParams
  const requested = (params?.filter ?? 'create_next') as FilterKey
  const activeFilter: FilterKey = FILTER_DEFS.some(f => f.key === requested) ? requested : 'create_next'

  if (error || !backlog) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold text-slate-900">Protocol Cockpit</h1>
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Backlog unavailable.</p>
          <p className="mt-1 font-mono text-xs">{error}</p>
        </div>
      </div>
    )
  }

  const cellsByKey = new Map(backlog.cells.map(c => [c.card_key, c]))
  const activeBucket = backlog.filter_buckets[activeFilter] ?? []
  const activeCells = activeBucket.map(k => cellsByKey.get(k)!).filter(Boolean)

  // create_next is pre-sorted by generator; otherwise sort by priority then key
  const sortedCells = activeFilter === 'create_next'
    ? activeCells
    : [...activeCells].sort((a, b) => {
        const p = a.priority.localeCompare(b.priority)
        if (p !== 0) return p
        return a.card_key.localeCompare(b.card_key)
      })

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">Protocol Cockpit</h1>
        <p className="text-sm text-slate-600">
          Master Protocol Backlog — one surface for every card we have, want, or need to rebuild.
          {' '}<Link href="/admin/factory" className="text-blue-700 hover:underline">Inventory view →</Link>
          {' '}<Link href="/admin/coverage" className="text-blue-700 hover:underline">Coverage matrix →</Link>
          {' '}<Link href="/admin/review-queue" className="text-blue-700 hover:underline">Solve queue →</Link>
        </p>
        <p className="mt-1 text-[0.7rem] text-slate-500">
          Generated {ageMin}m ago from {Object.values(backlog.sources).reduce((a, b) => a + b, 0)} source rows · {backlog.counts.total_cells} cells joined ·{' '}
          regen: <code className="rounded bg-slate-100 px-1">node ~/lab/output/TASK-107/generator/regen-master-backlog.mjs</code>
        </p>
        {localDev ? <p className="mt-1 text-xs font-medium text-amber-800">Local dev founder bypass active.</p> : null}
      </header>

      {/* Filter tabs */}
      <nav className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {FILTER_DEFS.map(f => {
          const count = backlog.counts.by_filter[f.key] ?? 0
          const isActive = f.key === activeFilter
          return (
            <Link
              key={f.key}
              href={`/admin/cockpit?filter=${f.key}`}
              className={`rounded-t px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? 'border border-b-white bg-white text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={f.hint}
            >
              {f.label}
              <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[0.65rem] ${isActive ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-700'}`}>
                {count}
              </span>
            </Link>
          )
        })}
      </nav>

      <p className="mb-3 text-xs text-slate-500">
        {FILTER_DEFS.find(f => f.key === activeFilter)?.hint}
      </p>

      {/* Stat row */}
      <section className="mb-4 grid gap-2 sm:grid-cols-4">
        <Stat label="Total cells" value={backlog.counts.total_cells} />
        <Stat label="In this filter" value={sortedCells.length} />
        <Stat label="Quarantined" value={backlog.counts.by_filter.quarantined} tone={backlog.counts.by_filter.quarantined > 0 ? 'warn' : 'neutral'} />
        <Stat label="Missing P1" value={backlog.counts.by_filter.missing} tone={backlog.counts.by_filter.missing > 50 ? 'warn' : 'neutral'} />
      </section>

      {/* Empty state */}
      {sortedCells.length === 0 && (
        <div className="rounded border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
          No cells in this filter. {activeFilter === 'needs_review' && '(No reviews yet — this is normal until founder/Atlas actions accumulate.)'}
        </div>
      )}

      {/* Cell table */}
      {sortedCells.length > 0 && (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {activeFilter === 'create_next' && <th className="px-3 py-2 w-10">#</th>}
                <th className="px-3 py-2">Card</th>
                <th className="px-3 py-2">Origin</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Pri</th>
                <th className="px-3 py-2">Demand</th>
                <th className="px-3 py-2">Sources</th>
                <th className="px-3 py-2">Reviews</th>
                <th className="px-3 py-2">Next action</th>
                <th className="px-3 py-2">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCells.map((c, i) => (
                <tr key={c.card_key} className="align-top hover:bg-slate-50">
                  {activeFilter === 'create_next' && (
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {c.first10_rank ? <span className="rounded bg-purple-100 px-1.5 py-0.5 font-mono text-[0.65rem] text-purple-800">#{c.first10_rank}</span> : <span className="text-slate-400">{i + 1}</span>}
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs text-slate-900">{c.card_key}</div>
                    {c.business_reason && <div className="text-[0.7rem] text-slate-500">{c.business_reason}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 ${c.origin === 'legacy' ? 'bg-slate-100 text-slate-700' : c.origin === 'factory_v1' ? 'bg-blue-100 text-blue-800' : c.origin === 'candidate' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}`}>{c.origin}</span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 ${tone(activeFilter, c.current_state)}`}>{c.current_state}</span>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-slate-700">{c.priority}</td>
                  <td className="px-3 py-2 text-xs">
                    {c.queue_demand_count > 0 ? (
                      <span className={c.queue_pro_demand_count > 0 ? 'text-red-700 font-medium' : 'text-slate-700'}>
                        {c.queue_demand_count}{c.queue_pro_demand_count > 0 ? ` (${c.queue_pro_demand_count} pro)` : ''}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[0.7rem] text-slate-600">
                    <span title="legacy verification level">{c.legacy_verification ?? '—'}</span>
                    {c.has_punch_list_entry && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-800" title="Has punch-list draft">PL</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {c.review_count > 0
                      ? <span>{c.review_count}{c.last_reviewed_at ? ` · ${new Date(c.last_reviewed_at).toLocaleDateString()}` : ''}</span>
                      : <span className="text-slate-400">none</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">{c.next_action}</td>
                  <td className="px-3 py-2 text-xs">
                    {c.review_url
                      ? <Link className="text-blue-700 hover:underline" href={c.review_url}>detail →</Link>
                      : <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Source provenance footer */}
      <details className="mt-6 text-xs text-slate-600">
        <summary className="cursor-pointer text-slate-700">Source provenance</summary>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {Object.entries(backlog.sources).map(([k, v]) => (
            <div key={k} className="font-mono">{k}: {v}</div>
          ))}
        </div>
      </details>
    </div>
  )
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'warn' | 'ok' }) {
  const color = tone === 'warn' ? 'text-amber-800' : tone === 'ok' ? 'text-emerald-800' : 'text-slate-900'
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}
