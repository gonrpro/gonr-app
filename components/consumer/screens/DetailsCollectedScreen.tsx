'use client'

import { useState, type FormEvent } from 'react'
import { Shirt, Pencil, ArrowRight, BookOpenCheck, Info } from 'lucide-react'
import BottomNav from '@/components/consumer/BottomNav'
import {
  type SolveInput,
  MATERIAL_OPTIONS,
  STAIN_OPTIONS,
  CARE_OPTIONS,
  HEAT_OPTIONS,
  COLOR_OPTIONS,
  AGE_OPTIONS,
  VALUE_OPTIONS,
  labelFor,
} from '@/lib/consumer-safety/solve-input'
import { type SolveSource, resolveSourceLabel } from '@/lib/consumer-safety/solve-source'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// TASK-218 Screen 4 — DETAILS COLLECTED (consent / transparency checkpoint).
//
// The calm moment before the engine answers: GONR plays back the facts it
// actually collected (rendered FROM STATE, never hardcoded defaults), names where
// the answer will come from (honest source line — verified card vs AI analysis,
// never both), and gives the user a way to correct a wrong fact first. There is NO
// treatment preview here — steps and prohibitions live on the Results screen so a
// bad fact can be caught before it shapes advice. Premium fabric-care feel,
// green-free; nothing on this screen is authored — every value comes from state or
// the engine response.

/** Verbatim AI-fallback disclosure object as the engine returns it. */
export interface AiFallbackDisclosure {
  label: string
  body: string
}

/** A single played-back fact row. `field` lets the user jump back to fix it.
 *  `labelKey` is an i18n catalog key — resolved to EN/ES at render time. */
interface FactRow {
  field: keyof SolveInput
  labelKey: string
  value: string
  note?: string
}

/** Interpolate {name} placeholders in a catalog string (t() is key-only). */
function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
}

export interface DetailsCollectedScreenProps {
  /** The SolveInput assembled across intake — the only source of the fact rows. */
  input: SolveInput
  /** Engine `response.source`, when /api/solve has already responded. */
  source?: SolveSource
  /** Engine `response.ai_fallback_disclosure`, rendered verbatim when present. */
  aiFallbackDisclosure?: AiFallbackDisclosure
  /** Captured stain photo (data/blob/remote URL) for the context chip. */
  imageUrl?: string
  /** Short human summary for the context chip; falls back to the stain text. */
  contextLabel?: string
  /** Continue to the recommended approach (Results screen). */
  onContinue?: () => void
  /** User typed a correction/clarification — re-open or patch intake with it. */
  onFollowUp?: (text: string) => void
  /** Tap a listed fact to re-open intake on that field. */
  onEditFact?: (field: keyof SolveInput) => void
  className?: string
}

const DEFAULTS: Pick<
  SolveInput,
  'material' | 'careStatus' | 'heatExposure' | 'colorfastness' | 'stainAge' | 'itemValue'
> = {
  material: 'unknown',
  careStatus: 'unknown',
  heatExposure: 'unknown',
  colorfastness: 'unknown',
  stainAge: 'unknown',
  itemValue: 'everyday',
}

/**
 * Build the fact rows straight from state. A field is shown only when the user
 * actually engaged it (value differs from the fail-closed default / is non-empty),
 * so an untouched form never fabricates a "fact" the user never gave.
 */
