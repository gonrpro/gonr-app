'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface StepInput {
  agent: string
  instruction: string
}

interface CustomProtocolFormProps {
  onCreated: () => void
  onClose: () => void
}

export default function CustomProtocolForm({ onCreated, onClose }: CustomProtocolFormProps) {
  const { t } = useLanguage()
  const [stain, setStain] = useState('')
  const [surface, setSurface] = useState('')
  const [steps, setSteps] = useState<StepInput[]>([{ agent: '', instruction: '' }])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function addStep() {
    setSteps([...steps, { agent: '', instruction: '' }])
  }

  function removeStep(idx: number) {
    if (steps.length <= 1) return
    setSteps(steps.filter((_, i) => i !== idx))
  }

  function updateStep(idx: number, field: keyof StepInput, value: string) {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, [field]: value } : s)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!stain.trim() || !surface.trim()) {
      setError(t('customErrorRequired'))
      return
    }

    const validSteps = steps.filter(s => s.instruction.trim())
    if (validSteps.length === 0) {
      setError(t('customErrorSteps'))
      return
    }

    const email = localStorage.getItem('gonr_user_email')
    if (!email) {
      setError(t('customErrorAuth'))
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/protocols/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          stain: stain.trim(),
          surface: surface.trim(),
          steps: validSteps,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create protocol')
      }

      onCreated()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-[600px] rounded-t-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
            {t('customTitle')}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 56px)' }}>
          {/* Stain */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {t('customStain')} *
            </label>
            <input
              type="text"
              value={stain}
              onChange={e => setStain(e.target.value)}
              placeholder={t('customStainPlaceholder')}
              className="input"
            />
          </div>

          {/* Surface */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {t('customSurface')} *
            </label>
            <input
              type="text"
              value={surface}
              onChange={e => setSurface(e.target.value)}
              placeholder={t('customSurfacePlaceholder')}
              className="input"
            />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {t('customSteps')}
            </label>
            {steps.map((step, i) => (
              <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
                    {t('customStepNum')} {i + 1}
                  </span>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="text-[11px] font-medium"
                      style={{ color: 'var(--danger)' }}
                    >
                      {t('customRemove')}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={step.agent}
                  onChange={e => updateStep(i, 'agent', e.target.value)}
                  placeholder={t('customAgentPlaceholder')}
                  className="input text-sm"
                  style={{ padding: '8px 12px' }}
                />
                <textarea
                  value={step.instruction}
                  onChange={e => updateStep(i, 'instruction', e.target.value)}
                  placeholder={t('customInstructionPlaceholder')}
                  className="input text-sm"
                  style={{ padding: '8px 12px', minHeight: '60px', resize: 'vertical' }}
                  rows={2}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addStep}
              className="w-full py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                border: '1px dashed rgba(34,197,94,0.3)',
              }}
            >
              + {t('customAddStep')}
            </button>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {t('customNotes')}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('customNotesPlaceholder')}
              className="input text-sm"
              style={{ minHeight: '60px', resize: 'vertical' }}
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ opacity: submitting ? 0.5 : 1 }}
          >
            {submitting ? t('customCreating') : t('customCreate')}
          </button>
        </form>
      </div>
    </div>
  )
}
