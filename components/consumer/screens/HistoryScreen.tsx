'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Settings, Shirt, ChevronRight, Search, CheckCircle2, Clock, Sparkles } from 'lucide-react'
import BottomNav from '@/components/consumer/BottomNav'
import BetaBadge from '@/components/consumer/BetaBadge'
import GonrLogo from '@/components/brand/GonrLogo'
import { EXAMPLE_CHIPS } from '@/lib/consumer-safety/solve-input'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { listHistoryIds, listHistoryEntries, type HistoryEntry } from '@/lib/solve/history-store'
import { hasLikelySession } from '@/lib/auth/has-session'

// TASK-218 Screen 11 — HISTORY. Every past stain check in one calm, premium list,
// bound to the REAL /api/solves/history endpoint (session-cookie auth; no signup
// wall). Rows re-open the intake pre-filled so a user can pick a check back up.
// The search field is a demoted client-side filter — history stays the hero.
// No fabricated telemetry; an empty list reads as consumer language, never an
// internal "no events" string. Fully bilingual: every user-facing string resolves
// through t(key); engine fields (stain/surface) render verbatim.

type Translate = (key: string) => string

interface HistoryRow {
  correlation_id: string
  stain: string | null
  surface: string | null
  served_at: string
  outcome: string | null
}

interface HistoryResponse {
  ok?: boolean
  results?: HistoryRow[]
}

function titleCase(value: string): string {
  return value.replace(/(^|[\s-])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase())
}

function rowTitle(row: HistoryRow, t: Translate): string {
  const stain = row.stain ? titleCase(row.stain) : t('history.rowFallbackTitle')
  return row.surface ? `${stain} ${t('history.rowOnConnector')} ${titleCase(row.surface)}` : stain
}

function relativeWhen(iso: string, t: Translate, lang: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const at = d.getTime()
  if (at >= startOfToday) return t('history.today')
  if (at >= startOfToday - 86_400_000) return t('history.yesterday')
  return d.toLocaleDateString(lang === 'es' ? 'es' : 'en', { month: 'short', day: 'numeric' })
}

type Load = 'loading' | 'ready' | 'auth' | 'error'

// TASK-233 (codex-review P2) — locally persisted checks must render even when
// the server list is unavailable (anon 401, network error) or missing rows.
// Server rows win on duplicate correlation ids; local-only rows are appended
// and the merged list sorts newest-first.
function localEntryToRow(e: HistoryEntry): HistoryRow {
  const input = (e.input ?? {}) as { stainDescription?: string; material?: string }
  const card = ((e.response ?? {}).card ?? {}) as { title?: string; surface?: string }
  return {
    correlation_id: e.id,
    stain: input.stainDescription || card.title || null,
    surface: card.surface || (input.material && input.material !== 'unknown' ? input.material : null),
    served_at: new Date(e.ts).toISOString(),
    outcome: null,
  }
}

function mergeRows(server: HistoryRow[], local: HistoryRow[]): HistoryRow[] {
  const seen = new Set(server.map((r) => r.correlation_id))
  const merged = [...server, ...local.filter((r) => !seen.has(r.correlation_id))]
  return merged.sort((a, b) => (b.served_at > a.served_at ? 1 : b.served_at < a.served_at ? -1 : 0))
}

