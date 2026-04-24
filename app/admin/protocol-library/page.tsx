'use client'

// app/admin/protocol-library/page.tsx
//
// Founder-only "book view" of the protocol library (Task #40).
//
// Structure:
//   Summary tiles     — total / verified / by verification_level
//   Filters           — search + stain / surface / level / verified-only / tier
//   Table             — sortable list, click row to expand
//   Expanded detail   — side-by-side Home + Pro (Spotter/Operator shares Pro view)
//
// v1 scope (Atlas 8392): no PDF/export, no schema change, no plant overlay.
// Stop for review before expanding.

import { useCallback, useEffect, useMemo, useState } from 'react'

type CardRow = {
  card_key: string
  stain_canonical: string | null
  surface_canonical: string | null
  verification_level: string | null
  sources: string[] | null
  cross_refs: string[] | null
  updated_at: string
  data: CardData | null
}

type CardData = {
  id?: string
  title?: string
  stainType?: string
  stainFamily?: string
  surface?: string
  sector?: string
  verified?: boolean
  difficulty?: number
  timeEstimate?: string
  lastValidated?: string
  meta?: {
    tier?: string
    riskLevel?: string
    tags?: string[]
  }
  stainChemistry?: string
  whyThisWorks?: string
  defaultAssumption?: string
  spottingProtocol?: ProtoStep[]
  professionalProtocol?: ProProtocol
  homeSolutions?: HomeStep[]
  diyProtocol?: DiyProtocol
  safetyMatrix?: SafetyMatrix
  materialWarnings?: string[]
  escalation?: Escalation | string
  deepSolveHooks?: DeepSolveHooks
}

type ProtoStep = {
  step?: number
  side?: string
  agent?: string
  technique?: string
  equipment?: string
  dwellTime?: string
  instruction?: string
  safetyNote?: string
}

type ProProtocol = {
  steps?: string[]
  products?: string[]
  temperature?: string
  warnings?: string[]
}

type HomeStep = {
  step?: number
  agent?: string
  instruction?: string
  safetyNote?: string
}

type DiyProtocol = {
  steps?: string[]
  products?: string[]
  whenToStop?: string
  warnings?: string[]
}

type SafetyMatrix = {
  neverDo?: string[]
  fiberSensitivities?: string[]
}

type Escalation = {
  when?: string
  whatToTell?: string
  specialistType?: string
}

type DeepSolveHooks = {
  contextQuestions?: string[]
  modifierNotes?: string
}

type ApiResponse = {
  summary: {
    total: number
    verified: number
    draft: number
    single_source: number
    cross_ref: number
    pro_verified: number
    unknown: number
  }
  cards: CardRow[]
}

function fmtTs(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

function VerifiedBadge({ verified }: { verified: boolean | undefined }) {
  if (!verified) return null
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
      verified
    </span>
  )
}

