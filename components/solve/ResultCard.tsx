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

import { useState, useEffect } from 'react'
import type { ComponentType } from 'react'
import type { ProtocolCard, Step } from '@/lib/types'
import type { Tier } from '@/lib/types'
import SaveButton from './SaveButton'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import FiberContextBadge from './FiberContextBadge'
import CardBadges from './CardBadges'
import CardRatingBadges from '@/components/solve/CardRatingBadges'
import CardRatingWidget from '@/components/solve/CardRatingWidget'
import StepEnlargeModal from './StepEnlargeModal'
import FullCardModal from './FullCardModal'
import QuickReferenceModal, { type QuickReferenceContent } from '@/components/ui/QuickReferenceModal'
import UpgradeBanner from './UpgradeBanner'
import WhenToStopFooter from './WhenToStopFooter'
import TierFallbackNote from './TierFallbackNote'
import { recordClientEvent } from '@/lib/events/client'
import { useOptionalAuth } from '@/lib/auth/AuthContext'
import { getEffectiveViewerTier } from '@/lib/auth/viewerTier'
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
 * TrustTile — one square in the 3-tile trust strip under the result title.
 * Tap opens a modal overlay with the full body text (Atlas 8069 + Tyler
 * 8067: the previous expand-in-place pattern broke visually on mobile
 * vertical when one tile stretched taller than the others). Three colored
 * accents map to the trust dimensions: green = Why, amber = Caution, red
 * = Escalate — matches the existing accent palette used elsewhere in the
 * card so it reads like part of the same product.
 */
function TrustTile({
  icon,
  label,
  body,
  accent,
  onOpen,
}: {
  icon: LucideIcon
  label: string
  body: string
  accent: 'green' | 'amber' | 'red'
  onOpen: () => void
}) {
  const IconCmp = icon
  const styles = {
    green: {
      background: 'rgba(34,197,94,0.06)',
      border: '1px solid rgba(34,197,94,0.25)',
      labelColor: 'var(--accent)',
      iconColor: 'var(--accent)',
    },
    amber: {
      background: 'rgba(234,179,8,0.06)',
      border: '1px solid rgba(234,179,8,0.25)',
      labelColor: '#ca8a04',
      iconColor: '#ca8a04',
    },
    red: {
      background: 'rgba(239,68,68,0.06)',
      border: '1px solid rgba(239,68,68,0.25)',
      labelColor: '#dc2626',
      iconColor: '#dc2626',
    },
  }[accent]
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left rounded-xl p-3 min-h-[72px] transition-colors hover:brightness-[1.03] active:brightness-95"
      style={{ background: styles.background, border: styles.border }}
      aria-label={`${label} — tap to read more`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <IconCmp size={14} strokeWidth={1.75} style={{ color: styles.iconColor }} aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: styles.labelColor }}>
          {label}
        </span>
      </div>
      <p className="text-xs leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>
        {body}
      </p>
    </button>
  )
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
  onToggle,
}: {
  title: string
  icon: LucideIcon | string
  children: React.ReactNode
  defaultOpen?: boolean
  onToggle?: (nowOpen: boolean) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const IconCmp: ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' | 'false' }> | null =
    typeof icon === 'string' ? null : (icon as unknown as ComponentType<any>)
  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => { const next = !open; setOpen(next); onToggle?.(next) }}
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
  correlationId?: string
  viewerTier?: Tier | 'anon'
}

