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

  // Normalize pro steps — support both spottingProtocol (v6) and professionalProtocol.steps (new format)
  const rawCard = card as any
  const proSteps: Step[] = card.spottingProtocol ?? (() => {
    const raw = rawCard.professionalProtocol?.steps
    if (!raw || !Array.isArray(raw)) return []
    return raw.map((s: string | Step, i: number) => {
      if (typeof s === 'object') return s
      const clean = s.replace(/^\d+\.\s*/, '')
      // Extract agent: look for known professional agent names
      const knownAgents = ['Protein', 'Tannin Formula', 'NSD', 'POG', 'H₂O₂', 'H2O2', 'Acetic Acid', 'Reducing Agent', 'Rust Remover', 'Enzyme Digester', 'Leveling Agent', 'IPA']
      const agent = knownAgents.find(a => clean.toLowerCase().includes(a.toLowerCase())) ?? ''
      return { step: i + 1, agent, instruction: clean }
    })
  })()

  // Normalize DIY steps
  const diySteps: (string | Step)[] = card.homeSolutions ?? (
    rawCard.diyProtocol?.steps ?? []
  )

  // Normalize warnings
  const warnings: string[] = card.materialWarnings
    ?? rawCard.professionalProtocol?.warnings
    ?? rawCard.safetyMatrix?.neverDo
    ?? []

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>

      {/* ── 1. Header: Title + source badge ── */}
      <div className="px-4 pt-4 pb-3 space-y-1" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold leading-snug flex-1" style={{ color: 'var(--text)' }}>
            {card.title}
          </h2>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 mt-0.5
            ${source === 'verified' ? 'bg-green-500/15 text-green-600' : 'bg-purple-500/15 text-purple-500'}`}
          >
            {source === 'verified' ? '✓ Verified' : '🤖 AI'}
          </span>
        </div>
      </div>

      {/* ── 2. Chemistry overview — prominent callout ── */}
      {card.whyThisWorks && (
        <div className="px-4 pb-3">
          <div className="rounded-xl p-3 space-y-1" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>🧪 Why This Works</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
              {card.whyThisWorks}
            </p>
          </div>
        </div>
      )}

      {/* ── 3. Pro Protocol Steps ── */}
      {proSteps.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Pro Protocol
          </p>
          <div className="space-y-4">
            {proSteps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                  style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent)' }}>
                  {step.step ?? i + 1}
                </div>
                <div className="flex-1 space-y-0.5">
                  {step.agent && (
                    <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                      {step.agent}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                    {step.instruction}
                  </p>
                  {(step.technique || step.temperature) && (
                    <p className="text-xs italic mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {[step.technique, step.temperature].filter(Boolean).join(' — ')}
                    </p>
                  )}
                  {step.dwellTime && (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      ⏱ {step.dwellTime}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Home Tips — collapsed, brief tips not step-by-step */}
      {diySteps.length > 0 && (
        <div className="px-4" style={{ borderTop: '1px solid var(--border)' }}>
          <Collapsible title="Home Tips" icon="🏠">
            <ul className="space-y-1.5">
              {diySteps.slice(0, 4).map((sol, i) => {
                const text = typeof sol === 'string' ? sol : (sol as Step).instruction
                // Trim to first sentence for tip format
                const tip = text.split(/[.!?]/)[0].replace(/^\d+\.\s*/, '').trim()
                if (!tip) return null
                return (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text)' }}>
                    <span style={{ color: 'var(--accent)' }}>•</span>
                    <span>{tip}</span>
                  </li>
                )
              })}
            </ul>
          </Collapsible>
        </div>
      )}

      {/* ── 5. Customer Handoff ── */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setShowHandoff(!showHandoff)}
          className="w-full min-h-[44px] rounded-xl text-sm font-semibold transition-colors"
          style={{
            background: showHandoff ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.3)',
            color: 'var(--accent)'
          }}
        >
          📤 Customer Handoff {showHandoff ? '▲' : '▼'}
        </button>
        {showHandoff && (
          <div className="mt-3">
            <HandoffModule
              stain={card.meta?.stainCanonical || card.id || ''}
              surface={card.meta?.surfaceCanonical || card.surface || ''}
              stainChemistry={card.stainChemistry}
              whyThisWorks={card.whyThisWorks}
            />
          </div>
        )}
      </div>

      {/* ── 9. Collapsible sections ── */}
      <div className="px-4 pb-4 space-y-2">
        {/* Why This Works — open by default */}
        {card.whyThisWorks && (
          <Collapsible title="Why This Works" icon="💡" defaultOpen={true}>
            <p className="leading-relaxed">{card.whyThisWorks}</p>
          </Collapsible>
        )}

        {/* Chemistry Details */}
        {card.stainChemistry && (
          <Collapsible title="Chemistry Details" icon={'\uD83E\uDDEA'}>
            <p className="leading-relaxed">{card.stainChemistry}</p>
          </Collapsible>
        )}

        {/* Safety / Warnings */}
        {warnings.length > 0 && (
          <Collapsible title="Safety &amp; Warnings" icon={'\u26A0\uFE0F'}>
            <ul className="space-y-2">
              {warnings.map((w, i) => (
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


    </div>
  )
}
