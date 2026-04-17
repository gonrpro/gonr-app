'use client'

import { useEffect, useCallback } from 'react'
import type { Step } from '@/lib/types'

interface StepEnlargeModalProps {
  steps: Step[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function StepEnlargeModal({ steps, currentIndex, onClose, onNavigate }: StepEnlargeModalProps) {
  const step = steps[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === steps.length - 1

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft' && !isFirst) onNavigate(currentIndex - 1)
    if (e.key === 'ArrowRight' && !isLast) onNavigate(currentIndex + 1)
  }, [currentIndex, isFirst, isLast, onClose, onNavigate])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  if (!step) return null

  return (
    <div
      className="fixed inset-0 z-[1100] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Step {step.step ?? currentIndex + 1} of {steps.length}
        </span>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full text-lg"
          style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.08)' }}
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      {/* Step content — scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {/* Agent badge */}
        {step.agent && (
          <p className="text-sm font-bold uppercase tracking-wider mb-3"
            style={{ color: '#22c55e' }}>
            {step.agent}
          </p>
        )}

        {/* Main instruction — large readable text */}
        <p className="text-xl leading-relaxed font-medium" style={{ color: '#F5F5F0' }}>
          {step.instruction}
        </p>

        {/* Details row */}
        <div className="mt-5 space-y-2">
          {(step.technique || step.temperature) && (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {[step.technique, step.temperature].filter(Boolean).join(' — ')}
            </p>
          )}
          {step.dwellTime && (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              ⏱ {step.dwellTime}
            </p>
          )}
          {(step as any).equipment && (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              🧰 {(step as any).equipment}
            </p>
          )}
        </div>
      </div>

      {/* Navigation footer */}
      <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => !isFirst && onNavigate(currentIndex - 1)}
          disabled={isFirst}
          className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold transition-opacity"
          style={{
            background: isFirst ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
            color: isFirst ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          ← Previous
        </button>
        <button
          onClick={() => isLast ? onClose() : onNavigate(currentIndex + 1)}
          className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold transition-opacity"
          style={{
            background: isLast ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)',
            color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.3)',
          }}
        >
          {isLast ? '✓ Done' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
