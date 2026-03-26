/**
 * File: components/solve/ResultCard.tsx
 *
 * ⚠️  PROTECTED FILE — DO NOT REPLACE OR OVERWRITE ⚠️
 * This file is maintained by Atlas directly. Lab tasks must NOT include
 * this file as a deploy target. Submit change requests to Atlas instead.
 *
 * FORBIDDEN (do not reintroduce):
 * - Pro/DIY toggle (mode state, setMode, diy section)
 * - difficulty/10 badge
 * - Deep Solve button
 * - Ask Stain Brain button
 *
 * CARD STRUCTURE (fixed):
 * Title + trust badge → Chemistry brief → Spotting Protocol steps →
 * Collapsibles: Home Care Tips, Chemistry Details, Safety Warnings,
 *               Products, Escalation, Common Mistakes, Solvent Note
 *
 * TASK-122: Added trust badges for source differentiation.
 * - core       → ✅ Master Protocol (gold)
 * - verified   → ✅ Verified Protocol (green)
 * - ai-cached  → 🔄 AI Generated (gray, subtle)
 * - ai         → 🔄 AI Generated (gray)
 *
 * Card structure is UNTOUCHED. Only the badge rendering changed.
 */

'use client'

import { useState } from 'react'
import type { ProtocolCard, Step } from '@/lib/types'
import HandoffModule from './HandoffModule'
import { useLanguage } from '@/lib/i18n/LanguageContext'

/* ── Helpers ─────────────────────────────────── */

