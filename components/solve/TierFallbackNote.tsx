// components/solve/TierFallbackNote.tsx — TASK-049 Phase 2 P2-d §7.3
//
// Rendered when a home-tier user hits a card that has no homeSolutions
// field. The solve route returns the card anyway; ResultCard renders
// spottingProtocol as a fallback + this amber note to set expectations.
//
// Every render of this component also fires render.home.fallback_to_spotting_protocol
// so telemetry surfaces which cards need Phase 3 consumer-voice authoring
// first (ranked by real home-user traffic).

'use client'

import { useEffect } from 'react'
import { recordClientEvent } from '@/lib/events/client'

interface TierFallbackNoteProps {
  cardId: string | null
  stain: string
  surface: string
}

export default function TierFallbackNote({ cardId, stain, surface }: TierFallbackNoteProps) {
  // Fire telemetry once per mount. ResultCard remounts on every new solve
  // because it's keyed by correlationId, so this event naturally scopes to
  // a single card-view.
  useEffect(() => {
    recordClientEvent('render.home.fallback_to_spotting_protocol', {
      cardId,
      stain,
      surface,
    })
  }, [cardId, stain, surface])

  return (
    <div
      className="mb-3 rounded-md border overflow-hidden"
      role="note"
      aria-label="Protocol note"
      style={{
        borderColor: 'rgba(245, 158, 11, 0.35)',
        background: 'rgba(254, 243, 199, 0.4)',
      }}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <span className="flex-shrink-0 text-base" aria-hidden="true">ℹ️</span>
        <p className="text-xs leading-relaxed" style={{ color: '#78350f' }}>
          This protocol is written for professionals — we&apos;re working on a home-friendly version.
          Test a hidden area first and stop if the fabric reacts.
        </p>
      </div>
    </div>
  )
}
