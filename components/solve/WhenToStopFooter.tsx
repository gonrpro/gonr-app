// components/solve/WhenToStopFooter.tsx — TASK-049 Phase 2 P2-d
//
// Standardized safety footer rendered on every home-tier solve result.
// NOT dismissible. Below the upgrade banner. Attorney-reviewed language
// is a future blocker — this is the sensible-default interim copy locked
// with Tyler + Atlas 2026-04-19.
//
// Only renders for home-tier users (not free, not pro). Free users have
// the 3-solve lifetime cap which is itself a "stop" signal; pros are the
// ones giving advice in a shop setting and don't need the nudge.

'use client'

export default function WhenToStopFooter() {
  return (
    <div
      className="mt-3 rounded-md border overflow-hidden"
      role="note"
      aria-label="Safety notice"
      style={{
        borderColor: 'rgba(253, 224, 71, 0.4)',
        background: 'rgba(254, 243, 199, 0.6)',
      }}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <span className="flex-shrink-0 text-base" aria-hidden="true">⚠️</span>
        <p className="text-xs leading-relaxed" style={{ color: '#78350f' }}>
          Test a hidden area first. If the stain persists after two attempts, take it to a professional cleaner.
        </p>
      </div>
    </div>
  )
}
