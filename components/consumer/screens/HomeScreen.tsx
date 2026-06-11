'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings, ArrowRight, ChevronRight, Shirt, Sparkles, Camera, ScanLine, ShieldCheck, Loader2 } from 'lucide-react'
import BottomNav from '@/components/consumer/BottomNav'
import BetaBadge from '@/components/consumer/BetaBadge'
import LanguageToggle from '@/components/consumer/LanguageToggle'
import dynamic from 'next/dynamic'
import { type AttachInitialAction } from '@/components/consumer/AttachMenu'

// TASK-240 — the attach sheet (camera/label scan) loads on demand; it only
// renders after a tile tap, so it stays out of Home's initial bundle.
const AttachMenu = dynamic(() => import('@/components/consumer/AttachMenu'), { ssr: false })
import GonrLogo from '@/components/brand/GonrLogo'
import FooterContent from '@/components/layout/FooterContent'
import { EXAMPLE_CHIPS } from '@/lib/consumer-safety/solve-input'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { hasLikelySession } from '@/lib/auth/has-session'
import { listHistoryEntries } from '@/lib/solve/history-store'

type Translate = (key: string) => string

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

function recentTitle(row: RecentRow, t: Translate): string {
  const stain = row.stain ? titleCase(row.stain) : t('home.recentDefaultTitle')
  if (!row.surface) return stain
  return t('home.recentOnSurface')
    .replace('{stain}', stain)
    .replace('{surface}', titleCase(row.surface))
}

function relativeWhen(iso: string, t: Translate, lang: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const at = d.getTime()
  if (at >= startOfToday) return t('home.relativeToday')
  if (at >= startOfToday - 86_400_000) return t('home.relativeYesterday')
  return d.toLocaleDateString(lang === 'es' ? 'es' : 'en', { month: 'short', day: 'numeric' })
}

export default function HomeScreen() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const [query, setQuery] = useState('')
  // TASK-240 — instant CTA acknowledgment: the gradient button flips to a
  // pressed/starting state the moment the form submits, before navigation
  // commits (sub-100ms feedback gate).
  const [starting, setStarting] = useState(false)
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
    // TASK-234 — anonymous sessions skip the cookie-auth endpoint entirely
    // (it 401'd as a browser resource error on every anon load) and read the
    // locally persisted checks instead. Signed-in behavior unchanged.
    if (!hasLikelySession()) {
      const local = listHistoryEntries()
        .slice(0, 4)
        .map((e) => ({
          correlation_id: e.id,
          stain: (e.input as { stainDescription?: string })?.stainDescription ?? null,
          surface: null,
          served_at: new Date(e.ts).toISOString(),
          outcome: null,
        }))
      // External-store sync (localStorage read post-mount, same pattern as
      // SolveFlow's boot effect) — a single intentional state write.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecent(local)
       
      setRecentLoaded(true)
      return () => {
        cancelled = true
      }
    }
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
      setStarting(true)
      router.push(`/solve-v2/solve?stain=${encodeURIComponent(trimmed)}`)
    },
    [query, router],
  )

  // TASK-240 — warm the solve route as soon as the user shows intent (typing),
  // so the Home -> solve transition costs no route-bundle fetch.
  useEffect(() => {
    if (query.trim().length > 0) router.prefetch('/solve-v2/solve')
  }, [query, router])

  // Brand hero: the product name "The stain app." centered on ONE line with the GONR
  // logo gradient sweep (pink -> magenta -> orange, same as the wordmark) + the "smart
  // answers" subline. Single phrase — no clause split.
  const headline = t('home.heroHeadline')

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-28 pt-5 lg:max-w-[960px] lg:px-10 lg:pb-12 lg:pt-8">
      {/* soft brand glow wash — premium depth/vibrancy behind the hero (green-free) */}
      <div aria-hidden="true" className="gonr-hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-72" />

      {/* top bar: approved GONR-only gradient wordmark + settings */}
      <div className="flex items-center justify-between">
        {/* lg+: SideNav owns the brand mark — keep the slot so justify-between holds */}
        <span className="flex items-center gap-2 lg:invisible">
          <GonrLogo className="w-[104px]" priority tmClassName="text-[6px]" />
          <BetaBadge />
        </span>
        <span className="flex items-center gap-3">
          <LanguageToggle />
          <Link href="/solve-v2/profile" aria-label={t('home.settingsAria')} className="text-gonr-navy/60 transition-colors hover:text-gonr-navy">
            <Settings size={22} />
          </Link>
        </span>
      </div>

      {/* hero: product name centered on one line, GONR-logo gradient sweep */}
      <h1 className="gonr-fade-up gonr-gradient-text mt-9 whitespace-nowrap text-center text-[clamp(2.1rem,9.6vw,2.9rem)] font-black leading-[1.12] tracking-tight">
        {headline}
      </h1>

      {/* smart-answers subline — centered under the hero */}
      <p className="mt-3 text-center text-[15px] font-semibold leading-6 text-gonr-textgray">
        {t('home.heroSubhead')}
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
            <span className="text-base font-extrabold text-gonr-navy">{t('home.tilePhotoTitle')}</span>
            <span className="mt-0.5 text-xs font-semibold text-gonr-textgray">{t('home.tilePhotoSub')}</span>
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
              {t('home.tileLabelTitle')}
              <ShieldCheck size={14} className="text-gonr-hotpink" aria-hidden="true" />
            </span>
            <span className="mt-0.5 text-xs font-semibold text-gonr-textgray">{t('home.tileLabelSub')}</span>
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
          placeholder={t('home.describePlaceholder')}
          aria-label={t('home.describeAria')}
          enterKeyHint="search"
          className="w-full bg-transparent px-1.5 py-1.5 text-base font-bold text-gonr-navy outline-none placeholder:font-semibold placeholder:text-gonr-navy/40"
        />
        <button
          type="submit"
          disabled={query.trim().length === 0 || starting}
          aria-busy={starting}
          className="gonr-gradient gonr-cta gonr-pressable inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-extrabold text-white transition-opacity duration-200 disabled:opacity-40"
        >
          {starting ? t('home.startingCheck') : t('home.startCheck')}
          {starting ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight size={16} strokeWidth={2.6} aria-hidden="true" />
          )}
        </button>
      </form>

      {/* recent activity — bound to real history data, calm empty state */}
      <section className="mt-9" aria-label={t('home.recentSectionAria')}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-gonr-textgray">
            {t('home.recentHeading')}
          </h2>
          <Link href="/solve-v2/history" className="text-sm font-bold text-gonr-hotpink transition-opacity hover:opacity-80">
            {t('home.viewAll')}
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
                        {recentTitle(row, t)}
                      </span>
                      <span className="text-xs font-semibold text-gonr-textgray">
                        {relativeWhen(row.served_at, t, lang)}
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
            <p className="mt-3 text-sm font-extrabold text-gonr-navy">{t('home.emptyTitle')}</p>
            <p className="mt-1 text-xs font-semibold text-gonr-textgray">
              {t('home.emptyHelper')}
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

      {/* In-app footer: the consumer shell CSS-hides the global <footer>, so the
          links + liability + faded trademark mark are rendered HERE inside the
          scrollable home <main> (the pb-28 on <main> already clears the fixed
          BottomNav). Shared <FooterContent> = single source of truth with the
          legal pages' footer. */}
      <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--gonr-border)' }}>
        <FooterContent />
      </div>

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
