'use client'

// app/admin/protocol-library/page.tsx
//
// Founder-only "book view" of the protocol library (Task #40).
// v1.1 (Atlas 8401): mobile-first layout + verified/provenance explanation.
// v1.2 (Tyler 8404): scrollIntoView on detail when card tapped.
// Task #44 additions (Atlas 8414): verification actions inside the detail —
//   approve / flag / note buttons, audit trail, founder-only promotion.
//   Promotion rule: 1 founder approve → next verification_level tier.
//   Flag requires a note. External-portal expansion is Task #43.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const detailRef = useRef<HTMLElement | null>(null)

  // When a card is selected (especially on mobile where the detail sits
  // below a long list), auto-scroll so the detail is visible.
  useEffect(() => {
    if (selectedKey && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedKey])

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

  const selectedCard = useMemo(() => {
    if (!selectedKey || !data) return null
    return data.cards.find(c => c.card_key === selectedKey) ?? null
  }, [selectedKey, data])

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
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-6 min-w-0">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Protocol Library</h1>
          <p className="mt-1 text-sm text-gray-500">
            Book view for quality audit · {data.summary.total} active canonical cards · {data.summary.verified} marked <code>verified: true</code>.
          </p>
        </div>
        <button onClick={() => void load()} className="text-xs text-gray-500 underline">refresh</button>
      </header>

      <section className="border border-sky-500/30 bg-sky-500/5 rounded p-3 text-xs text-gray-700 dark:text-gray-300 space-y-1">
        <div><strong>Two different &ldquo;verified&rdquo; concepts below — they measure different things:</strong></div>
        <div><code>verified: true</code> → card has been <strong>voice-reviewed</strong> (passes the presentation validator for pro/home tone). This is the Tranche-2 voice-rewrite scoreboard.</div>
        <div><code>verification_level</code> → <strong>provenance</strong> from TASK-055 (how well-sourced the chemistry claims are): <code>draft</code> (no verified source) · <code>single_source</code> · <code>cross_ref</code> (2+ agree) · <code>pro_verified</code> (pro sign-off).</div>
        <div className="text-gray-500">A card can be <code>verified: true</code> (voice good) and still be <code>draft</code> (chemistry needs sourcing), and vice versa.</div>
      </section>

      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <SummaryTile label="total" value={data.summary.total} tone="gray" hint="active canonical" />
          <SummaryTile label="verified" value={data.summary.verified} tone="emerald" hint="voice-reviewed" />
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

      {/* Mobile: stacked card list */}
      <section className="md:hidden space-y-2">
        {filteredCards.map(row => {
          const isSelected = selectedKey === row.card_key
          return (
            <button
              key={row.card_key}
              onClick={() => setSelectedKey(isSelected ? null : row.card_key)}
              className={`w-full text-left border rounded p-3 transition-colors ${isSelected ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40'}`}
            >
              <div className="font-semibold text-sm">{row.data?.title ?? row.card_key}</div>
              <div className="mt-1 font-mono text-[11px] text-gray-500 break-all">{row.card_key}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <LevelBadge level={row.verification_level} />
                <VerifiedBadge verified={row.data?.verified} />
                {row.data?.meta?.tier && <span className="text-[10px] text-gray-500">tier: {row.data.meta.tier}</span>}
                <span className="text-[10px] text-gray-500 ml-auto">{fmtTs(row.updated_at)}</span>
              </div>
            </button>
          )
        })}
        {filteredCards.length === 0 && (
          <div className="border border-gray-200 dark:border-gray-800 rounded p-6 text-center text-sm text-gray-500">
            No cards match these filters.
          </div>
        )}
      </section>

      {/* Desktop: table */}
      <section className="hidden md:block">
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
                const isSelected = selectedKey === row.card_key
                return (
                  <tr
                    key={row.card_key}
                    onClick={() => setSelectedKey(isSelected ? null : row.card_key)}
                    className={`border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40 ${isSelected ? 'bg-emerald-500/5' : ''}`}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{row.card_key}</td>
                    <td className="px-3 py-2">{row.data?.title ?? '—'}</td>
                    <td className="px-3 py-2"><LevelBadge level={row.verification_level} /></td>
                    <td className="px-3 py-2"><VerifiedBadge verified={row.data?.verified} /></td>
                    <td className="px-3 py-2 text-xs text-gray-500">{row.data?.meta?.tier ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{fmtTs(row.updated_at)}</td>
                  </tr>
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

      {/* Expanded detail rendered OUTSIDE the table so it gets the page's container width, not the table's */}
      {selectedCard && (
        <section
          ref={detailRef}
          className="border border-emerald-500/30 bg-emerald-500/5 rounded p-4 min-w-0 scroll-mt-4"
        >
          <div className="flex items-baseline justify-between gap-2 mb-4">
            <div className="min-w-0">
              <div className="text-xs text-gray-500 font-mono break-all">{selectedCard.card_key}</div>
              <div className="text-lg font-semibold">{selectedCard.data?.title ?? selectedCard.card_key}</div>
            </div>
            <button
              onClick={() => setSelectedKey(null)}
              className="text-xs text-gray-500 underline shrink-0"
            >
              close
            </button>
          </div>
          <CardDetail card={selectedCard} onReviewed={() => void load()} />
        </section>
      )}
    </main>
  )
}

function CardDetail({ card, onReviewed }: { card: CardRow; onReviewed: () => void }) {
  const d = card.data
  if (!d) return <p className="text-sm text-gray-500">No card data.</p>

  return (
    <div className="space-y-6 min-w-0 break-words">
      <VerificationPanel card={card} onReviewed={onReviewed} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2 min-w-0">
          <div className="text-xs text-gray-500 space-x-3 break-words">
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
        <div className="space-y-1 text-xs text-gray-500 min-w-0 break-words">
          <div>last validated: <code>{d.lastValidated ?? '—'}</code></div>
          <div>verification_level: <LevelBadge level={card.verification_level} /></div>
          <div>sources: {card.sources && card.sources.length > 0 ? card.sources.join(', ') : '—'}</div>
        </div>
      </div>

      {d.stainChemistry && (
        <Section title="Stain Chemistry">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{d.stainChemistry}</p>
        </Section>
      )}

      {d.whyThisWorks && (
        <Section title="Why This Works">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{d.whyThisWorks}</p>
        </Section>
      )}

      {d.defaultAssumption && (
        <Section title="Default Assumption">
          <p className="text-sm leading-relaxed italic text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{d.defaultAssumption}</p>
        </Section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        <Lane title="Home (consumer voice)" tone="home">
          {d.homeSolutions && d.homeSolutions.length > 0 ? (
            <ol className="space-y-3 min-w-0">
              {d.homeSolutions.map((step, i) => (
                <li key={i} className="text-sm break-words">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">
                    {step.step ?? i + 1}. {step.agent ?? ''}
                  </div>
                  <p className="mt-1 text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap break-words">{step.instruction}</p>
                  {step.safetyNote && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 italic break-words">⚠ {step.safetyNote}</p>
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
            <ol className="space-y-3 min-w-0">
              {d.spottingProtocol.map((step, i) => (
                <li key={i} className="text-sm break-words">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">
                    {step.step ?? i + 1}. {step.agent ?? ''}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 space-x-2 break-words">
                    {step.side && <span>side: {step.side}</span>}
                    {step.dwellTime && <span>dwell: {step.dwellTime}</span>}
                    {step.equipment && <span>eq: {step.equipment}</span>}
                  </div>
                  <p className="mt-1 text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap break-words">{step.instruction}</p>
                  {step.safetyNote && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 italic break-words">⚠ {step.safetyNote}</p>
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
          <ul className="list-disc list-inside text-sm space-y-1 text-amber-700 dark:text-amber-400 break-words">
            {d.materialWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </Section>
      )}

      {d.safetyMatrix && (
        <Section title="Safety Matrix">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm min-w-0">
            {d.safetyMatrix.neverDo && (
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Never Do</div>
                <ul className="list-disc list-inside space-y-0.5 text-red-700 dark:text-red-400 break-words">
                  {d.safetyMatrix.neverDo.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            {d.safetyMatrix.fiberSensitivities && (
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Fiber Sensitivities</div>
                <ul className="list-disc list-inside space-y-0.5 break-words">
                  {d.safetyMatrix.fiberSensitivities.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {d.escalation && typeof d.escalation === 'object' && (
        <Section title="Escalation">
          <div className="text-sm space-y-1 break-words">
            {d.escalation.when && <div><span className="text-gray-500">when:</span> {d.escalation.when}</div>}
            {d.escalation.whatToTell && <div><span className="text-gray-500">what to tell:</span> {d.escalation.whatToTell}</div>}
            {d.escalation.specialistType && <div><span className="text-gray-500">specialist:</span> {d.escalation.specialistType}</div>}
          </div>
        </Section>
      )}

      {d.deepSolveHooks && (
        <Section title="Deep Solve Hooks">
          {d.deepSolveHooks.contextQuestions && (
            <ul className="list-disc list-inside text-sm space-y-0.5 break-words">
              {d.deepSolveHooks.contextQuestions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          )}
          {d.deepSolveHooks.modifierNotes && (
            <p className="mt-2 text-xs italic text-gray-500 break-words">{d.deepSolveHooks.modifierNotes}</p>
          )}
        </Section>
      )}
    </div>
  )
}

type ReviewRow = {
  id: string
  card_key: string
  reviewer_email: string
  reviewer_role: string
  action: 'approve' | 'flag' | 'note'
  note: string | null
  card_version: string | null
  reviewed_at: string
}

function VerificationPanel({ card, onReviewed }: { card: CardRow; onReviewed: () => void }) {
  const [action, setAction] = useState<'approve' | 'flag' | 'note'>('approve')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [migrationPending, setMigrationPending] = useState(false)

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true)
    try {
      const res = await fetch(`/api/admin/protocol-library/review?card_key=${encodeURIComponent(card.card_key)}`, { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as { reviews: ReviewRow[]; _migrationPending?: boolean }
      setReviews(json.reviews ?? [])
      if (json._migrationPending) setMigrationPending(true)
    } finally {
      setReviewsLoading(false)
    }
  }, [card.card_key])

  useEffect(() => {
    void loadReviews()
    setNote('')
    setFeedback(null)
  }, [card.card_key, loadReviews])

  const cardVersion = useMemo(() => `${card.updated_at}`, [card.updated_at])

  async function submit() {
    if (submitting) return
    if (action === 'flag' && !note.trim()) {
      setFeedback({ kind: 'err', text: 'Flag requires a note.' })
      return
    }
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/protocol-library/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          card_key: card.card_key,
          action,
          note: note.trim() || undefined,
          card_version: cardVersion,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 503 && json.error === 'migration_pending') {
          setMigrationPending(true)
          setFeedback({ kind: 'err', text: 'Migration pending — Atlas DDL apply needed first.' })
        } else {
          setFeedback({ kind: 'err', text: json.error ?? 'review failed' })
        }
        return
      }
      const promoted = json.promoted ? ` · promoted to ${json.newLevel}` : ''
      setFeedback({ kind: 'ok', text: `Recorded ${action}${promoted}.` })
      setNote('')
      await loadReviews()
      onReviewed()
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'review failed' })
    } finally {
      setSubmitting(false)
    }
  }

  const actionStyles: Record<typeof action, string> = {
    approve: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    flag: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
    note: 'border-slate-500/50 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  }

  return (
    <section className="border border-amber-500/30 bg-amber-500/5 rounded p-3 space-y-3 min-w-0">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Verification</h4>
        <div className="text-[11px] text-gray-500">
          current: <LevelBadge level={card.verification_level} />
        </div>
      </div>

      {migrationPending && (
        <div className="text-xs border border-amber-600/40 bg-amber-600/10 rounded p-2">
          <strong>Migration pending:</strong> the <code>card_reviews</code> table isn&apos;t live yet.
          Apply <code>supabase/migrations/20260425000000_card_reviews.sql</code> via Supabase Management API or dashboard, then retry.
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(['approve', 'flag', 'note'] as const).map(a => (
          <button
            key={a}
            type="button"
            onClick={() => setAction(a)}
            className={`px-3 py-1.5 text-xs font-mono uppercase rounded border ${action === a ? actionStyles[a] : 'border-gray-300 dark:border-gray-700 text-gray-500'}`}
          >
            {a === 'approve' ? '✅ approve' : a === 'flag' ? '⚠ flag' : '📝 note'}
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={action === 'flag' ? 'Required: describe the correction needed' : 'Optional note'}
        rows={2}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-transparent rounded resize-y min-w-0"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="px-3 py-1.5 text-xs font-semibold rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900 disabled:opacity-50"
        >
          {submitting ? 'submitting…' : `submit ${action}`}
        </button>
        {action === 'approve' && (
          <span className="text-[11px] text-gray-500">
            promotes verification_level → {nextLevelLabel(card.verification_level)}
          </span>
        )}
        {feedback && (
          <span className={`text-[11px] ${feedback.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
            {feedback.text}
          </span>
        )}
      </div>

      <div className="border-t border-amber-500/20 pt-3">
        <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Audit trail</div>
        {reviewsLoading ? (
          <div className="text-xs text-gray-500">Loading…</div>
        ) : reviews.length === 0 ? (
          <div className="text-xs text-gray-500">No reviews yet for this card.</div>
        ) : (
          <ul className="space-y-1 text-xs">
            {reviews.map(r => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 break-words">
                <span className="font-mono uppercase text-[10px] px-1.5 py-0.5 rounded bg-gray-200/60 dark:bg-gray-800/60">{r.action}</span>
                <span className="text-gray-700 dark:text-gray-300">{r.reviewer_email}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{new Date(r.reviewed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                {r.note && <span className="basis-full text-gray-600 dark:text-gray-400 italic">{r.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function nextLevelLabel(current: string | null): string {
  const ladder = ['draft', 'single_source', 'cross_ref', 'pro_verified']
  const idx = ladder.indexOf(current ?? 'draft')
  if (idx < 0) return 'single_source'
  return ladder[Math.min(idx + 1, ladder.length - 1)]
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</h4>
      {children}
    </section>
  )
}

function Lane({ title, tone, children }: { title: string; tone: 'home' | 'pro'; children: React.ReactNode }) {
  const border = tone === 'home' ? 'border-emerald-500/30' : 'border-blue-500/30'
  return (
    <div className={`border-l-2 ${border} pl-4 min-w-0`}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{title}</h4>
      {children}
    </div>
  )
}

function ProtocolBlock({ protocol }: { protocol: ProProtocol | DiyProtocol }) {
  return (
    <div className="text-sm space-y-3 min-w-0 break-words">
      {protocol.steps && protocol.steps.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Steps</div>
          <ol className="space-y-1">
            {protocol.steps.map((s, i) => <li key={i} className="text-gray-700 dark:text-gray-300 break-words">{s}</li>)}
          </ol>
        </div>
      )}
      {protocol.products && protocol.products.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Products</div>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 break-words">
            {protocol.products.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
      {'temperature' in protocol && protocol.temperature && (
        <div className="text-xs text-gray-500 break-words">temperature: {protocol.temperature}</div>
      )}
      {'whenToStop' in protocol && protocol.whenToStop && (
        <div className="text-xs text-amber-700 dark:text-amber-400 break-words">when to stop: {protocol.whenToStop}</div>
      )}
      {protocol.warnings && protocol.warnings.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Warnings</div>
          <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-400 break-words">
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
    <div className={`rounded border p-3 min-w-0 ${tones[tone]}`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] font-mono uppercase tracking-wide text-gray-600 dark:text-gray-400 break-words">{label}</div>
      <div className="text-[10px] text-gray-500 mt-0.5 break-words">{hint}</div>
    </div>
  )
}
