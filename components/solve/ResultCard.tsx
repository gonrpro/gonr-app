// components/solve/ResultCard.tsx — TASK-036 Phase 2 (full replacement).
// Builds on Atlas's Phase 1 apply (Microscope/Handshake quick actions).
// This revision extends the icon pass to:
//   - Collapsible section headers (Home, Lightbulb, FlaskConical, AlertTriangle,
//     ShoppingBag, Phone, Ban, Droplet)
//   - "Why This Works" callout (🧪 → FlaskConical)
//   - Hands-Free button (🖐 → Hand)
//   - Safety warning bullets (• → AlertTriangle small)
//
// NOT changed in this pass:
//   - Dwell-time display (⏱ untouched) — gated on TASK-037 data call.
//     If Tyler picks "strip all specific+range dwell-times", the dwell row will
//     often be empty and no icon is needed. If he keeps numerics, swap ⏱→Clock
//     in a follow-up one-liner.
//   - Step-level action icons — skipped per Atlas's "if it needs explanation
//     it's wrong" rule. Step semantics (technique/agent/instruction) are too
//     fuzzy for reliable icon mapping.
//
// All other emoji in this file (verified badge ✓, AI badge 🤖, stain-type
// emojis in CardBadges) are scoped out intentionally: they're semantic markers,
// not section headers, and replacing them is a separate tasteful pass.

'use client'

import { useState } from 'react'
import type { ComponentType } from 'react'
import type { ProtocolCard, Step } from '@/lib/types'
import SaveButton from './SaveButton'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import FiberContextBadge from './FiberContextBadge'
import CardBadges from './CardBadges'
import StepEnlargeModal from './StepEnlargeModal'
import FullCardModal from './FullCardModal'
import {
  Microscope,
  Handshake,
  Lightbulb,
  Home,
  AlertTriangle,
  ShoppingBag,
  Phone,
  Ban,
  Droplet,
  FlaskConical,
  Hand,
  type LucideIcon,
} from 'lucide-react'

/* ── Helpers ─────────────────────────────────── */