function buildFactRows(input: SolveInput): FactRow[] {
  const rows: FactRow[] = []

  const stainText = input.stainDescription.trim()
  if (stainText.length > 0) {
    rows.push({
      field: 'stainDescription',
      labelKey: 'details.row.stain',
      value: stainText,
      note:
        input.stainType !== undefined
          ? labelFor(STAIN_OPTIONS, input.stainType)
          : undefined,
    })
  }

  if (input.material !== DEFAULTS.material) {
    rows.push({ field: 'material', labelKey: 'details.row.fabric', value: labelFor(MATERIAL_OPTIONS, input.material) })
  }
  if (input.careStatus !== DEFAULTS.careStatus) {
    rows.push({ field: 'careStatus', labelKey: 'details.row.care', value: labelFor(CARE_OPTIONS, input.careStatus) })
  }
  if (input.colorfastness !== DEFAULTS.colorfastness) {
    rows.push({ field: 'colorfastness', labelKey: 'details.row.colour', value: labelFor(COLOR_OPTIONS, input.colorfastness) })
  }
  if (input.stainAge !== DEFAULTS.stainAge) {
    rows.push({ field: 'stainAge', labelKey: 'details.row.stainAge', value: labelFor(AGE_OPTIONS, input.stainAge) })
  }
  if (input.heatExposure !== DEFAULTS.heatExposure) {
    rows.push({ field: 'heatExposure', labelKey: 'details.row.heatSoFar', value: labelFor(HEAT_OPTIONS, input.heatExposure) })
  }
  if (input.itemValue !== DEFAULTS.itemValue) {
    rows.push({ field: 'itemValue', labelKey: 'details.row.itemValue', value: labelFor(VALUE_OPTIONS, input.itemValue) })
  }
  if (input.priorTreatment.length > 0) {
    rows.push({ field: 'priorTreatment', labelKey: 'details.row.alreadyTried', value: input.priorTreatment.join(', ') })
  }
  const location = input.locationText?.trim()
  if (location && location.length > 0) {
    rows.push({ field: 'locationText', labelKey: 'details.row.where', value: location })
  }

  return rows
}

/**
 * Resolve the engine source to its honest, SHARED one-line attribution (same map
 * Results renders, so one source never shows two strings). Returns null when the
 * source is unknown OR an AI-fallback disclosure is present (we never show a
 * source line alongside the disclosure — one true source, never both). Verified
 * wording is earned only by `library*` sources; AI tiers never borrow it.
 */
function sourceLine(
  source: SolveSource | undefined,
  hasDisclosure: boolean,
): { text: string; verified: boolean } | null {
  if (hasDisclosure || source === undefined) return null
  // Fail-safe: never crash on a source value the UI has not mapped.
  const entry = resolveSourceLabel(source)
  if (!entry) return null
  return { text: entry.label, verified: entry.verified }
}