function difficultyColor(d: number) {
  if (d <= 3) return { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-l-green-500' }
  if (d <= 6) return { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-l-amber-500' }
  return { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-l-red-500' }
}

/** Badge config by source type */
function sourceBadge(source: string) {
  switch (source) {
    case 'core':
      return { label: '✅ Master Protocol', bg: 'bg-amber-500/20', text: 'text-amber-400' }
    case 'verified':
      return { label: '✅ Verified', bg: 'bg-green-500/20', text: 'text-green-400' }
    case 'ai-cached':
      return { label: '🔄 AI Generated', bg: 'bg-gray-500/15', text: 'text-gray-400' }
    case 'ai':
    default:
      return { label: '🔄 AI Generated', bg: 'bg-purple-500/20', text: 'text-purple-400' }
  }
}

function Collapsible({ title, icon, children, defaultOpen = false }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[44px]
          text-sm font-medium text-gray-600 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>{icon}</span>
          <span>{title}</span>
        </span>
        <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          &#9662;
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 space-y-2 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Main Component ──────────────────────────── */

interface ResultCardProps {
  card: ProtocolCard
  source: 'verified' | 'ai' | 'ai-cached' | 'core'
}

export default function ResultCard({ card, source }: ResultCardProps) {
  const { t } = useLanguage()
  const [showHandoff, setShowHandoff] = useState(false)
  const badge = sourceBadge(source)

  // Normalize escalation
  const escalation = typeof card.escalation === 'string'
    ? { when: card.escalation, whatToTell: '', specialistType: '' }
    : card.escalation

  // Normalize products — handle both object and array formats
  const products = card.products && !Array.isArray(card.products)
    ? card.products as { professional?: { name: string; use?: string; note?: string }[]; consumer?: { name: string; use?: string; note?: string }[] }
    : { professional: [], consumer: [] }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0e131b] shadow-lg overflow-hidden">

      {/* ── 1. Header: Title + source badge ── */}
      <div className="px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug flex-1">
            {card.title}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Chemistry brief (one-line summary) ── */}
      {card.stainChemistry && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            <span className="mr-1">{'\uD83E\uDDEA'}</span>
            {card.stainChemistry}
          </p>
        </div>
      )}

      {/* ── 3. Spotting Protocol label ── */}
      <div className="px-4 pb-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Spotting Protocol</p>
      </div>

      {/* ── 4. Protocol Steps ── */}
      {card.spottingProtocol && (
        <div className="px-4 pb-4 space-y-3">
          {card.spottingProtocol.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500/20 text-green-400
                flex items-center justify-center text-xs font-bold mt-0.5">
                {step.step}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs font-bold text-green-400 uppercase tracking-wider">
                  {step.agent}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  {step.instruction}
                </p>
                {step.technique && (
                  <p className="text-xs text-gray-500 italic">
                    {t('technique')}: {step.technique}
                  </p>
                )}
                {step.dwellTime && (
                  <p className="text-xs text-gray-500">
                    {'\u23F1'} {step.dwellTime}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}



      {/* ── 6. Why This Works ── */}
      {card.whyThisWorks && (
        <div className="px-4 pb-4">
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              {'\uD83D\uDCA1'} {t('whyThisWorks')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {card.whyThisWorks}
            </p>
          </div>
        </div>
      )}

      {/* ── 7. Customer Explanation (green-tinted card) ── */}
      {card.customerExplanation && (
        <div className="px-4 pb-4">
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
              {'\uD83D\uDCAC'} {t('whatToTellCustomer')}
            </h3>
            <p className="text-sm text-green-800 dark:text-green-300/90 leading-relaxed">
              {card.customerExplanation}
            </p>
          </div>
        </div>
      )}

      {/* ── 8. Customer Handoff button ── */}
      <div className="px-4 pb-4" id="cardHandoffResult">
        <button
          onClick={() => setShowHandoff(!showHandoff)}
          className="w-full min-h-[44px] rounded-xl bg-green-500/10 border border-green-500/30
            text-green-500 dark:text-green-400 text-sm font-semibold
            hover:bg-green-500/20 transition-colors"
        >
          {'\uD83D\uDCE4'} {t('customerHandoff')}
        </button>
        {showHandoff && (
          <div className="mt-3">
            <HandoffModule
              stain={card.meta?.stainCanonical || ''}
              surface={card.meta?.surfaceCanonical || ''}
            />
          </div>
        )}
      </div>

      {/* ── 9. Collapsible sections ── */}
      <div className="px-4 pb-4 space-y-2">

        {/* Home Care Tips */}
        {card.homeSolutions && card.homeSolutions.length > 0 && (
          <Collapsible title="Home Care Tips" icon="🏠">
            <ul className="space-y-2">
              {card.homeSolutions.map((sol, i) => {
                const text = typeof sol === 'string' ? sol : (sol as { instruction?: string }).instruction || ''
                return (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-green-400 flex-shrink-0 mt-0.5">•</span>
                    <span>{text}</span>
                  </li>
                )
              })}
            </ul>
          </Collapsible>
        )}

        {/* Chemistry Details */}
        {card.stainChemistry && (
          <Collapsible title={t('chemistryDetails')} icon={'\uD83E\uDDEA'}>
            <p className="leading-relaxed">{card.stainChemistry}</p>
          </Collapsible>
        )}

        {/* Safety / Warnings */}
        {card.materialWarnings && card.materialWarnings.length > 0 && (
          <Collapsible title={t('safetyWarnings')} icon={'\u26A0\uFE0F'}>
            <ul className="space-y-2">
              {card.materialWarnings.map((w, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-red-400 flex-shrink-0 mt-0.5">{'\u2022'}</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </Collapsible>
        )}

        {/* Products */}
        {(products.professional?.length || products.consumer?.length) ? (
          <Collapsible title={t('products')} icon={'\uD83D\uDED2'}>
            {products.professional && products.professional.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-green-400 uppercase tracking-wider">{t('professional')}</p>
                {products.professional.map((p, i) => (
                  <div key={i} className="space-y-0.5">
                    <p className="font-medium text-gray-700 dark:text-gray-300">{p.name}</p>
                    {p.use && <p className="text-xs">{p.use}</p>}
                    {p.note && <p className="text-xs text-gray-500 italic">{p.note}</p>}
                  </div>
                ))}
              </div>
            )}
            {products.consumer && products.consumer.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">{t('consumer')}</p>
                {products.consumer.map((p, i) => (
                  <div key={i} className="space-y-0.5">
                    <p className="font-medium text-gray-700 dark:text-gray-300">{p.name}</p>
                    {p.use && <p className="text-xs">{p.use}</p>}
                    {p.note && <p className="text-xs text-gray-500 italic">{p.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </Collapsible>
        ) : null}

        {/* Escalation */}
        {escalation && (
          <Collapsible title={t('escalation')} icon={'\uD83D\uDCDE'}>
            {escalation.when && <p><strong className="text-gray-700 dark:text-gray-300">{t('when')}:</strong> {escalation.when}</p>}
            {escalation.whatToTell && <p><strong className="text-gray-700 dark:text-gray-300">{t('whatToSay')}:</strong> {escalation.whatToTell}</p>}
            {escalation.specialistType && <p><strong className="text-gray-700 dark:text-gray-300">{t('specialistLabel')}:</strong> {escalation.specialistType}</p>}
          </Collapsible>
        )}

        {/* Common Mistakes */}
        {card.commonMistakes && card.commonMistakes.length > 0 && (
          <Collapsible title={t('commonMistakes')} icon={'\uD83D\uDEAB'}>
            <ul className="space-y-2">
              {card.commonMistakes.map((m, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-red-400 flex-shrink-0 mt-0.5">{'\u2022'}</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </Collapsible>
        )}

        {/* Solvent Note */}
        {card.solventNote && (
          <Collapsible title={t('solventNote')} icon={'\uD83E\uDDF4'}>
            <p className="leading-relaxed">{card.solventNote}</p>
          </Collapsible>
        )}
      </div>


    </div>
  )
}
