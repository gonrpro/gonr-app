'use client'

import { useEffect, useState } from 'react'

/**
 * Skeleton shown while the solve request is in flight. Three things matter here:
 *
 * 1. It mimics the actual ResultCard shape (title, 3-tile trust block, step rows)
 *    so the transition to the real result feels continuous rather than jarring.
 * 2. A rotating "thinking" line tells the user *what* we're doing, turning
 *    dead time into signal that the chemistry is being looked at carefully.
 * 3. The shimmer uses the existing .skeleton class in globals.css so motion
 *    language stays consistent with every other loading state in the app.
 *
 * Atlas P0 #1 (solve-flow microinteractions) — 2026-04-24.
 */
export default function SolveLoadingSkeleton() {
  const messages = [
    'Reading the chemistry…',
    'Matching a protocol…',
    'Compiling safe steps…',
    'Checking escalation cues…',
  ]
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length)
    }, 1400)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="rounded-xl overflow-hidden animate-in fade-in duration-200"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}
      role="status"
      aria-live="polite"
      aria-label={messages[messageIndex]}
    >
      {/* Header: title bar + verified badge */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="skeleton h-5 w-1/2" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* Card badges row */}
      <div className="px-4 pt-3 pb-2 flex gap-2">
        <div className="skeleton h-5 w-20 rounded-full" />
        <div className="skeleton h-5 w-24 rounded-full" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>

      {/* Trust block (3 tiles) */}
      <div className="px-4 pb-3 grid grid-cols-1 md:grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl p-3 min-h-[72px]"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <div className="skeleton h-3 w-2/3 mb-2" />
            <div className="skeleton h-3 w-full mb-1" />
            <div className="skeleton h-3 w-5/6" />
          </div>
        ))}
      </div>

      {/* Steps section */}
      <div className="px-4 pb-4">
        <div className="skeleton h-3 w-24 mb-3" />
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton h-7 w-7 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-1/3" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-11/12" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thinking ticker — this is the part that tells the user we're actually
          working. Kept intentionally short to avoid becoming the focus. */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: 'var(--accent)' }}
          aria-hidden="true"
        />
        <span
          key={messageIndex}
          className="text-xs animate-in fade-in duration-300"
          style={{ color: 'var(--text-secondary)' }}
        >
          {messages[messageIndex]}
        </span>
      </div>
    </div>
  )
}