export default function ResultCard({ card, source, lang = 'en', correlationId, viewerTier = 'free' }: ResultCardProps) {
  const { t } = useLanguage()
  const [enlargedStepIndex, setEnlargedStepIndex] = useState<number | null>(null)
  const [fullCardOpen, setFullCardOpen] = useState(false)

  const difficulty = card.difficulty ?? 5
  const dc = difficultyColor(difficulty)

  const escalation = typeof card.escalation === 'string'
    ? { when: card.escalation, whatToTell: '', specialistType: '' }
    : card.escalation

  const rawCard = card as any
  const { user } = useOptionalAuth()

  // ── Tier-aware rendering (TASK-066 fail-safe containment 2026-04-23) ─────
  // RULE: tier separation MUST NOT depend on an env flag. Anon/free/home
  // always render home-only. Only spotter/operator/founder unlock pro
  // surfaces (protocol steps, Deep Solve, Customer Handoff, pro chemistry).
  // If tier can't be determined, we fail downward to home UI — never upward.
  const effectiveTier = getEffectiveViewerTier(viewerTier, user?.email ?? null)
  const PAID_TIER_SET = new Set<string>(['spotter', 'operator', 'founder'])
  const isPro = PAID_TIER_SET.has(effectiveTier)
  const isHomeUI = !isPro

  // Pro-voice protocol derivation (unchanged)
  const spottingProtocolSteps: Step[] = card.spottingProtocol ?? (() => {
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

  // Home-voice protocol
  const homeSolutionsRaw: (string | Step)[] = card.homeSolutions ?? (rawCard.diyProtocol?.steps ?? [])
  const homeHasOwnProtocol = Array.isArray(homeSolutionsRaw) && homeSolutionsRaw.length > 0

  const primarySteps: (Step | string)[] = isHomeUI
    ? (homeHasOwnProtocol ? homeSolutionsRaw : spottingProtocolSteps)
    : spottingProtocolSteps

  const needsFallbackNote = isHomeUI && !homeHasOwnProtocol

  // Products rail — tier-aware
  type ProductArray = { name: string; use?: string; note?: string; link?: string }[]
  type ProductsMap = { professional?: ProductArray; consumer?: ProductArray; household?: ProductArray }
  const productsObj: ProductsMap = card.products && !Array.isArray(card.products)
    ? (card.products as ProductsMap)
    : {}
  const primaryProducts: ProductArray = isHomeUI
    ? (productsObj.consumer ?? productsObj.household ?? [])
    : (productsObj.professional ?? [])

  // Legacy aliases (used elsewhere in this file)
  const proSteps = spottingProtocolSteps
  const diySteps = homeSolutionsRaw
  const products = productsObj as { professional?: { name: string; use?: string; note?: string }[]; consumer?: { name: string; use?: string; note?: string }[] }

  const warnings: string[] = card.materialWarnings
    ?? rawCard.professionalProtocol?.warnings
    ?? rawCard.safetyMatrix?.neverDo
    ?? []

  // ── Trust block data (Why / Caution / Escalate 3-tile under title) ──
  // Pulls from existing fields — hide a tile entirely if source is weak/empty.
  const trustWhy = (card.whyThisWorks ?? '').trim()
  const trustCaution = (
    (rawCard.safetyMatrix?.neverDo?.[0] as string | undefined)
    ?? warnings[0]
    ?? ''
  ).trim()
  const trustEscalate = (escalation?.when ?? '').trim()
  const showTrustBlock = trustWhy.length > 20 || trustCaution.length > 20 || trustEscalate.length > 20

  // ── Trust tile modal state (Atlas 8069 + Tyler 8067) — tap any tile and
  // the full body opens in the shared QuickReferenceModal, same interaction
  // pattern as the chemistry badge quick-reference. Fixes the ugly vertical
  // stretching when one tile expanded taller than its siblings on mobile.
  const [trustModal, setTrustModal] = useState<QuickReferenceContent | null>(null)

  // ── Tier telemetry on mount ───────────────────────────────────
  useEffect(() => {
    if (!correlationId) return
    recordClientEvent('render.tier_branched', {
      viewerTier: effectiveTier,
      cardId: card.id ?? null,
      protocolSource: isHomeUI ? (homeHasOwnProtocol ? 'home' : 'fallback') : 'pro',
      correlationId,
    })
  }, [correlationId, effectiveTier, card.id, isHomeUI, homeHasOwnProtocol])

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}>
      <CardRatingBadges cardId={card.id ?? ''} />

      {/* ── 1. Header ── */}
      <div className="px-4 pt-4 pb-3 space-y-1" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold leading-snug flex-1" style={{ color: 'var(--text)' }}>
            {card.title}
          </h2>
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            {/* Trust badge — Atlas 8053/8071/8077 lock:
                   card.verified === true  → green ✓ Verified
                   anything else           → NO badge (title carries weight)
                The AI badge was removed from the consumer surface (Atlas
                8077 after Tyler screenshot): a purple 🤖 AI badge on a
                stain-removal card reads as "might be made up" rather
                than "we're iterating." Source state stays in the data
                (card.source) for internal/admin surfaces and telemetry;
                trust state on the public UI is pass/fail. */}
            {card.verified === true && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-600">
                ✓ {t('verified')}
              </span>
            )}
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

      {/* ── 2. Trust block — Why / Caution / Escalate 3-tile strip ──
          Replaces the old "Chemistry overview" single-callout. Surfaces the
          three questions a user/operator asks instinctively before executing:
          (1) Why this path, (2) What should I watch for, (3) When do I stop.
          Pulls from existing card fields; hides any tile whose source is weak. */}
      {showTrustBlock && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {trustWhy.length > 20 && (
              <TrustTile
                icon={FlaskConical}
                label={t('trustWhyLabel')}
                body={trustWhy}
                accent="green"
                onOpen={() => setTrustModal({
                  title: t('trustWhyLabel'),
                  tone: 'safe',
                  icon: '🧪',
                  explainer: trustWhy,
                })}
              />
            )}
            {trustCaution.length > 20 && (
              <TrustTile
                icon={AlertTriangle}
                label={t('trustCautionLabel')}
                body={trustCaution}
                accent="amber"
                onOpen={() => setTrustModal({
                  title: t('trustCautionLabel'),
                  tone: 'caution',
                  icon: '⚠',
                  explainer: trustCaution,
                })}
              />
            )}
            {trustEscalate.length > 20 && (
              <TrustTile
                icon={Phone}
                label={t('trustEscalateLabel')}
                body={trustEscalate}
                accent="red"
                onOpen={() => setTrustModal({
                  title: t('trustEscalateLabel'),
                  tone: 'danger',
                  icon: '📞',
                  explainer: trustEscalate,
                })}
              />
            )}
          </div>
        </div>
      )}

      {/* ── 3. Protocol Steps (tier-aware P2-d) ── */}
      {needsFallbackNote && (
        <div className="px-4 pt-2">
          <TierFallbackNote
            cardId={card.id ?? null}
            stain={rawCard.meta?.stainCanonical ?? ''}
            surface={card.surface ?? ''}
          />
        </div>
      )}
      {primarySteps.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            {isHomeUI ? t('homeProtocol') || 'Home Protocol' : t('proProtocol')}
          </p>
          <div className="space-y-4">
            {primarySteps.map((step, i) => {
              const stepObj = typeof step === 'string' ? { step: i + 1, agent: '', instruction: step } : step
              return (
              <button
                key={i}
                type="button"
                onClick={() => setEnlargedStepIndex(i)}
                className="flex gap-3 w-full text-left rounded-lg p-2 -mx-2 transition-colors hover:bg-white/5 active:bg-white/10 cursor-pointer"
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                  style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent)' }}>
                  {stepObj.step ?? i + 1}
                </div>
                <div className="flex-1 space-y-0.5">
                  {stepObj.agent && (
                    <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                      {stepObj.agent}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                    {stepObj.instruction}
                  </p>
                  {(stepObj.technique || stepObj.temperature) && (
                    <p className="text-xs italic mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {[stepObj.technique, stepObj.temperature].filter(Boolean).join(' — ')}
                    </p>
                  )}
                  {stepObj.dwellTime && (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      ⏱ {stepObj.dwellTime}
                    </p>
                  )}
                </div>
              </button>
              )
            })}
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

      {/* Customer Handoff — Pro users can reveal the full Home protocol to hand off
          to a customer. Pro protocol stays primary above; this is a secondary reveal,
          not a replacement. Copy approved by Tyler 2026-04-24. */}
      {isPro && diySteps.length > 0 && (
        <div className="px-4" style={{ borderTop: '1px solid var(--border)' }}>
          <Collapsible
            title={t('proShowHomeToggle')}
            icon={Handshake}
            onToggle={(nowOpen) => {
              if (nowOpen) {
                recordClientEvent('render.pro_customer_handoff_expanded', {
                  cardId: card.id ?? null,
                  viewerTier,
                  homeStepCount: diySteps.length,
                })
              }
            }}
          >
            <div className="space-y-4">
              {/* Caveat banner — reminds Pro users not to substitute home for pro on the job */}
              <div
                className="flex gap-2 items-start rounded-lg px-3 py-2.5 text-xs leading-relaxed"
                style={{
                  background: 'rgba(234,179,8,0.08)',
                  border: '1px solid rgba(234,179,8,0.25)',
                  color: 'var(--text)',
                }}
              >
                <AlertTriangle size={14} strokeWidth={1.75} className="flex-shrink-0 mt-0.5" style={{ color: '#ca8a04' }} aria-hidden="true" />
                <span>{t('proShowHomeCaveat')}</span>
              </div>

              {/* Header + subtext */}
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                  {t('proShowHomeHeader')}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t('proShowHomeSubtext')}
                </p>
              </div>

              {/* Full home step list — same visual pattern as primarySteps for parity */}
              <div className="space-y-3">
                {diySteps.map((step, i) => {
                  const stepObj =
                    typeof step === 'string'
                      ? { step: i + 1, agent: '', instruction: step }
                      : (step as Step)
                  return (
                    <div key={i} className="flex gap-3">
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                        style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent)' }}
                      >
                        {stepObj.step ?? i + 1}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        {stepObj.agent && (
                          <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                            {stepObj.agent}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                          {stepObj.instruction}
                        </p>
                        {stepObj.safetyNote && (
                          <p className="text-xs italic mt-1" style={{ color: '#ca8a04' }}>
                            ⚠ {stepObj.safetyNote}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Collapsible>
        </div>
      )}

      {/* ── 5. Escalation actions (pro only — Phase 1) ── */}
      {isPro && (() => {
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
      {/* Note: whyThisWorks already renders in the top "Chemistry overview"
          callout (section 2). Don't duplicate it here — Tyler flagged the
          verbatim double-render 2026-04-18. */}
      <div className="px-4 pb-4 space-y-2">
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
            {/* TASK-066: professional products are a pro-tier surface. Home/free/anon
                see consumer-tier products only. */}
            {isPro && products.professional && products.professional.length > 0 && (
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

      {/* ── P2-d: Home tier surfaces ── */}
      {isHomeUI && correlationId && (
        <>
          <div className="px-4">
            <UpgradeBanner
              correlationId={correlationId}
              fromTier={viewerTier === 'home' ? 'home' : 'free'}
              cardId={card.id ?? null}
            />
            <WhenToStopFooter />
          </div>
        </>
      )}

      {/* ── 12. Deep Solve upsell (Operator) ── */}
      {isPro && (
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
      )}

      <CardRatingWidget cardId={card.id ?? ''} correlationId={correlationId ?? null} />

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

      {/* Trust tile modal — opens when user taps Why / Caution / Escalate */}
      <QuickReferenceModal
        open={trustModal !== null}
        content={trustModal}
        onClose={() => setTrustModal(null)}
      />
    </div>
  )
}
