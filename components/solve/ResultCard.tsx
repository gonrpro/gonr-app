'use client'

import { useState } from 'react'
import type { ProtocolCard, Step } from '@/lib/types'
import HandoffModule from './HandoffModule'

/* ── Helpers ─────────────────────────────────── */

function difficultyColor(d: number) {
  if (d <= 3) return { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-l-green-500' }
  if (d <= 6) return { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-l-amber-500' }
  return { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-l-red-500' }
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
  source: 'verified' | 'ai'
  lang?: string
}

export default function ResultCard({ card, source, lang = 'en' }: ResultCardProps) {
  const [mode, setMode] = useState<'pro' | 'diy'>('pro')
  const [showHandoff, setShowHandoff] = useState(false)

  const difficulty = card.difficulty ?? 5
  const dc = difficultyColor(difficulty)

  // Normalize escalation
  const escalation = typeof card.escalation === 'string'
    ? { when: card.escalation, whatToTell: '', specialistType: '' }
    : card.escalation

  // Normalize products — handle both object and array formats
  const products = card.products && !Array.isArray(card.products)
    ? card.products as { professional?: { name: string; use?: string; note?: string }[]; consumer?: { name: string; use?: string; note?: string }[] }
    : { professional: [], consumer: [] }

  return (
    <div className={`rounded-xl border-l-4 ${dc.border} bg-white dark:bg-[#0e131b] shadow-lg overflow-hidden`}>

      {/* ── 1. Header: Title + source badge + difficulty ── */}
      <div className="px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug flex-1">
            {card.title}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            {/* Source badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
              ${source === 'verified'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-purple-500/20 text-purple-400'
              }`}
            >
              {source === 'verified' ? '\u2713 VERIFIED' : '\uD83E\uDD16 AI'}
            </span>
            {/* Difficulty badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${dc.bg} ${dc.text}`}>
              {difficulty}/10
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Chemistry brief (one-line summary) ── */}
      {card.stainChemistry && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            <span className="mr-1">{'\uD83E\uDDEA'}</span>
            {card.stainChemistry.length > 160
              ? card.stainChemistry.slice(0, 160) + '\u2026'
              : card.stainChemistry}
          </p>
        </div>
      )}

      {/* ── 3. Pro / DIY toggle ── */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setMode('pro')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold min-h-[44px] transition-all
              ${mode === 'pro'
                ? 'bg-green-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            Pro Protocol
          </button>
          <button
            onClick={() => setMode('diy')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold min-h-[44px] transition-all
              ${mode === 'diy'
                ? 'bg-green-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            DIY / Home
          </button>
        </div>
      </div>

      {/* ── 4. Pro Steps (numbered, agent in green caps) ── */}
      {mode === 'pro' && card.spottingProtocol && (
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
                    Technique: {step.technique}
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

      {/* ── 5. DIY Steps (numbered, simpler format) ── */}
      {mode === 'diy' && card.homeSolutions && (
        <div className="px-4 pb-4 space-y-3">
          {card.homeSolutions.map((sol, i) => {
            const text = typeof sol === 'string' ? sol : (sol as Step).instruction
            return (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500/20 text-green-400
                  flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed flex-1">
                  {text}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 6. Why This Works ── */}
      {card.whyThisWorks && (
        <div className="px-4 pb-4">
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              {'\uD83D\uDCA1'} Why This Works
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
              {'\uD83D\uDCAC'} What to Tell the Customer
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
          {'\uD83D\uDCE4'} Customer Handoff
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
        {/* Chemistry Details */}
        {card.stainChemistry && (
          <Collapsible title="Chemistry Details" icon={'\uD83E\uDDEA'}>
            <p className="leading-relaxed">{card.stainChemistry}</p>
          </Collapsible>
        )}

        {/* Safety / Warnings */}
        {card.materialWarnings && card.materialWarnings.length > 0 && (
          <Collapsible title="Safety &amp; Warnings" icon={'\u26A0\uFE0F'}>
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
          <Collapsible title="Products" icon={'\uD83D\uDED2'}>
            {products.professional && products.professional.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-green-400 uppercase tracking-wider">Professional</p>
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
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Consumer</p>
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
          <Collapsible title="Escalation" icon={'\uD83D\uDCDE'}>
            {escalation.when && <p><strong className="text-gray-700 dark:text-gray-300">When:</strong> {escalation.when}</p>}
            {escalation.whatToTell && <p><strong className="text-gray-700 dark:text-gray-300">What to say:</strong> {escalation.whatToTell}</p>}
            {escalation.specialistType && <p><strong className="text-gray-700 dark:text-gray-300">Specialist:</strong> {escalation.specialistType}</p>}
          </Collapsible>
        )}

        {/* Common Mistakes */}
        {card.commonMistakes && card.commonMistakes.length > 0 && (
          <Collapsible title="Common Mistakes" icon={'\uD83D\uDEAB'}>
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
          <Collapsible title="Solvent Note" icon={'\uD83E\uDDF4'}>
            <p className="leading-relaxed">{card.solventNote}</p>
          </Collapsible>
        )}
      </div>

      {/* ── 10. Deep Solve button (purple) ── */}
      <div className="px-4 pb-3">
        <button
          className="w-full min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700
            text-white text-sm font-semibold transition-colors shadow-lg shadow-purple-600/25"
        >
          {'\uD83D\uDD2E'} Deep Solve &mdash; Get a tailored protocol
        </button>
      </div>

      {/* ── 11. Stain Brain button ── */}
      <div className="px-4 pb-4">
        <button
          className="w-full min-h-[44px] rounded-xl bg-gray-100 dark:bg-white/5
            border border-gray-200 dark:border-white/10
            text-gray-700 dark:text-gray-300 text-sm font-semibold
            hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
        >
          {'\uD83E\uDDE0'} Ask Stain Brain about this
        </button>
      </div>
    </div>
  )
}
