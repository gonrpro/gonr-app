'use client'

// TASK-057b — PreviewBanner.
//
// Sticky banner at the top of the viewport visible only when a founder
// account has a preview tier active. Shows the preview tier + a Reset
// link that clears it and returns to real-tier rendering.
//
// Emits analytics events:
//   preview.tier_switched  — when the banner first renders with a preview
//                            tier (query param or storage hit)
//   preview.reset          — when the user clicks Reset
//
// Event names are dot-notated per Atlas 2026-04-21 guardrail — consistent
// with the future Events Engine shape.

import { useEffect } from 'react'
import { useOptionalAuth } from '@/lib/auth/AuthContext'
import { clearPreviewTier, getPreviewTier, isFounder } from '@/lib/auth/viewerTier'
import { recordClientEvent } from '@/lib/events/client'

type Props = {
  onAnalyticsEvent?: (name: string, payload: Record<string, unknown>) => void
}

export default function PreviewBanner({ onAnalyticsEvent }: Props = {}) {
  const { user } = useOptionalAuth()
  const email = user?.email ?? null
  const emit = onAnalyticsEvent ?? recordClientEvent
  const previewTier = isFounder(email) ? getPreviewTier(email) : null

  useEffect(() => {
    if (previewTier) {
      emit('preview.tier_switched', { tier: previewTier, via: 'banner_mount' })
    }
  }, [previewTier, emit])

  // Non-founder or no active preview → render nothing.
  if (!previewTier) return null

  const handleReset = () => {
    clearPreviewTier()
    emit('preview.reset', { from_tier: previewTier })
    // Reload so every tier-aware render path picks up the change.
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  const tierLabel =
    previewTier === 'home' ? 'Home'
    : previewTier === 'spotter' ? 'Spotter'
    : previewTier === 'operator' ? 'Operator'
    : previewTier === 'founder' ? 'Founder'
    : previewTier

  return (
    <div
      className="sticky top-0 z-[200] w-full flex items-center justify-center gap-2
        px-4 py-2 text-xs font-medium"
      style={{
        background: 'linear-gradient(90deg, rgba(245,158,11,0.15), rgba(245,158,11,0.25))',
        borderBottom: '1px solid rgba(245,158,11,0.4)',
        color: '#92400e',
      }}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">👁️</span>
      <span>
        Previewing <strong>{tierLabel}</strong> tier (founder override — rendering only, entitlements unchanged)
      </span>
      <button
        type="button"
        onClick={handleReset}
        className="ml-2 underline hover:opacity-80 transition-opacity"
        style={{ color: '#92400e', background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        Reset
      </button>
    </div>
  )
}
