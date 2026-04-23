// components/solve/ResultTierUpsell.tsx — TASK-063
//
// Post-solve upsell surface for non-paying users. Renders all 3 tiers
// (Home / Spotter / Operator) as a ladder so users self-select the tier
// that matches their use case, rather than seeing only Spotter.
//
// Shows the full ladder even when a tier's LemonSqueezy variant isn't
// live yet — the unavailable tier renders as "Coming soon" so the user
// still sees where they'd fit instead of the ladder looking narrower
// than GONR actually is. Tyler directive 2026-04-23.
//
// Telemetry:
//   - result_upsell.shown     fires once per correlationId per session
//   - result_upsell.clicked   { tier, correlationId, cardId }

'use client'

import { useEffect, useState } from 'react'
import { buildCheckoutUrl, isCheckoutLive, type Tier } from '@/lib/payments/checkoutUrls'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { recordClientEvent } from '@/lib/events/client'

interface ResultTierUpsellProps {
  correlationId: string
  cardId?: string | null
}

interface TierConfig {
  tier: Tier
  labelKey: string
  priceKey: string
  blurbKey: string
  ctaKey: string
  accent: string
  bg: string
  border: string
  priceColor: string
  featured: boolean
}

const TIERS: TierConfig[] = [
  {
    tier: 'home',
    labelKey: 'tierHomeLabel',
    priceKey: 'tierHomePrice',
    blurbKey: 'tierHomeBlurb',
    ctaKey: 'tierHomeCta',
    accent: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.04)',
    border: 'rgba(34, 197, 94, 0.28)',
    priceColor: '#16a34a',
    featured: true,
  },
  {
    tier: 'spotter',
    labelKey: 'tierSpotterLabel',
    priceKey: 'tierSpotterPrice',
    blurbKey: 'tierSpotterBlurb',
    ctaKey: 'tierSpotterCta',
    accent: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.05)',
    border: 'rgba(168, 85, 247, 0.3)',
    priceColor: '#9333ea',
    featured: false,
  },
  {
    tier: 'operator',
    labelKey: 'tierOperatorLabel',
    priceKey: 'tierOperatorPrice',
    blurbKey: 'tierOperatorBlurb',
    ctaKey: 'tierOperatorCta',
    accent: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.04)',
    border: 'rgba(99, 102, 241, 0.25)',
    priceColor: '#4f46e5',
    featured: false,
  },
]

export default function ResultTierUpsell({ correlationId, cardId }: ResultTierUpsellProps) {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const shownKey = `gonr_result_upsell_shown_${correlationId}`
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem(shownKey) === '1') return
      sessionStorage.setItem(shownKey, '1')
    } catch {
      // fall through — still fire the event if storage is unavailable
    }
    recordClientEvent('result_upsell.shown', { correlationId, cardId: cardId ?? null })
  }, [correlationId, cardId])

  if (!mounted) return null

  const handleClick = (tier: Tier, url: string | null) => {
    recordClientEvent('result_upsell.clicked', {
      tier,
      correlationId,
      cardId: cardId ?? null,
      hadCheckoutUrl: !!url,
    })
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      // Tier not yet activated — send to profile so user can see the ladder and plan their move
      window.location.href = '/profile'
    }
  }

  return (
    <section
      className="mt-6 rounded-2xl p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.02), rgba(24, 24, 27, 0.06))',
        border: '1px solid rgba(24, 24, 27, 0.08)',
      }}
      aria-label="Upgrade tiers"
    >
      <div className="text-center mb-4">
        <h3 className="text-base font-bold" style={{ color: '#111827' }}>
          {t('tierUpsellTitle')}
        </h3>
        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
          {t('tierUpsellSubtitle')}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {TIERS.map((cfg) => {
          const live = isCheckoutLive(cfg.tier)
          const url = live ? buildCheckoutUrl(cfg.tier) : null
          return (
            <div
              key={cfg.tier}
              className="rounded-xl p-4 flex flex-col"
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                opacity: live ? 1 : 0.75,
                minHeight: '220px',
              }}
            >
              <div className="flex items-baseline justify-between mb-2">
                <span
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: cfg.accent, letterSpacing: '0.08em' }}
                >
                  {t(cfg.labelKey)}
                </span>
                {cfg.featured && live && (
                  <span
                    className="text-[10px] font-bold uppercase rounded-full px-2 py-[2px]"
                    style={{
                      background: `${cfg.accent}1a`,
                      color: cfg.accent,
                      letterSpacing: '0.1em',
                    }}
                  >
                    {t('tierMostPopular')}
                  </span>
                )}
              </div>

              <div className="mb-3">
                <div className="text-xl font-extrabold" style={{ color: cfg.priceColor }}>
                  {t(cfg.priceKey)}
                </div>
              </div>

              <p
                className="text-xs leading-relaxed mb-4 flex-1"
                style={{ color: '#374151' }}
              >
                {t(cfg.blurbKey)}
              </p>

              <button
                onClick={() => handleClick(cfg.tier, url)}
                disabled={!live}
                className="w-full rounded-lg py-2 px-3 text-sm font-bold transition-opacity"
                style={{
                  background: live ? cfg.accent : 'rgba(107, 114, 128, 0.15)',
                  color: live ? '#ffffff' : '#6b7280',
                  cursor: live ? 'pointer' : 'not-allowed',
                }}
                aria-label={live ? `${t(cfg.ctaKey)}` : `${t(cfg.labelKey)} — ${t('tierComingSoon')}`}
              >
                {live ? t(cfg.ctaKey) : t('tierComingSoon')}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