export default function HistoryScreen() {
  const { t, lang } = useLanguage()
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [state, setState] = useState<Load>('loading')
  const [filter, setFilter] = useState('')
  // TASK-233 — ids with a locally stored result open the exact stored answer
  // (?hid=) instead of re-running a bare-keyword solve. Read once on mount —
  // localStorage is unavailable during SSR.
  const [storedIds, setStoredIds] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStoredIds(listHistoryIds())
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        // TASK-234 — anonymous sessions skip the cookie-auth endpoint (it
        // 401'd as a console resource error) and render local entries only.
        if (!hasLikelySession()) {
          const local = listHistoryEntries().map(localEntryToRow)
          if (!cancelled) {
            if (local.length > 0) {
              setRows(local)
              setState('ready')
            } else {
              setState('auth')
            }
          }
          return
        }
        const res = await fetch('/api/solves/history?limit=50', { credentials: 'include' })
        if (cancelled) return
        const local = listHistoryEntries().map(localEntryToRow)
        if (res.status === 401) {
          // Anonymous users still see their locally persisted checks.
          if (local.length > 0) {
            setRows(local)
            setState('ready')
          } else {
            setState('auth')
          }
          return
        }
        if (!res.ok) {
          if (local.length > 0) {
            setRows(local)
            setState('ready')
          } else {
            setState('error')
          }
          return
        }
        const data = (await res.json()) as HistoryResponse
        if (cancelled) return
        const server = data.ok && Array.isArray(data.results) ? data.results : []
        setRows(mergeRows(server, local))
        setState('ready')
      } catch {
        if (cancelled) return
        const local = listHistoryEntries().map(localEntryToRow)
        if (local.length > 0) {
          setRows(local)
          setState('ready')
        } else {
          setState('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => `${r.stain ?? ''} ${r.surface ?? ''}`.toLowerCase().includes(q))
  }, [rows, filter])

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-28 pt-5 lg:max-w-[960px] lg:px-10 lg:pb-12 lg:pt-8">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 lg:invisible">
          <GonrLogo className="w-[104px]" priority tmClassName="text-[6px]" />
          <BetaBadge />
        </span>
        <Link href="/solve-v2/profile" aria-label={t('common.settingsAria')} className="text-gonr-navy/60 transition-colors hover:text-gonr-navy">
          <Settings size={22} />
        </Link>
      </div>

      <h1 className="mt-7 text-[2rem] font-black leading-tight tracking-tight text-gonr-navy">{t('history.title')}</h1>
      <p className="mt-1 text-sm font-semibold text-gonr-textgray">{t('history.subtitle')}</p>

      {/* demoted search filter */}
      {state === 'ready' && rows.length > 0 ? (
        <div className="mt-5 flex items-center gap-2 rounded-full border border-[var(--gonr-border)] bg-white px-4 py-2 transition-colors focus-within:border-gonr-hotpink/40">
          <Search size={16} className="shrink-0 text-gonr-navy/40" aria-hidden="true" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('history.searchPlaceholder')}
            aria-label={t('history.searchAria')}
            className="min-h-[36px] flex-1 bg-transparent text-sm font-semibold text-gonr-navy outline-none placeholder:font-medium placeholder:text-gonr-navy/40"
          />
        </div>
      ) : null}

      <section className="mt-6 flex-1" aria-label={t('history.sectionAria')}>
        {state === 'loading' ? (
          <div className="space-y-2" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="gonr-card h-[68px] animate-pulse opacity-60" />
            ))}
          </div>
        ) : state === 'error' ? (
          <div className="gonr-card flex flex-col items-center px-6 py-10 text-center">
            <p className="text-sm font-extrabold text-gonr-navy">{t('history.errorTitle')}</p>
            <p className="mt-1 text-xs font-semibold text-gonr-textgray">{t('history.errorBody')}</p>
          </div>
        ) : state === 'auth' || rows.length === 0 ? (
          <EmptyHistory signedOut={state === 'auth'} />
        ) : visible.length === 0 ? (
          <div className="gonr-card flex flex-col items-center px-6 py-10 text-center">
            <p className="text-sm font-extrabold text-gonr-navy">{t('history.noMatchesTitle')}</p>
            <p className="mt-1 text-xs font-semibold text-gonr-textgray">{t('history.noMatchesBody')}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((row) => (
              <li key={row.correlation_id}>
                <Link
                  href={
                    storedIds.has(row.correlation_id)
                      ? `/solve-v2/solve?hid=${encodeURIComponent(row.correlation_id)}`
                      : `/solve-v2/solve?stain=${encodeURIComponent(row.stain ?? '')}`
                  }
                  className="gonr-card flex items-center justify-between gap-3 p-3 transition-transform duration-150 active:scale-[0.99]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
                      <Shirt size={20} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-extrabold text-gonr-navy">{rowTitle(row, t)}</span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs font-semibold text-gonr-textgray">{relativeWhen(row.served_at, t, lang)}</span>
                        <OutcomeChip outcome={row.outcome} />
                      </span>
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-gonr-navy/35" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BottomNav />
    </main>
  )
}

function OutcomeChip({ outcome }: { outcome: string | null }) {
  const { t } = useLanguage()
  if (!outcome) return null
  if (outcome === 'worked') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gonr-softpink px-2 py-0.5 text-[10px] font-extrabold text-gonr-navy">
        <CheckCircle2 size={11} aria-hidden="true" />
        {t('history.outcomeWorked')}
      </span>
    )
  }
  if (outcome === 'not_yet') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gonr-lightgray px-2 py-0.5 text-[10px] font-extrabold text-gonr-textgray">
        <Clock size={11} aria-hidden="true" />
        {t('history.outcomeFollowingUp')}
      </span>
    )
  }
  return null
}

function EmptyHistory({ signedOut }: { signedOut: boolean }) {
  const { t } = useLanguage()
  return (
    <div className="gonr-card flex flex-col items-center px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
        <Sparkles size={22} aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-extrabold text-gonr-navy">{t('history.emptyTitle')}</p>
      <p className="mt-1 max-w-[20rem] text-xs font-semibold leading-5 text-gonr-textgray">
        {signedOut ? t('history.emptySignedOutBody') : t('history.emptyBody')}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {EXAMPLE_CHIPS.map((example) => (
          <Link
            key={example}
            href={`/solve-v2/solve?stain=${encodeURIComponent(example)}`}
            className="rounded-full bg-gonr-softpink px-3 py-1.5 text-xs font-bold text-gonr-navy transition-transform duration-150 active:scale-95"
          >
            {example}
          </Link>
        ))}
      </div>
    </div>
  )
}
