'use client'

// TierGate — TASK-057a rewrite.
//
// Modal pricing gate (e.g. rendered on /pro or the generic "Upgrade GONR"
// CTA). Reads tier data from `lib/pricing/tiers.ts` — the single pricing
// source of truth. Kills the previous `tierFeatureDiyProtocols` i18n-key
// rendering bug by dropping `t()` calls entirely (plain English copy).
//
// Home is the first card with a "Most popular" badge. Spotter is the pro
// upsell. Operator renders "Coming soon" when its checkout isn't live.
//
// NO user-facing SmartCareOS / platform framing (per Atlas 2026-04-21
// locked posture — external brand stays GONR).

import { useEffect } from 'react'
import { TIERS, getBadgeDisplay, type TierDisplay } from '@/lib/pricing/tiers'

interface TierGateProps {
  isOpen: boolean
  onClose: () => void
  email?: string
}

export default function TierGate({ isOpen, onClose, email }: TierGateProps) {
  // Body scroll lock (matches the existing TierGate behavior; TASK-057c
  // consistency audit recommends this be standardized across all popups).
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg bg-white dark:bg-[#0e131b] rounded-2xl
          shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200
          max-h-[90vh] overflow-y-auto"
      >
        {/* Header — consumer-first per TASK-057a */}
        <div className="px-6 pt-6 pb-4 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Pick your GON<span className="text-green-500">R</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Start where you are — upgrade anytime.
          </p>
        </div>

        {/* Tier cards */}
        <div className="px-4 pb-4 space-y-3">
          {TIERS.map((tier) => (
            <TierCard key={tier.key} tier={tier} email={email} />
          ))}
        </div>

        {/* Dismiss */}
        <div className="px-4 pb-6 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}

function TierCard({ tier, email }: { tier: TierDisplay; email?: string }) {
  const badge = getBadgeDisplay(tier.badge)
  const live = tier.isLive()
  const checkoutUrl = tier.getCheckoutUrl(email)

  return (
    <div
      className={`relative rounded-xl border-l-4 ${tier.accentBorderClass}
        ${tier.accentBgClass} bg-gray-50 dark:bg-white/5 p-4 space-y-3`}
    >
      {badge && (
        <span
          className={`absolute top-3 right-3 text-[10px] font-bold uppercase
            tracking-wider px-2 py-0.5 rounded-full ${badge.className}`}
        >
          {badge.text}
        </span>
      )}

      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{tier.name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tier.description}</p>
        <p className="text-lg font-bold text-green-500 mt-1">{tier.priceLabel}</p>
      </div>

      <ul className="space-y-1.5">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            <span className="text-green-500 flex-shrink-0 mt-0.5">{'\u2713'}</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {tier.badge === 'coming_soon' || !live || !checkoutUrl ? (
        <div
          className="block w-full min-h-[44px] rounded-lg bg-gray-200 dark:bg-gray-700
            text-gray-500 dark:text-gray-400 text-sm font-semibold text-center
            leading-[44px] cursor-default"
        >
          Coming soon
        </div>
      ) : (
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full min-h-[44px] rounded-lg bg-green-500 hover:bg-green-600
            text-white text-sm font-semibold text-center leading-[44px] transition-colors"
        >
          {tier.ctaLabel}
        </a>
      )}
    </div>
  )
}