export default function AdminProtocolLibraryPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [forbidden, setForbidden] = useState(false)

  const [search, setSearch] = useState('')
  const [stainFilter, setStainFilter] = useState<string>('')
  const [surfaceFilter, setSurfaceFilter] = useState<string>('')
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/protocol-library', { cache: 'no-store' })
      if (res.status === 403) {
        setForbidden(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ApiResponse
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

  const filteredCards = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.cards.filter(row => {
      if (verifiedOnly && !row.data?.verified) return false
      if (stainFilter && row.stain_canonical !== stainFilter) return false
      if (surfaceFilter && row.surface_canonical !== surfaceFilter) return false
      if (levelFilter && (row.verification_level ?? 'unknown') !== levelFilter) return false
      if (q) {
        const hay = `${row.card_key} ${row.stain_canonical ?? ''} ${row.surface_canonical ?? ''} ${row.data?.title ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [data, search, stainFilter, surfaceFilter, levelFilter, verifiedOnly])

  const stainOptions = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    for (const row of data.cards) if (row.stain_canonical) set.add(row.stain_canonical)
    return [...set].sort()
  }, [data])

  const surfaceOptions = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    for (const row of data.cards) if (row.surface_canonical) set.add(row.surface_canonical)
    return [...set].sort()
  }, [data])

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
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-sm text-gray-500">Loading protocol library…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-sm text-red-600">Error: {error}</p>
        <button onClick={() => void load()} className="mt-4 text-sm underline">retry</button>
      </main>
    )
  }

  if (!data) return null

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Protocol Library</h1>
          <p className="mt-1 text-sm text-gray-500">
            Book view for quality audit · {data.summary.total} active canonical cards · {data.summary.verified} marked <code>verified: true</code>.
          </p>
        </div>
        <button onClick={() => void load()} className="text-xs text-gray-500 underline">refresh</button>
      </header>

      <section>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <SummaryTile label="total" value={data.summary.total} tone="gray" hint="active canonical" />
          <SummaryTile label="verified" value={data.summary.verified} tone="emerald" hint="verified: true" />
          <SummaryTile label="draft" value={data.summary.draft} tone="slate" hint="no source" />
          <SummaryTile label="single_source" value={data.summary.single_source} tone="blue" hint="1 source" />
          <SummaryTile label="cross_ref" value={data.summary.cross_ref} tone="violet" hint="2+ agree" />
          <SummaryTile label="pro_verified" value={data.summary.pro_verified} tone="emerald" hint="pro sign-off" />
        </div>
      </section>

      <section className="border border-gray-200 dark:border-gray-800 rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="card_key, stain, surface, title…"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-transparent rounded"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Stain</label>
            <select
              value={stainFilter}
              onChange={e => setStainFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-transparent rounded"
            >
              <option value="">all</option>
              {stainOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Surface</label>
            <select
              value={surfaceFilter}
              onChange={e => setSurfaceFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-transparent rounded"
            >
              <option value="">all</option>
              {surfaceOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Level</label>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-transparent rounded"
            >
              <option value="">all</option>
              <option value="draft">draft</option>
              <option value="single_source">single_source</option>
              <option value="cross_ref">cross_ref</option>
              <option value="pro_verified">pro_verified</option>
              <option value="unknown">unknown</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} />
            <span>Only <code>verified: true</code></span>
          </label>
          <div className="text-xs text-gray-500 ml-auto">
            showing {filteredCards.length} of {data.cards.length}
          </div>
        </div>
      </section>

      <section>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-3 py-2">Card</th>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Level</th>
                <th className="text-left px-3 py-2">Verified</th>
                <th className="text-left px-3 py-2">Tier</th>
                <th className="text-left px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map(row => {
                const isExpanded = expandedKey === row.card_key
                return (
                  <>
                    <tr
                      key={row.card_key}
                      onClick={() => setExpandedKey(isExpanded ? null : row.card_key)}
                      className={`border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40 ${isExpanded ? 'bg-gray-50 dark:bg-gray-900/40' : ''}`}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{row.card_key}</td>
                      <td className="px-3 py-2">{row.data?.title ?? '—'}</td>
                      <td className="px-3 py-2"><LevelBadge level={row.verification_level} /></td>
                      <td className="px-3 py-2"><VerifiedBadge verified={row.data?.verified} /></td>
                      <td className="px-3 py-2 text-xs text-gray-500">{row.data?.meta?.tier ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmtTs(row.updated_at)}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${row.card_key}-detail`} className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                        <td colSpan={6} className="px-4 py-6">
                          <CardDetail card={row} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {filteredCards.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">
                    No cards match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function CardDetail({ card }: { card: CardRow }) {
  const d = card.data
  if (!d) return <p className="text-sm text-gray-500">No card data.</p>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">{d.title}</h3>
          <div className="text-xs text-gray-500 space-x-3">
            <span>type: <code>{d.stainType ?? d.stainFamily ?? '—'}</code></span>
            <span>difficulty: {d.difficulty ?? '—'}</span>
            <span>time: {d.timeEstimate ?? '—'}</span>
            <span>risk: {d.meta?.riskLevel ?? '—'}</span>
          </div>
          {d.meta?.tags && d.meta.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {d.meta.tags.map(t => (
                <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-1 text-xs text-gray-500">
          <div>card_key: <code className="text-gray-800 dark:text-gray-200">{card.card_key}</code></div>
          <div>last validated: <code>{d.lastValidated ?? '—'}</code></div>
          <div>verification_level: <LevelBadge level={card.verification_level} /></div>
          <div>sources: {card.sources && card.sources.length > 0 ? card.sources.join(', ') : '—'}</div>
        </div>
      </div>

      {d.stainChemistry && (
        <Section title="Stain Chemistry">
          <p className="text-sm leading-relaxed">{d.stainChemistry}</p>
        </Section>
      )}

      {d.whyThisWorks && (
        <Section title="Why This Works">
          <p className="text-sm leading-relaxed">{d.whyThisWorks}</p>
        </Section>
      )}

      {d.defaultAssumption && (
        <Section title="Default Assumption">
          <p className="text-sm leading-relaxed italic text-gray-600 dark:text-gray-400">{d.defaultAssumption}</p>
        </Section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Lane title="Home (consumer voice)" tone="home">
          {d.homeSolutions && d.homeSolutions.length > 0 ? (
            <ol className="space-y-3">
              {d.homeSolutions.map((step, i) => (
                <li key={i} className="text-sm">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">
                    {step.step ?? i + 1}. {step.agent ?? ''}
                  </div>
                  <p className="mt-1 text-gray-600 dark:text-gray-400 leading-relaxed">{step.instruction}</p>
                  {step.safetyNote && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 italic">⚠ {step.safetyNote}</p>
                  )}
                </li>
              ))}
            </ol>
          ) : d.diyProtocol ? (
            <ProtocolBlock protocol={d.diyProtocol} />
          ) : (
            <p className="text-sm text-gray-500 italic">No Home lane.</p>
          )}
        </Lane>

        <Lane title="Pro (Spotter / Operator)" tone="pro">
          {d.spottingProtocol && d.spottingProtocol.length > 0 ? (
            <ol className="space-y-3">
              {d.spottingProtocol.map((step, i) => (
                <li key={i} className="text-sm">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">
                    {step.step ?? i + 1}. {step.agent ?? ''}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 space-x-2">
                    {step.side && <span>side: {step.side}</span>}
                    {step.dwellTime && <span>dwell: {step.dwellTime}</span>}
                    {step.equipment && <span>eq: {step.equipment}</span>}
                  </div>
                  <p className="mt-1 text-gray-600 dark:text-gray-400 leading-relaxed">{step.instruction}</p>
                  {step.safetyNote && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 italic">⚠ {step.safetyNote}</p>
                  )}
                </li>
              ))}
            </ol>
          ) : d.professionalProtocol ? (
            <ProtocolBlock protocol={d.professionalProtocol} />
          ) : (
            <p className="text-sm text-gray-500 italic">No Pro lane.</p>
          )}
        </Lane>
      </div>

      {d.materialWarnings && d.materialWarnings.length > 0 && (
        <Section title="Material Warnings">
          <ul className="list-disc list-inside text-sm space-y-1 text-amber-700 dark:text-amber-400">
            {d.materialWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </Section>
      )}

      {d.safetyMatrix && (
        <Section title="Safety Matrix">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {d.safetyMatrix.neverDo && (
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Never Do</div>
                <ul className="list-disc list-inside space-y-0.5 text-red-700 dark:text-red-400">
                  {d.safetyMatrix.neverDo.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            {d.safetyMatrix.fiberSensitivities && (
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Fiber Sensitivities</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {d.safetyMatrix.fiberSensitivities.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {d.escalation && typeof d.escalation === 'object' && (
        <Section title="Escalation">
          <div className="text-sm space-y-1">
            {d.escalation.when && <div><span className="text-gray-500">when:</span> {d.escalation.when}</div>}
            {d.escalation.whatToTell && <div><span className="text-gray-500">what to tell:</span> {d.escalation.whatToTell}</div>}
            {d.escalation.specialistType && <div><span className="text-gray-500">specialist:</span> {d.escalation.specialistType}</div>}
          </div>
        </Section>
      )}

      {d.deepSolveHooks && (
        <Section title="Deep Solve Hooks">
          {d.deepSolveHooks.contextQuestions && (
            <ul className="list-disc list-inside text-sm space-y-0.5">
              {d.deepSolveHooks.contextQuestions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          )}
          {d.deepSolveHooks.modifierNotes && (
            <p className="mt-2 text-xs italic text-gray-500">{d.deepSolveHooks.modifierNotes}</p>
          )}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</h4>
      {children}
    </section>
  )
}

function Lane({ title, tone, children }: { title: string; tone: 'home' | 'pro'; children: React.ReactNode }) {
  const border = tone === 'home' ? 'border-emerald-500/30' : 'border-blue-500/30'
  return (
    <div className={`border-l-2 ${border} pl-4`}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{title}</h4>
      {children}
    </div>
  )
}

function ProtocolBlock({ protocol }: { protocol: ProProtocol | DiyProtocol }) {
  return (
    <div className="text-sm space-y-3">
      {protocol.steps && protocol.steps.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Steps</div>
          <ol className="space-y-1">
            {protocol.steps.map((s, i) => <li key={i} className="text-gray-700 dark:text-gray-300">{s}</li>)}
          </ol>
        </div>
      )}
      {protocol.products && protocol.products.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Products</div>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
            {protocol.products.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
      {'temperature' in protocol && protocol.temperature && (
        <div className="text-xs text-gray-500">temperature: {protocol.temperature}</div>
      )}
      {'whenToStop' in protocol && protocol.whenToStop && (
        <div className="text-xs text-amber-700 dark:text-amber-400">when to stop: {protocol.whenToStop}</div>
      )}
      {protocol.warnings && protocol.warnings.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Warnings</div>
          <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-400">
            {protocol.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
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
