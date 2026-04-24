'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import Badge, { type BadgeTone } from './Badge'

/**
 * Shared quick-reference modal — opens when the user taps a chemistry,
 * agent, or safety badge and wants a fast expert brief without leaving
 * the solve flow.
 *
 * Structure locked by Atlas 8037 + Nova 8047:
 *   - Header:      family/agent name + icon + colored tone match
 *   - Explainer:   first-principles, 1–2 sentences (TASK-061 voice)
 *   - Caution:     what to avoid (one sentence, red accent)
 *   - Examples:    2–3 brand products if relevant
 *   - "See full reference" CTA → deep link into the chemicals page
 *   - Close on outside click or Escape
 *
 * This component is intentionally dumb — it takes content props and renders
 * them. The content itself lives in `lib/ui/quickReferenceContent.ts` so
 * Nova can iterate on copy without touching layout.
 */

export interface QuickReferenceContent {
  /** Display name shown in the modal title. */
  title: string
  /** Optional leading emoji/glyph. */
  icon?: string
  /** Badge tone that matches the tapped badge (color hint). */
  tone: BadgeTone
  /** 1–2 sentence first-principles explainer. */
  explainer: string
  /** Short caution / what to avoid. */
  caution?: string
  /**
   * Quick-glance examples. Nova's locked content (AtlasOps 8061) uses the
   * 3-line pattern: common stains → home recipe → pro recipe. Accepts plain
   * strings so copy iteration stays fast.
   */
  examples?: string[]
  /** Deep link target — e.g. `/pro/chemicals?family=tannin`. */
  referenceHref?: string
  /** CTA label for the deep link. Defaults to "See full reference". */
  referenceLabel?: string
}

interface QuickReferenceModalProps {
  open: boolean
  onClose: () => void
  content: QuickReferenceContent | null
}

export default function QuickReferenceModal({ open, onClose, content }: QuickReferenceModalProps) {
  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !content) return null

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickref-title"
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 pt-4 pb-3 flex items-start justify-between gap-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {content.icon && <span className="text-xl" aria-hidden="true">{content.icon}</span>}
            <h2
              id="quickref-title"
              className="text-base font-bold leading-snug flex-1"
              style={{ color: 'var(--text)' }}
            >
              {content.title}
            </h2>
            <Badge tone={content.tone} size="sm">{content.title}</Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 -mt-1 -mr-1 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg transition-colors hover:bg-white/5 active:bg-white/10"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.75} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          {/* Explainer */}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
            {content.explainer}
          </p>

          {/* Caution */}
          {content.caution && (
            <div
              className="flex gap-2 items-start rounded-lg px-3 py-2.5 text-xs leading-relaxed"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: 'var(--text)',
              }}
            >
              <span aria-hidden="true" className="text-red-400 flex-shrink-0 mt-0.5">⚠</span>
              <span>{content.caution}</span>
            </div>
          )}

          {/* Examples — Nova's 3-line pattern (stains · home · pro) */}
          {content.examples && content.examples.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono font-bold tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                EXAMPLES
              </p>
              <ul className="space-y-1.5">
                {content.examples.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }}>•</span>
                    <span style={{ color: 'var(--text)' }}>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* CTA */}
        {content.referenceHref && (
          <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <a
              href={content.referenceHref}
              className="block w-full text-center min-h-[44px] flex items-center justify-center rounded-xl text-sm font-semibold transition-[transform,opacity] duration-150 active:scale-[0.98] hover:opacity-90"
              style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: 'var(--accent)',
                textDecoration: 'none',
              }}
            >
              {content.referenceLabel ?? 'See full reference'}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