function difficultyColor(d: number) {
  if (d <= 3) return { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-l-green-500' }
  if (d <= 6) return { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-l-amber-500' }
  return { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-l-red-500' }
}

/**
 * Collapsible now accepts either a lucide component (preferred) or a string
 * (legacy; keeps any callsite we haven't migrated yet working). The lucide
 * path uses stroke="currentColor" so the icon always matches the header text
 * color in both dark and light themes.
 */
function Collapsible({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: LucideIcon | string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const IconCmp: ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' | 'false' }> | null =
    typeof icon === 'string' ? null : (icon as unknown as ComponentType<any>)
  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[44px]
          text-sm font-medium text-gray-600 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          {IconCmp ? (
            <IconCmp size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <span>{icon as string}</span>
          )}
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
  source: 'verified' | 'ai' | 'core' | 'ai-cached'
  lang?: string
}

export default function ResultCard({ card, source, lang = 'en' }: ResultCardProps) {
  const { t } = useLanguage()
  const [enlargedStepIndex, setEnlargedStepIndex] = useState<number | null>(null)
  const [fullCardOpen, setFullCardOpen] = useState(false)

  const difficulty = card.difficulty ?? 5
  const dc = difficultyColor(difficulty)

  const escalation = typeof card.escalation === 'string'
    ? { when: card.escalation, whatToTell: '', specialistType: '' }
    : card.escalation

  const products = card.products && !Array.isArray(card.products)
    ? card.products as { professional?: { name: string; use?: string; note?: string }[]; consumer?: { name: string; use?: string; note?: string }[] }
    : { professional: [], consumer: [] }

  const rawCard = card as any
  const proSteps: Step[] = card.spottingProtocol ?? (() => {
    const raw = rawCard.professionalProtocol?.steps
    if (!raw || !Array.isArray(raw)) return []
    return raw.map((s: string | Step, i: number) => {
      if (typeof s === 'object') return s
      const clean = s.replace(/^\d+\.\s*/, '')
      const knownAgents = ['Protein', 'Tannin Formula', 'NSD', 'POG', 'H₂O₂', 'H2O2', 'Acetic Acid', 'Reducing Agent', 'Rust Remover', 'Enzyme Digester', 'Leveling Agent', 'IPA']
      const agent = knownAgents.find(a => clean.toLowerCase().includes(a.toLowerCase())) ?? ''
      return { step: i + 1, agent, instruction: clean }
    })
  })()

  const diySteps: (string | Step)[] = card.homeSolutions ?? (
    rawCard.diyProtocol?.steps ?? []
  )

  const warnings: string[] = card.materialWarnings
    ?? rawCard.professionalProtocol?.warnings
    ?? rawCard.safetyMatrix?.neverDo
    ?? []

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>

      {/* ── 1. Header ── */}
      <div className="px-4 pt-4 pb-3 space-y-1" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold leading-snug flex-1" style={{ color: 'var(--text)' }}>
            {card.title}
          </h2>
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
              ${['verified','core'].includes(source) ? 'bg-green-500/15 text-green-600' : 'bg-purple-500/15 text-purple-500'}`}
            >
              {['verified','core'].includes(source) ? `✓ ${t('verified')}` : `🤖 ${t('ai')}`}
            </span>
            <SaveButton card={card} />
          </div>
        </div>
      </div>

      {/* ── Card badges ── */}
      <div className="px-4 pb-2">
        <CardBadges
          stainType={(card as any).stainType || (card as any).stainFamily}
          riskLevel={(card as any).meta?.riskLevel}
          difficulty={card.difficulty}
          tags={(card as any).meta?.tags}
          source={(card as any).source || (card as any).meta?.source}
        />
      </div>

      {/* ── Fiber context ── */}
      {(card as any)._fiberContext?.fiber && (
        <div className="px-4 pb-3">
          <FiberContextBadge
            fiber={(card as any)._fiberContext.fiber}
            careSymbols={(card as any)._fiberContext.careSymbols || []}
            warnings={(card as any)._fiberContext.warnings || []}
          />
        </div>
      )}

      {/* ── 2. Chemistry overview ── */}
      {card.whyThisWorks && (
        <div className="px-4 pb-3">
          <div className="rounded-xl p-3 space-y-1" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <FlaskConical size={14} strokeWidth={1.75} aria-hidden="true" />
              {t('whyThisWorks')}
            </p>
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
            {t('proProtocol')}
          </p>
          <div className="space-y-4">
            {proSteps.map((step, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setEnlargedStepIndex(i)}
                className="flex gap-3 w-full text-left rounded-lg p-2 -mx-2 transition-colors hover:bg-white/5 active:bg-white/10 cursor-pointer"
              >
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
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-[10px]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
              {t('tapAnyStepToEnlarge')}
            </p>
            <button
              type="button"
              onClick={() => setFullCardOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
              style={{
                background: 'rgba(129,140,248,0.1)',
                border: '1px solid rgba(129,140,248,0.25)',
                color: '#818cf8',
              }}
            >
              <Hand size={14} strokeWidth={1.75} aria-hidden="true" />
              <span>{t('handsFree')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Home Tips */}
      {diySteps.length > 0 && (
        <div className="px-4" style={{ borderTop: '1px solid var(--border)' }}>
          <Collapsible title={t('collapsibleHomeCare')} icon={Home}>
            <ul className="space-y-1.5">
              {diySteps.slice(0, 4).map((sol, i) => {
                const text = typeof sol === 'string' ? sol : (sol as Step).instruction
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

      {/* ── 5. Escalation actions (Phase 1 — unchanged) ── */}
      {(() => {
        const stain = card.meta?.stainCanonical || card.id || ''
        const surface = card.meta?.surfaceCanonical || card.surface || ''
        const prefill = surface ? `${stain} on ${surface}` : stain
        return (
          <div className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
            <a
              href={`/deep-solve?stain=${encodeURIComponent(prefill)}`}
              className="flex items-center justify-center gap-2 flex-1 min-h-[44px] rounded-xl text-sm font-semibold transition-[transform,opacity] duration-150 active:scale-[0.98] hover:opacity-90"
              style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: 'var(--accent)',
                textDecoration: 'none',
              }}
            >
              <Microscope size={18} strokeWidth={1.75} aria-hidden="true" />
              <span>{t('deepSolveTitle')}</span>
            </a>
            <a
              href={`/handoff?prefill=${encodeURIComponent(prefill)}`}
              className="flex items-center justify-center gap-2 flex-1 min-h-[44px] rounded-xl text-sm font-semibold transition-[transform,opacity] duration-150 active:scale-[0.98] hover:opacity-90 dark:text-amber-400"
              style={{
                background: 'rgba(234,179,8,0.08)',
                border: '1px solid rgba(234,179,8,0.3)',
                color: '#ca8a04',
                textDecoration: 'none',
              }}
            >
              <Handshake size={18} strokeWidth={1.75} aria-hidden="true" />
              <span>{t('customerHandoffTitle')}</span>
            </a>
          </div>
        )
      })()}

      {/* ── 9. Collapsible sections ── */}
      <div className="px-4 pb-4 space-y-2">
        {card.whyThisWorks && (
          <Collapsible title={t('whyThisWorks')} icon={Lightbulb} defaultOpen={true}>
            <p className="leading-relaxed">{card.whyThisWorks}</p>
          </Collapsible>
        )}

        {card.stainChemistry && (
          <Collapsible title={t('collapsibleChemistry')} icon={FlaskConical}>
            <p className="leading-relaxed">{card.stainChemistry}</p>
          </Collapsible>
        )}

        {warnings.length > 0 && (
          <Collapsible title={t('collapsibleSafety')} icon={AlertTriangle}>
            <ul className="space-y-2">
              {warnings.map((w, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <AlertTriangle size={14} strokeWidth={1.75} className="text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </Collapsible>
        )}

        {(products.professional?.length || products.consumer?.length) ? (
          <Collapsible title={t('collapsibleProducts')} icon={ShoppingBag}>
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

        {escalation && (
          <Collapsible title={t('collapsibleEscalation')} icon={Phone}>
            {escalation.when && <p><strong className="text-gray-700 dark:text-gray-300">{t('when')}:</strong> {escalation.when}</p>}
            {escalation.whatToTell && <p><strong className="text-gray-700 dark:text-gray-300">{t('whatToSay')}:</strong> {escalation.whatToTell}</p>}
            {escalation.specialistType && <p><strong className="text-gray-700 dark:text-gray-300">{t('specialistLabel')}:</strong> {escalation.specialistType}</p>}
          </Collapsible>
        )}

        {card.commonMistakes && card.commonMistakes.length > 0 && (
          <Collapsible title={t('collapsibleMistakes')} icon={Ban}>
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

        {card.solventNote && (
          <Collapsible title={t('collapsibleSolvent')} icon={Droplet}>
            <p className="leading-relaxed">{card.solventNote}</p>
          </Collapsible>
        )}
      </div>

      {/* ── 12. Deep Solve upsell (Operator) ── */}
      <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-white/5 mt-1">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('deepSolveUpsellPrefix')}{' '}
          <a
            href={`/deep-solve?stain=${encodeURIComponent(card.title || '')}&cardId=${encodeURIComponent(card.id || '')}`}
            className="font-semibold hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            {t('deepSolveUpsellLink')}
          </a>
        </p>
      </div>

      <p className="px-4 pb-3 text-[9px] leading-relaxed" style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>
        {t('protocolDisclaimer')}
      </p>

      {enlargedStepIndex !== null && proSteps.length > 0 && (
        <StepEnlargeModal
          steps={proSteps}
          currentIndex={enlargedStepIndex}
          onClose={() => setEnlargedStepIndex(null)}
          onNavigate={setEnlargedStepIndex}
        />
      )}

      {fullCardOpen && proSteps.length > 0 && (
        <FullCardModal
          card={card}
          steps={proSteps}
          warnings={warnings}
          onClose={() => setFullCardOpen(false)}
        />
      )}
    </div>
  )
}
