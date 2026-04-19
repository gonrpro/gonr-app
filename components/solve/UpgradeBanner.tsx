// components/solve/UpgradeBanner.tsx — TASK-049 Phase 2 P2-d
//
// Home-tier upgrade nudge. Renders below the solve protocol, above the
// when-to-stop footer. Dismissible per-session via sessionStorage.
// Resets on every new solve (new correlationId) so a dismissed banner
// doesn't disappear forever.
//
// Telemetry: upgrade_banner.shown on first render per solve,
// upgrade_banner.clicked on CTA, upgrade_banner.dismissed on close.

'use client'

import { useState, useEffect } from 'react'
import { recordClientEvent } from '@/lib/events/client'

interface UpgradeBannerProps {
  /** Unique identifier for this solve — dismissal state keyed by this. */
  correlationId: string
  /** Which tier is the user coming from. Drives the event payload. */
  fromTier: 'home' | 'free'
  /** Optional cardId for telemetry context. */
  cardId?: string | null
}

export default function UpgradeBanner({ correlationId, fromTier, cardId }: UpgradeBannerProps) {
  const storageKey = `gonr_upgrade_dismissed_${correlationId}`
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Hydrate dismissal state from sessionStorage (SSR-safe).
  useEffect(() => {
    try {
      const already = typeof window !== 'undefined' && sessionStorage.getItem(storageKey) === '1'
      setDismissed(already)
    } catch {
      // sessionStorage unavailable (private mode, iframe constraints) — show banner
    }
    setMounted(true)
  }, [storageKey])

  // Fire shown event once per correlationId per session.
  useEffect(() => {
    if (!mounted || dismissed) return
    const shownKey = `${storageKey}_shown`
    try {
      if (sessionStorage.getItem(shownKey) === '1') return
      sessionStorage.setItem(shownKey, '1')
    } catch {
      // fall through and still fire the event
    }
    recordClientEvent('upgrade_banner.shown', { fromTier, cardId: cardId ?? null, correlationId })
  }, [mounted, dismissed, fromTier, cardId, correlationId, storageKey])

  if (!mounted || dismissed) return null

  const handleUpgrade = () => {
    recordClientEvent('upgrade_banner.clicked', {
      fromTier,
      targetTier: 'spotter',
      cardId: cardId ?? null,
      correlationId,
    })
    const url = process.env.NEXT_PUBLIC_SPOTTER_CHECKOUT_URL
      || process.env.NEXT_PUBLIC_OPERATOR_CHECKOUT_URL
      || '/profile'
    window.location.href = url
  }

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(storageKey, '1')
    } catch {
      // If storage is unavailable, banner will re-appear on next mount — acceptable
    }
    recordClientEvent('upgrade_banner.dismissed', {
      fromTier,
      cardId: cardId ?? null,
      correlationId,
    })
    setDismissed(true)
  }

  return (
    <div
      className="mt-4 rounded-xl border overflow-hidden"
      style={{
        borderColor: 'rgba(139, 92, 246, 0.3)',
        background: 'linear-gradient(135deg, rgba(237, 233, 254, 1) 0%, rgba(221, 214, 254, 1) 100%)',
      }}
      role="region"
      aria-label="Upgrade to Spotter"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 text-2xl" aria-hidden="true">💎</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm" style={{ color: '#6d28d9' }}>
            See the professional protocol?
          </div>
          <div className="text-xs mt-1 leading-relaxed" style={{ color: '#4c1d95' }}>
            Upgrade to Spotter for unlimited solves, pro-grade chemistry, and the full spotting-board sequence.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleUpgrade}
              className="text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-md text-white transition-opacity hover:opacity-90"
              style={{ background: '#8b5cf6' }}
            >
              Upgrade now
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs font-medium px-2 py-2 rounded-md transition-colors"
              style={{ color: '#6b7280' }}
              aria-label="Dismiss upgrade banner for this solve"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
