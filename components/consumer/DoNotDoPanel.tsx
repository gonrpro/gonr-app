'use client'

import { useState } from 'react'
import { ChevronDown, XCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// TASK-218 SHARED FOUNDATION — the highest-stakes teaching surface.
// Renders EVERY prohibition the engine returns: safetyMatrix.neverDo +
// materialWarnings (+ classifier verdict.avoid). NEVER .slice()/truncates safety
// content to fit layout — all items show. Danger severity is hot-pink/red, never
// green, and is visually unmistakable from the allowed-steps list. Every line is
// engine-authored; this component invents nothing.

export interface DoNotDoItem {
  prohibition: string
  /** Optional one-line reason, when the engine supplies it separately. */
  reason?: string
}

export interface DoNotDoPanelProps {
  /** card.safetyMatrix.neverDo */
  neverDo?: ReadonlyArray<string>
  /** card.materialWarnings (engine prepends computed fiber/material rules) */
  materialWarnings?: ReadonlyArray<string>
  /** classifier verdict.avoid */
  avoid?: ReadonlyArray<string>
  /** Pre-structured prohibition+reason rows (rendered after the string sources). */
  items?: ReadonlyArray<DoNotDoItem>
  /** Eyebrow heading. Pass `null` to suppress it (e.g. when a parent severity
   *  wrapper like DoNotDoScreen already provides the canonical "Do not do" headline). */
  heading?: string | null
  className?: string
  /** Progressively disclose: show only the highest-risk `initialVisible` rows up
   *  front with the rest behind a "Show all" toggle. ALL rows stay available — the
   *  tail is hidden, never dropped. Off by default so existing usages are unchanged.
   *  Source order (neverDo → materialWarnings → avoid) is already highest-risk first,
   *  so the visible head is the most severe set. */
  collapsible?: boolean
  /** Head size when `collapsible` is on (default 5; Atlas gate calls for 3-5). */
  initialVisible?: number
}

function dedupeMerge(
  sources: ReadonlyArray<ReadonlyArray<string> | undefined>,
  structured: ReadonlyArray<DoNotDoItem> | undefined,
): DoNotDoItem[] {
  const seen = new Set<string>()
  const out: DoNotDoItem[] = []
  for (const list of sources) {
    if (!list) continue
    for (const raw of list) {
      const text = raw.trim()
      if (text.length === 0) continue
      const key = text.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ prohibition: text })
    }
  }
  if (structured) {
    for (const item of structured) {
      const text = item.prohibition.trim()
      if (text.length === 0) continue
      const key = text.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ prohibition: text, reason: item.reason?.trim() || undefined })
    }
  }
  return out
}

export default function DoNotDoPanel({
  neverDo,
  materialWarnings,
  avoid,
  items,
  heading,
  className,
  collapsible = false,
  initialVisible = 5,
}: DoNotDoPanelProps) {
  const { t } = useLanguage()
  const rows = dedupeMerge([neverDo, materialWarnings, avoid], items)
  const [showAll, setShowAll] = useState(false)
  if (rows.length === 0) return null

  // `null` explicitly suppresses the eyebrow (DoNotDoScreen owns the canonical
  // headline); a passed string overrides; undefined falls back to the catalog default.
  const resolvedHeading = heading === null ? null : (heading ?? t('doNotDo.panelHeadingDefault'))

  // Progressive disclosure: hide (never drop) the tail beyond the highest-risk head.
  const canCollapse = collapsible && rows.length > initialVisible
  const visibleRows = canCollapse && !showAll ? rows.slice(0, initialVisible) : rows

  return (
    <section className={className} aria-label={t('doNotDo.panelAria')}>
      {resolvedHeading ? (
        <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-gonr-textgray">{resolvedHeading}</p>
      ) : null}
      <ul className="grid gap-2">
        {visibleRows.map((row, index) => (
          <li key={index} className="gonr-donotdo-row">
            <XCircle size={20} strokeWidth={2.25} className="mt-0.5 shrink-0 text-[var(--gonr-danger)]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-6 text-gonr-navy">{row.prohibition}</p>
              {row.reason ? (
                <p className="mt-0.5 text-sm font-medium leading-5 text-gonr-textgray">{row.reason}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {canCollapse ? (
        <button
          type="button"
          onClick={() => setShowAll((open) => !open)}
          aria-expanded={showAll}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--gonr-border)] bg-white px-4 py-2 text-sm font-extrabold text-gonr-navy"
        >
          {showAll
            ? t('doNotDo.showFewer')
            : t('doNotDo.showAllWarnings').replace('{count}', String(rows.length))}
          <ChevronDown
            size={16}
            className={`shrink-0 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </section>
  )
}
