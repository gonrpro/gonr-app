'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings, ArrowRight, ChevronRight, Shirt, Sparkles, Camera, ScanLine, ShieldCheck } from 'lucide-react'
import BottomNav from '@/components/consumer/BottomNav'
import AttachMenu, { type AttachInitialAction } from '@/components/consumer/AttachMenu'
import { EXAMPLE_CHIPS } from '@/lib/consumer-safety/solve-input'

// TASK-218 Screen 1 — HOME. Premium fabric-care brand surface, GREEN-FREE.
//
// The home is NOT text-first. Three native on-ramps are surfaced UP FRONT as the
// obvious first move (Atlas gate 2026-06-08): snap a photo, scan the care label, and
// describe it. Photo + care-label deep-link into the Attach action-sheet in place
// (the same sheet, opened to the right capture); the free-text field is the chat
// on-ramp. All three feed the SAME orchestrator at /solve-v2/solve, in any order —
// no FAB, no dead taps.
//
// No verdict / "safe to try" / treatment language on load, no fabricated counts or
// telemetry — the engine speaks on the result screen, not here. The headline keeps
// the safety hook (know what NOT to); the magic line sets the agentic promise.
//
// RECENT binds to real /api/solves/history data (cookie auth; anon/no-history -> a
// calm empty state, never a signup wall).

// Minimal projection of the SolveHistoryRow shape the home RECENT list renders.
interface RecentRow {
  correlation_id: string
  stain: string | null
  surface: string | null
  served_at: string
}

interface HistoryResponse {
  ok?: boolean
  results?: RecentRow[]
}

// Capitalize hyphen/space-separated words so user-entered lowercase terms
// ("red-wine", "white cotton shirt") render cleanly as a title.
function titleCase(value: string): string {
  return value.replace(/(^|[\s-])([a-z])/g, (_match, sep: string, ch: string) => sep + ch.toUpperCase())
}

function recentTitle(row: RecentRow): string {
  const stain = row.stain ? titleCase(row.stain) : 'Stain check'
  return row.surface ? `${stain} on ${titleCase(row.surface)}` : stain
}

function relativeWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = d.getTime()
  if (t >= startOfToday) return 'Today'
  if (t >= startOfToday - 86_400_000) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function HomeScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<RecentRow[]>([])
  const [recentLoaded, setRecentLoaded] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  // Which capture the Attach sheet jumps straight into when opened from a tile
  // ('menu' = open to the full list).
  const [attachAction, setAttachAction] = useState<AttachInitialAction>('menu')

  const openAttach = useCallback((action: AttachInitialAction) => {
    setAttachAction(action)
    setAttachOpen(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/solves/history?limit=4', { credentials: 'include' })
      .then((res) => (res.ok ? (res.json() as Promise<HistoryResponse>) : null))
      .then((data) => {
        if (cancelled) return
        const rows = data?.ok && Array.isArray(data.results) ? data.results : []
        setRecent(rows.slice(0, 4))
        setRecentLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setRecentLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmed = query.trim()
      if (!trimmed) return
      router.push(`/solve-v2/solve?stain=${encodeURIComponent(trimmed)}`)
    },
    [query, router],
  )

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-28 pt-5">
      {/* soft brand glow wash — premium depth/vibrancy behind the hero (green-free) */}
      <div aria-hidden="true" className="gonr-hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-72" />

      {/* top bar: approved GONR-only gradient wordmark + settings */}
      <div className="flex items-center justify-between">
        <span className="gonr-gradient-text text-2xl font-black tracking-tight">GONR</span>
        <Link href="/solve-v2/profile" aria-label="Settings" className="text-gonr-navy/60">
          <Settings size={22} />
        </Link>
      </div>

      {/* hero promise line — keeps the "know what NOT to" safety hook */}
      <h1 className="mt-9 text-[2.1rem] font-black leading-[1.12] tracking-tight text-gonr-navy">
        Know what to <span className="text-gonr-hotpink">do</span>.
        <br />
        Know what <span className="text-gonr-hotpink">not</span> to.
      </h1>

      {/* magic-read invitation — sets the "show me the stain" expectation */}
      <p className="mt-3 text-[15px] font-semibold leading-6 text-gonr-textgray">
        Show us the stain. GONR reads what it can and asks only what matters.
      </p>

      {/* NATIVE ON-RAMPS — photo + care-label up front, equal weight to chat. Each
          opens the Attach sheet jumped straight to the right capture; the safety
          on-ramp (care label) is never buried. */}
      <div className="gonr-fade-up mt-7 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => openAttach('take-photo')}
          className="gonr-card gonr-card-raised gonr-pressable flex flex-col gap-3 p-4 text-left"
        >
          <span className="gonr-gradient grid h-12 w-12 place-items-center rounded-2xl text-white shadow-md">
            <Camera size={24} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-extrabold text-gonr-navy">Snap the stain</span>
            <span className="mt-0.5 text-xs font-semibold text-gonr-textgray">Photo-first read</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => openAttach('care-label')}
          className="gonr-card gonr-card-raised gonr-pressable flex flex-col gap-3 p-4 text-left"
        >
          <span className="gonr-gradient grid h-12 w-12 place-items-center rounded-2xl text-white shadow-md">
            <ScanLine size={24} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="flex items-center gap-1.5 text-base font-extrabold text-gonr-navy">
              Scan label
              <ShieldCheck size={14} className="text-gonr-hotpink" aria-hidden="true" />
            </span>
            <span className="mt-0.5 text-xs font-semibold text-gonr-textgray">Fabric &amp; care first</span>
          </span>
        </button>
      </div>

      {/* CHAT on-ramp — describe it in words. Same orchestrator, any order.
          Stacked (input full-width over a full-width CTA) so the whole placeholder
          stays readable and the "Ask GONR" CTA never overlaps/clips it on narrow
          phones — the inline pill squeezed the field below the placeholder width. */}
      <form
        onSubmit={onSubmit}
        className="gonr-card mt-3 flex flex-col gap-2.5 p-3"
        role="search"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Or describe what happened…"
          aria-label="Describe your stain or fabric"
          enterKeyHint="search"
          className="w-full bg-transparent px-1.5 py-1.5 text-base font-bold text-gonr-navy outline-none placeholder:font-semibold placeholder:text-gonr-navy/40"
        />
        <button
          type="submit"
          disabled={query.trim().length === 0}
          className="gonr-gradient gonr-cta gonr-pressable inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-extrabold text-white transition-opacity duration-200 disabled:opacity-40"
        >
          Ask GONR
          <ArrowRight size={16} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </form>

      {/* recent activity — bound to real history data, calm empty state */}
      <section className="mt-9" aria-label="Recent checks">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-gonr-textgray">
            Recent
          </h2>
          <Link href="/solve-v2/history" className="text-sm font-bold text-gonr-hotpink">
            View all
          </Link>
        </div>

        {!recentLoaded ? (
          <div className="mt-3 space-y-2" aria-hidden="true">
            {[0, 1].map((i) => (
              <div key={i} className="gonr-card h-[64px] animate-pulse opacity-60" />
            ))}
          </div>
        ) : recent.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {recent.map((row) => (
              <li key={row.correlation_id}>
                <Link
                  href={`/solve-v2/solve?stain=${encodeURIComponent(row.stain ?? '')}`}
                  className="gonr-card flex items-center justify-between gap-3 p-3"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
                      <Shirt size={20} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-extrabold text-gonr-navy">
                        {recentTitle(row)}
                      </span>
                      <span className="text-xs font-semibold text-gonr-textgray">
                        {relativeWhen(row.served_at)}
                      </span>
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-gonr-navy/35" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="gonr-card mt-3 flex flex-col items-center px-6 py-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
              <Sparkles size={22} aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-extrabold text-gonr-navy">No saved rescues yet</p>
            <p className="mt-1 text-xs font-semibold text-gonr-textgray">
              Start your first stain check — it&rsquo;ll show up here. Try one of these:
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {EXAMPLE_CHIPS.map((example) => (
                <Link
                  key={example}
                  href={`/solve-v2/solve?stain=${encodeURIComponent(example)}`}
                  className="rounded-full bg-gonr-softpink px-3 py-1.5 text-xs font-bold text-gonr-navy"
                >
                  {example}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Attach action-sheet (screen 2). Photo / care-label capture runs the live
          vision endpoints and carries the hint into the intake flow; no dead tap.
          Deep-linked to the capture the tapped on-ramp chose. */}
      <AttachMenu
        open={attachOpen}
        initialAction={attachAction}
        onClose={() => {
          setAttachOpen(false)
          setAttachAction('menu')
        }}
      />

      <BottomNav />
    </main>
  )
}
