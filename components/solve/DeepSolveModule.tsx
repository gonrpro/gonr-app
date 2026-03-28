'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const QUICK_CHIPS = [
  { tKey: 'chipStainOld', value: 'Stain is old' },
  { tKey: 'chipAlreadyTreated', value: 'Already treated' },
  { tKey: 'chipHighValue', value: 'High-value garment' },
  { tKey: 'chipCustomerUpset', value: 'Customer is upset' },
  { tKey: 'chipDelicateFiber', value: 'Delicate fiber' },
  { tKey: 'chipUnknownFiber', value: 'Unknown fiber' },
  { tKey: 'chipDyeBleed', value: 'Dye bleed suspected' },
  { tKey: 'chipHeatDamage', value: 'Heat damage suspected' },
] as const

interface DeepSolveModuleProps {
  stain: string
  surface: string
  cardId: string
  onResult: (text: string) => void
}

export default function DeepSolveModule({ stain, surface, cardId, onResult }: DeepSolveModuleProps) {
  const { t, lang } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [details, setDetails] = useState('')
  const [activeChips, setActiveChips] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  function toggleChip(value: string) {
    setActiveChips((prev) => {
      const next = new Set(prev)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return next
    })
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const context = [
        ...Array.from(activeChips),
        details,
      ].filter(Boolean).join('. ')

      const res = await fetch('/api/deep-solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stain, surface, cardId, context, lang }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data.protocol || data.text || t('deepSolveFallback'))
        onResult(data.protocol || data.text || '')
      } else {
        setResult(t('deepSolveUnavailable'))
      }
    } catch {
      setResult(t('deepSolveUnavailable'))
    } finally {
      setLoading(false)
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700
          text-white text-sm font-semibold transition-colors shadow-lg shadow-purple-600/25"
      >
        {'\uD83D\uDD2E'} {t('deepSolveExpandCta')}
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-4
      animate-in fade-in slide-in-from-top-2 duration-200">
      <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
        {'\uD83D\uDD2E'} {t('deepSolveModuleHeader')}
      </h3>

      {/* Textarea */}
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={3}
        placeholder={t('deepSolveDetailPlaceholder')}
        className="w-full rounded-lg bg-white dark:bg-[#0e131b] border border-gray-200 dark:border-white/10
          text-sm text-gray-800 dark:text-gray-200 p-3 resize-none
          focus:outline-none focus:ring-2 focus:ring-purple-500/50
          placeholder:text-gray-400 dark:placeholder:text-gray-600"
      />

      {/* Quick chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => toggleChip(chip.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium min-h-[44px] transition-all
              ${activeChips.has(chip.value)
                ? 'bg-purple-500 text-white'
                : 'bg-white dark:bg-[#0e131b] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:border-purple-500/50'
              }`}
          >
            {t(chip.tKey)}
          </button>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700
          text-white text-sm font-semibold transition-colors disabled:opacity-50
          shadow-lg shadow-purple-600/25"
      >
        {loading ? t('deepSolveGenerating') : `\uD83D\uDD2E ${t('deepSolveGenerateBtn')}`}
      </button>

      {/* Result */}
      {result && (
        <div className="rounded-lg bg-white dark:bg-[#0e131b] border border-purple-500/20 p-4">
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {result}
          </p>
        </div>
      )}
    </div>
  )
}
