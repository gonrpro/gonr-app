'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { STAIN_CHIPS, SURFACE_CHIPS } from '@/lib/protocols/chips'

const AGENTS = [
  'NSD', 'POG', 'Protein Formula', 'Tannin Formula',
  'Amyl Acetate', 'Acetic Acid', 'Hydrogen Peroxide',
  'Oxalic Acid', 'Rust Remover', 'Leveling Agent',
  'Feathering Agent', 'Neutral Lubricant', 'Digestant',
  'Oily-Type Paint Remover', 'Bleach (Sodium Hypochlorite)',
  'Enzyme Presoak', 'Thermal Accelerant', 'Water',
] as const

// Flatten stain chips into a single list of canonical stain names
const STAIN_OPTIONS = STAIN_CHIPS.flatMap((family) =>
  family.subs.map((sub) => ({ label: `${family.emoji} ${sub}`, value: sub }))
)

interface ProtocolStep {
  agent: string
  dwellTime: string
  instruction: string
}

function emptyStep(): ProtocolStep {
  return { agent: '', dwellTime: '', instruction: '' }
}

export default function DanBuilderPage() {
  const { t } = useLanguage()

  const [stain, setStain] = useState('')
  const [fiber, setFiber] = useState('')
  const [steps, setSteps] = useState<ProtocolStep[]>([emptyStep(), emptyStep()])
  const [safetyWarnings, setSafetyWarnings] = useState('')
  const [neverDo, setNeverDo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const updateStep = (index: number, field: keyof ProtocolStep, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  const addStep = () => {
    setSteps((prev) => [...prev, emptyStep()])
  }

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setError('')
    setSaved(false)

    if (!stain || !fiber) {
      setError(t('danErrorSelectStainFiber'))
      return
    }

    const filledSteps = steps.filter((s) => s.instruction.trim())
    if (filledSteps.length < 2) {
      setError(t('danErrorMinSteps'))
      return
    }

    setSaving(true)

    try {
      const payload = {
        stain,
        fiber,
        steps: filledSteps.map((s, i) => ({
          step: i + 1,
          agent: s.agent || undefined,
          dwellTime: s.dwellTime || undefined,
          instruction: s.instruction,
        })),
        safetyWarnings: safetyWarnings
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        neverDo: neverDo
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      }

      const res = await fetch('/api/dan/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSaved(true)
      } else {
        setError(t('danSaveFailed'))
      }
    } catch {
      setError(t('danSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t('danBuilderTitle')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t('danBuilderSubtitle')}
        </p>
      </div>

      {/* Success banner */}
      {saved && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-400 font-medium">
          {t('danProtocolSaved')}
        </div>
      )}

      {/* Stain selector */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">{t('danLabelStain')}</label>
        <select
          value={stain}
          onChange={(e) => setStain(e.target.value)}
          className="w-full rounded-lg bg-white dark:bg-[#0e131b] border border-gray-200 dark:border-white/10
            text-sm text-gray-800 dark:text-gray-200 p-3 min-h-[44px]
            focus:outline-none focus:ring-2 focus:ring-green-500/50"
        >
          <option value="">{t('danSelectStain')}</option>
          {STAIN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Fiber selector */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">{t('danLabelFiber')}</label>
        <select
          value={fiber}
          onChange={(e) => setFiber(e.target.value)}
          className="w-full rounded-lg bg-white dark:bg-[#0e131b] border border-gray-200 dark:border-white/10
            text-sm text-gray-800 dark:text-gray-200 p-3 min-h-[44px]
            focus:outline-none focus:ring-2 focus:ring-green-500/50"
        >
          <option value="">{t('danSelectFiber')}</option>
          {SURFACE_CHIPS.map((surface) => (
            <option key={surface} value={surface}>
              {surface}
            </option>
          ))}
        </select>
      </div>

      {/* Protocol Steps */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">{t('danProtocolSteps')}</h2>

        {steps.map((step, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-3
              bg-gray-50 dark:bg-white/[0.02]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {t('danStepNumber')} {i + 1}
              </span>
              {steps.length > 2 && (
                <button
                  onClick={() => removeStep(i)}
                  className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                >
                  {t('danRemoveStep')}
                </button>
              )}
            </div>

            {/* Agent select */}
            <select
              value={step.agent}
              onChange={(e) => updateStep(i, 'agent', e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-[#0e131b] border border-gray-200 dark:border-white/10
                text-sm text-gray-800 dark:text-gray-200 p-2.5 min-h-[44px]
                focus:outline-none focus:ring-2 focus:ring-green-500/50"
            >
              <option value="">{t('danSelectAgent')}</option>
              {AGENTS.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>

            {/* Dwell time */}
            <input
              type="text"
              value={step.dwellTime}
              onChange={(e) => updateStep(i, 'dwellTime', e.target.value)}
              placeholder={t('danDwellTimePlaceholder')}
              className="w-full rounded-lg bg-white dark:bg-[#0e131b] border border-gray-200 dark:border-white/10
                text-sm text-gray-800 dark:text-gray-200 p-2.5
                focus:outline-none focus:ring-2 focus:ring-green-500/50
                placeholder:text-gray-400 dark:placeholder:text-gray-600"
            />

            {/* Instruction */}
            <textarea
              value={step.instruction}
              onChange={(e) => updateStep(i, 'instruction', e.target.value)}
              rows={2}
              placeholder={t('danInstructionPlaceholder')}
              className="w-full rounded-lg bg-white dark:bg-[#0e131b] border border-gray-200 dark:border-white/10
                text-sm text-gray-800 dark:text-gray-200 p-2.5 resize-none
                focus:outline-none focus:ring-2 focus:ring-green-500/50
                placeholder:text-gray-400 dark:placeholder:text-gray-600"
            />
          </div>
        ))}

        <button
          onClick={addStep}
          className="w-full min-h-[44px] rounded-xl border border-dashed border-gray-300 dark:border-white/10
            text-sm font-medium text-gray-500 dark:text-gray-400
            hover:border-green-500/30 hover:text-green-400 transition-colors"
        >
          {t('danAddStep')}
        </button>
      </div>

      {/* Safety Warnings */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">
          {t('danSafetyWarnings')}{' '}
          <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>
            {t('danOnePerLine')}
          </span>
        </label>
        <textarea
          value={safetyWarnings}
          onChange={(e) => setSafetyWarnings(e.target.value)}
          rows={3}
          className="w-full rounded-lg bg-white dark:bg-[#0e131b] border border-gray-200 dark:border-white/10
            text-sm text-gray-800 dark:text-gray-200 p-3 resize-none
            focus:outline-none focus:ring-2 focus:ring-green-500/50
            placeholder:text-gray-400 dark:placeholder:text-gray-600"
        />
      </div>

      {/* Never Do */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">
          {t('danNeverDo')}{' '}
          <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>
            {t('danOnePerLine')}
          </span>
        </label>
        <textarea
          value={neverDo}
          onChange={(e) => setNeverDo(e.target.value)}
          rows={3}
          className="w-full rounded-lg bg-white dark:bg-[#0e131b] border border-gray-200 dark:border-white/10
            text-sm text-gray-800 dark:text-gray-200 p-3 resize-none
            focus:outline-none focus:ring-2 focus:ring-green-500/50
            placeholder:text-gray-400 dark:placeholder:text-gray-600"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 font-medium">
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full min-h-[44px] rounded-xl bg-green-500 text-white text-sm font-semibold
          hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? t('danSaving') : t('danSaveProtocol')}
      </button>

      {/* AI note */}
      <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {t('danAiFillsIn')}
      </p>
    </div>
  )
}
