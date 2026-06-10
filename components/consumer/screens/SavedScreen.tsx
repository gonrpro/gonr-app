'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Settings, Bookmark, Tag, ChevronDown, Trash2, ScanLine, Sparkles } from 'lucide-react'
import type { Step } from '@/lib/types'
import BottomNav from '@/components/consumer/BottomNav'
import BetaBadge from '@/components/consumer/BetaBadge'
import ResultsStepList from '@/components/consumer/ResultsStepList'
import DoNotDoPanel from '@/components/consumer/DoNotDoPanel'
import GonrLogo from '@/components/brand/GonrLogo'
import { useSessionEmail } from '@/components/consumer/useSessionEmail'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import {
  deleteSavedLabel,
  subscribeSavedLabels,
  getSavedLabelsSnapshot,
  getSavedLabelsServerSnapshot,
} from '@/lib/consumer-safety/saved-labels'

// TASK-218 Screen 12 — SAVED / MY LIBRARY. Two tabs:
//  • Saved   — protocols saved from a result (GET/DELETE /api/protocols/saved).
//              Rows expand to the consumer-safe view of the card: home steps +
//              the FULL Do-Not-Do (safety fields render exactly, never stripped).
//  • Labels  — scanned care labels (thin localStorage store, no backend). Care
//              warnings render as do-not constraints, verbatim.
// Premium fabric-care brand surface; green-free skin; no signup wall (a calm
// sign-in invite when we have no email, never a hard wall). Fully bilingual:
// chrome resolves through t(key); engine/card fields render verbatim, and the
// Do-Not-Do safety panel is always passed through untouched.

// Consumer-safe projection of a saved protocol card. Pro fields (spottingProtocol,
// products.professional) are intentionally absent — the consumer view never
// renders them even if a paid user saved a full card.
interface SavedCard {
  title?: string
  source?: string
  homeSolutions?: ReadonlyArray<string | Step>
  materialWarnings?: ReadonlyArray<string>
  safetyMatrix?: { neverDo?: ReadonlyArray<string> }
  meta?: { riskLevel?: string }
}

interface SavedProtocolRow {
  id: string
  protocol_json: SavedCard | null
  title: string
  stain: string
  surface: string
  notes: string | null
  created_at: string
}

interface SavedResponse {
  protocols?: SavedProtocolRow[]
}

type Tab = 'saved' | 'labels'

export default function SavedScreen() {
  const { t } = useLanguage()
  const { email, loading: emailLoading } = useSessionEmail()
  const [tab, setTab] = useState<Tab>('saved')

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

      <h1 className="mt-7 text-[2rem] font-black leading-tight tracking-tight text-gonr-navy">{t('library.title')}</h1>
      <p className="mt-1 text-sm font-semibold text-gonr-textgray">{t('library.subtitle')}</p>

      {/* segmented Saved | Labels */}
      <div
        role="tablist"
        aria-label={t('library.sectionsAria')}
        className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-gonr-lightgray p-1"
      >
        <TabButton active={tab === 'saved'} onClick={() => setTab('saved')} Icon={Bookmark} label={t('library.tabSaved')} />
        <TabButton active={tab === 'labels'} onClick={() => setTab('labels')} Icon={Tag} label={t('library.tabLabels')} />
      </div>

      <section className="mt-6 flex-1">
        {tab === 'saved' ? (
          <SavedTab email={email} emailLoading={emailLoading} />
        ) : (
          <LabelsTab />
        )}
      </section>

      <BottomNav />
    </main>
  )
}

function TabButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  Icon: typeof Bookmark
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-extrabold transition-colors ${
        active ? 'bg-white text-gonr-hotpink shadow-sm' : 'text-gonr-navy/55'
      }`}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  )
}

// ── Saved protocols ─────────────────────────────────────────────────────────
function SavedTab({ email, emailLoading }: { email: string | null; emailLoading: boolean }) {
  const { t } = useLanguage()
  const [rows, setRows] = useState<SavedProtocolRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchSaved = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/protocols/saved', { credentials: 'include' })
      if (!res.ok) {
        setRows([])
        return
      }
      const data = (await res.json()) as SavedResponse
      setRows(Array.isArray(data.protocols) ? data.protocols : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (emailLoading) return
    if (!email) {
      setLoading(false)
      return
    }
    void fetchSaved()
  }, [email, emailLoading, fetchSaved])

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting(id)
      try {
        const res = await fetch(`/api/protocols/saved/${id}`, { method: 'DELETE' })
        if (res.ok) {
          setRows((prev) => prev.filter((p) => p.id !== id))
          setExpanded((cur) => (cur === id ? null : cur))
        }
      } catch {
        // keep the row; a failed delete should not silently drop it.
      } finally {
        setDeleting(null)
      }
    },
    [],
  )

  if (emailLoading || loading) {
    return (
      <div className="space-y-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="gonr-card h-[72px] animate-pulse opacity-60" />
        ))}
      </div>
    )
  }

  if (!email) {
    return (
      <EmptyState
        Icon={Bookmark}
        title={t('library.savedSignedOutTitle')}
        body={t('library.savedSignedOutBody')}
      />
    )
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        Icon={Sparkles}
        title={t('library.savedEmptyTitle')}
        body={t('library.savedEmptyBody')}
        cta
      />
    )
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const open = expanded === row.id
        const sub = [row.stain, row.surface].filter(Boolean).join(' · ')
        const card = row.protocol_json
        const steps = card?.homeSolutions ?? []
        return (
          <li key={row.id} className="gonr-card overflow-hidden p-0">
            <button
              type="button"
              onClick={() => setExpanded(open ? null : row.id)}
              aria-expanded={open}
              className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors"
            >
              <span className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
                  <Bookmark size={20} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-extrabold text-gonr-navy">{row.title}</span>
                  {sub ? <span className="mt-0.5 truncate text-xs font-semibold text-gonr-textgray">{sub}</span> : null}
                  {row.notes ? (
                    <span className="mt-0.5 line-clamp-2 text-xs font-medium text-gonr-textgray">
                      {row.notes}
                    </span>
                  ) : null}
                </span>
              </span>
              <ChevronDown
                size={18}
                className={`mt-1 shrink-0 text-gonr-navy/35 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {open ? (
              <div className="border-t border-[var(--gonr-border)] px-4 pb-4 pt-3">
                {steps.length > 0 ? (
                  <ResultsStepList steps={steps} heading={t('library.safeStepsHeading')} />
                ) : (
                  <p className="text-sm font-semibold text-gonr-textgray">{t('library.reRunBody')}</p>
                )}

                <DoNotDoPanel
                  className="mt-5"
                  neverDo={card?.safetyMatrix?.neverDo}
                  materialWarnings={card?.materialWarnings}
                />

                <button
                  type="button"
                  onClick={() => handleDelete(row.id)}
                  disabled={deleting === row.id}
                  className="mt-5 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--gonr-border)] bg-white px-4 text-xs font-extrabold text-gonr-navy/70 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={15} aria-hidden="true" />
                  {deleting === row.id ? t('library.removing') : t('library.removeFromLibrary')}
                </button>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

// ── Saved care labels (localStorage via external store) ──────────────────────
function LabelsTab() {
  const { t } = useLanguage()
  // useSyncExternalStore reads the localStorage-backed store with a stable server
  // snapshot ([]), so there is no setState-in-effect and no hydration mismatch.
  const labels = useSyncExternalStore(
    subscribeSavedLabels,
    getSavedLabelsSnapshot,
    getSavedLabelsServerSnapshot,
  )

  const handleDelete = useCallback((id: string) => {
    deleteSavedLabel(id)
  }, [])

  if (labels.length === 0) {
    return (
      <EmptyState
        Icon={ScanLine}
        title={t('library.labelsEmptyTitle')}
        body={t('library.labelsEmptyBody')}
      />
    )
  }

  return (
    <ul className="space-y-2">
      {labels.map((label) => (
        <li key={label.id} className="gonr-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
                <Tag size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-gonr-navy">
                  {label.title?.trim() || label.fiber}
                </p>
                {label.title?.trim() ? (
                  <p className="mt-0.5 truncate text-xs font-semibold text-gonr-textgray">{label.fiber}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(label.id)}
              aria-label={t('library.deleteLabelAria')}
              className="shrink-0 text-gonr-navy/40 transition-colors hover:text-gonr-hotpink"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>

          {label.careSymbols.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {label.careSymbols.map((symbol) => (
                <span
                  key={symbol}
                  className="rounded-full bg-gonr-lightgray px-3 py-1 text-xs font-bold text-gonr-navy"
                >
                  {symbol}
                </span>
              ))}
            </div>
          ) : null}

          {label.warnings.length > 0 ? (
            <DoNotDoPanel className="mt-4" heading={t('library.fromLabelHeading')} materialWarnings={label.warnings} />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function EmptyState({
  Icon,
  title,
  body,
  cta,
}: {
  Icon: typeof Bookmark
  title: string
  body: string
  cta?: boolean
}) {
  const { t } = useLanguage()
  return (
    <div className="gonr-card flex flex-col items-center px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-extrabold text-gonr-navy">{title}</p>
      <p className="mt-1 max-w-[20rem] text-xs font-semibold leading-5 text-gonr-textgray">{body}</p>
      {cta ? (
        <Link
          href="/solve-v2"
          className="gonr-gradient gonr-cta mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full px-6 text-sm font-extrabold text-white transition-transform duration-150 active:scale-95"
        >
          {t('library.startCheckCta')}
        </Link>
      ) : null}
    </div>
  )
}