export default function DetailsCollectedScreen({
  input,
  source,
  aiFallbackDisclosure,
  imageUrl,
  contextLabel,
  onContinue,
  onFollowUp,
  onEditFact,
  className,
}: DetailsCollectedScreenProps) {
  const { t } = useLanguage()
  const [followUp, setFollowUp] = useState('')

  const rows = buildFactRows(input)
  const chipLabel = (contextLabel ?? input.stainDescription).trim()
  const attribution = sourceLine(source, aiFallbackDisclosure !== undefined)

  function handleFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = followUp.trim()
    if (text.length === 0) return
    onFollowUp?.(text)
    setFollowUp('')
  }

  return (
    <main
      className={`relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-28 pt-5${
        className ? ` ${className}` : ''
      }`}
    >
      {/* context chip — what GONR understood the situation to be */}
      <div className="gonr-card flex items-center gap-3 p-3">
        {imageUrl ? (
          <span
            role="img"
            aria-label={t('intake.ariaCapturedPhoto')}
            className="h-12 w-12 shrink-0 rounded-2xl bg-gonr-softpink bg-cover bg-center"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
            <Shirt size={22} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-gonr-textgray">
            {t('details.contextSituation')}
          </p>
          {chipLabel.length > 0 ? (
            <p className="truncate text-[15px] font-extrabold text-gonr-navy">{chipLabel}</p>
          ) : (
            <p className="text-[15px] font-bold text-gonr-textgray">{t('details.contextEmpty')}</p>
          )}
        </div>
      </div>

      {/* "Your details" — the collected facts, played back FROM STATE */}
      <section className="mt-6" aria-label={t('details.heading')}>
        <h1 className="text-2xl font-black leading-tight text-gonr-navy">{t('details.heading')}</h1>
        <p className="mt-1 text-sm font-semibold text-gonr-textgray">
          {t('details.subheading')}
        </p>

        {rows.length > 0 ? (
          <ul className="mt-4 grid gap-2">
            {rows.map((row) => {
              const editable = onEditFact !== undefined
              const rowLabel = t(row.labelKey)
              const content = (
                <>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-extrabold uppercase tracking-wide text-gonr-textgray">
                      {rowLabel}
                    </span>
                    <span className="block text-[15px] font-bold leading-6 text-gonr-navy">
                      {row.value}
                      {row.note ? (
                        <span className="font-semibold text-gonr-textgray"> · {row.note}</span>
                      ) : null}
                    </span>
                  </span>
                  {editable ? (
                    <Pencil size={16} className="mt-1 shrink-0 text-gonr-hotpink" aria-hidden="true" />
                  ) : null}
                </>
              )
              return (
                <li key={row.field}>
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => onEditFact?.(row.field)}
                      className="gonr-card flex w-full items-start justify-between gap-3 p-3 text-left transition-transform active:scale-[0.99]"
                      aria-label={fill(t('details.row.ariaEdit'), { label: rowLabel, value: row.value })}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="gonr-card flex items-start justify-between gap-3 p-3">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="gonr-card mt-4 p-4">
            <p className="text-sm font-semibold text-gonr-textgray">
              {t('details.empty')}
            </p>
          </div>
        )}
      </section>

      {/* transition line — no treatment preview here, just the handoff */}
      <p className="mt-6 text-[15px] font-bold leading-6 text-gonr-navy">
        {t('details.handoffLine')}
      </p>

      {/* honest Sources footer — verified card vs AI analysis, never both */}
      {attribution || aiFallbackDisclosure ? (
        <section className="mt-4" aria-label={t('details.sourcesLabel')}>
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-gonr-textgray">
            {t('details.sourcesLabel')}
          </p>
          {aiFallbackDisclosure ? (
            <div className="gonr-card flex items-start gap-3 border-l-4 border-l-[var(--gonr-state-limited)] p-3">
              <Info
                size={18}
                strokeWidth={2.25}
                className="mt-0.5 shrink-0 text-[var(--gonr-state-limited)]"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold text-gonr-navy">{aiFallbackDisclosure.label}</p>
                <p className="mt-0.5 text-[13px] font-medium leading-5 text-gonr-textgray">
                  {aiFallbackDisclosure.body}
                </p>
              </div>
            </div>
          ) : attribution ? (
            <div className="gonr-card flex items-center gap-3 p-3">
              <BookOpenCheck
                size={18}
                strokeWidth={2.25}
                className={attribution.verified ? 'shrink-0 text-gonr-hotpink' : 'shrink-0 text-gonr-textgray'}
                aria-hidden="true"
              />
              <p className="text-[13px] font-bold text-gonr-navy">{attribution.text}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* primary handoff to the answer */}
      {onContinue ? (
        <button
          type="button"
          onClick={onContinue}
          className="gonr-gradient gonr-cta mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-[15px] font-extrabold text-white transition-transform active:scale-[0.99]"
        >
          {t('details.cta')}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      ) : null}

      {/* correct a fact before the engine answers — the consent checkpoint */}
      <form onSubmit={handleFollowUp} className="mt-3">
        <label htmlFor="details-follow-up" className="sr-only">
          {t('details.followUp.srLabel')}
        </label>
        <div className="gonr-card flex items-center gap-2 p-2 pl-4 transition-shadow focus-within:ring-2 focus-within:ring-gonr-hotpink/40">
          <input
            id="details-follow-up"
            type="text"
            value={followUp}
            onChange={(event) => setFollowUp(event.target.value)}
            placeholder={t('details.followUp.placeholder')}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-gonr-navy placeholder:font-medium placeholder:text-gonr-navy/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={followUp.trim().length === 0}
            className="gonr-gradient gonr-cta grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-transform active:scale-[0.97] disabled:opacity-40"
            aria-label={t('details.followUp.ariaSend')}
          >
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </form>

      <BottomNav />
    </main>
  )
}
