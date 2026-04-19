// lib/events/client.ts — TASK-049 Phase 2 P2-d
//
// Fire-and-forget client-side telemetry wrapper. Posts to the internal
// /api/events/record endpoint which forwards to the same recordEvent()
// server scaffold used by the solve route. Never blocks UI. Never throws.
//
// Usage:
//   import { recordClientEvent } from '@/lib/events/client'
//   recordClientEvent('upgrade_banner.shown', { fromTier: 'home', cardId: '...' })

'use client'

type ClientEventPayload = Record<string, unknown>

/**
 * Post an event to the events-record endpoint without awaiting or blocking.
 * Uses sendBeacon when available (more reliable across page navigations)
 * and falls back to fetch with keepalive.
 */
export function recordClientEvent(type: string, payload: ClientEventPayload = {}): void {
  if (typeof window === 'undefined') return // SSR safety

  const body = JSON.stringify({ type, payload })

  try {
    // sendBeacon is ideal — fires reliably even when the page is unloading.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      const ok = navigator.sendBeacon('/api/events/record', blob)
      if (ok) return
      // fall through to fetch if sendBeacon refuses (payload too large, etc.)
    }

    // Fetch with keepalive — posts even if the user navigates away immediately.
    fetch('/api/events/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => { /* swallow — telemetry must never break the UI */ })
  } catch {
    // In SSR, private mode, or any oddness — log to console for dev, don't throw
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[client-event] failed:', type, payload)
    }
  }
}
