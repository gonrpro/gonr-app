'use client'

import { AlertTriangle } from 'lucide-react'
import DoNotDoPanel, { type DoNotDoItem } from '@/components/consumer/DoNotDoPanel'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// TASK-218 SCREEN 6 — DO-NOT-DO.
// Premium severity wrapper around the scaffold DoNotDoPanel. Co-located with the
// Results screen but visually UNMISTAKABLE from the allowed-steps list: a red
// danger rail, a red alert mark, and red-railed prohibition rows. This is the
// highest-stakes teaching surface — it renders EVERY prohibition the engine
// returns (card.safetyMatrix.neverDo + card.materialWarnings + classifier
// verdict.avoid), never .slice()/truncated, each paired with its engine-provided
// reason. It authors NO prohibition, reason, or care advice of its own; all rows
// come from the engine via DoNotDoPanel. Per OVERRIDES, danger never reads green.

export interface DoNotDoScreenProps {
  /** card.safetyMatrix.neverDo — hard "never X" prohibitions. */
  neverDo?: ReadonlyArray<string>
  /** card.materialWarnings — engine prepends computed fiber/material rules. */
  materialWarnings?: ReadonlyArray<string>
  /** classifier verdict.avoid — rule-engine actions to avoid for this stain. */
  avoid?: ReadonlyArray<string>
  /** Pre-structured prohibition+reason rows, when the engine pairs them. */
  items?: ReadonlyArray<DoNotDoItem>
  /** Canonical severity headline (defaults to "Do not do"). This is the ONE
   *  Do-Not-Do heading on the surface — the inner panel's muted eyebrow is
   *  suppressed so the two never double up. */
  heading?: string
  className?: string
  /** Forwarded to DoNotDoPanel: show the highest-risk head first and put the rest
   *  behind a "Show all" toggle. Nothing is dropped — the tail is progressively
   *  disclosed. Used by Results for the top prohibition panel. */
  collapsible?: boolean
}

/** Lightweight emptiness gate so the severity card never renders empty. */
function hasContent(
  sources: ReadonlyArray<ReadonlyArray<string> | undefined>,
  items: ReadonlyArray<DoNotDoItem> | undefined,
): boolean {
  for (const list of sources) {
    if (list?.some((text) => text.trim().length > 0)) return true
  }
  return Boolean(items?.some((item) => item.prohibition.trim().length > 0))
}

export default function DoNotDoScreen({
  neverDo,
  materialWarnings,
  avoid,
  items,
  heading,
  className,
  collapsible = false,
}: DoNotDoScreenProps) {
  const { t } = useLanguage()
  if (!hasContent([neverDo, materialWarnings, avoid], items)) return null

  return (
    <section
      className={className}
      aria-labelledby="gonr-donotdo-title"
    >
      {/* Screen-level severity header — distinct from the allowed-steps eyebrow. */}
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[rgba(225,29,72,0.08)] text-[var(--gonr-danger)]">
          <AlertTriangle size={22} strokeWidth={2.25} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2
            id="gonr-donotdo-title"
            className="text-lg font-black leading-tight text-gonr-navy"
          >
            {heading ?? t('doNotDo.screenHeadingDefault')}
          </h2>
          <p className="text-sm font-medium leading-5 text-gonr-textgray">
            {t('doNotDo.screenSubhead')}
          </p>
        </div>
      </div>

      {/* Danger-railed card: white premium surface with a red top rail so it is
          never confused with the recommended-steps card. The rows themselves
          carry their own red severity styling via DoNotDoPanel. */}
      <div className="gonr-card mt-4 border-t-4 border-t-[var(--gonr-danger)] p-4">
        <DoNotDoPanel
          neverDo={neverDo}
          materialWarnings={materialWarnings}
          avoid={avoid}
          items={items}
          heading={null}
          collapsible={collapsible}
        />
      </div>
    </section>
  )
}
