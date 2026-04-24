'use client'

// TASK-056 — client-side beacon that fires once when the AI-fallback
// disclosure banner actually renders. Single POST to /api/events for
// the `solve.ai_fallback_disclosure_rendered` type. Used to distinguish
// "server attached the disclosure" from "user actually saw it."

import { useEffect, useRef } from 'react'

type Props = {
  correlationId: string | null
}

export default function DisclosureRenderedBeacon({ correlationId }: Props) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    try {
      fetch('/api/events/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'solve.ai_fallback_disclosure_rendered',
          payload: { correlationId },
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      // Beacon is fire-and-forget. Any failure here is non-fatal.
    }
  }, [correlationId])
  return null
}
