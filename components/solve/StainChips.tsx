'use client'

import { useState } from 'react'
import { STAIN_CHIPS, getStainLabel } from '@/lib/protocols/chips'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface StainChipsProps {
  onStainSelect: (stain: string) => void
  selectedStain: string
}

export default function StainChips({ onStainSelect, selectedStain }: StainChipsProps) {
  const { t, lang } = useLanguage()
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null)

  function handleFamilyClick(name: string) {
    const chip = STAIN_CHIPS.find((c) => c.name === name)
    if (chip && chip.subs.length === 0) {
      // No subs — toggle selection on the family name directly
      if (selectedStain === name) {
        onStainSelect('')
      } else {
        onStainSelect(name)
      }
      setExpandedFamily(null)
      return
    }
    if (expandedFamily === name) {
      setExpandedFamily(null)
    } else {
      setExpandedFamily(name)
    }
  }

  function handleSubClick(sub: string) {
    onStainSelect(sub)
  }

  const expandedChip = STAIN_CHIPS.find((c) => c.name === expandedFamily)

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1">
        {t('whatStain')}
      </p>

      {/* Family chips */}
      <div className="flex flex-wrap gap-2">
        {STAIN_CHIPS.map((chip) => {
          const isExpanded = expandedFamily === chip.name
          const isSelected = chip.subs.some((s) => s === selectedStain) || (chip.subs.length === 0 && selectedStain === chip.name)
          return (
            <button
              key={chip.name}
              onClick={() => handleFamilyClick(chip.name)}
              className={`flex items-center px-3 py-2 rounded-xl min-h-[44px] border text-sm font-medium transition-all active:scale-[0.98] ${
                isSelected
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_10px_24px_rgba(16,185,129,0.22)]'
                  : isExpanded
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/12 dark:text-emerald-300 dark:border-emerald-500/30'
                    : 'bg-white text-gray-700 border-gray-200 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 dark:bg-[#0f172a] dark:text-gray-200 dark:border-white/10 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/25'
              }`}
            >
              <span>{getStainLabel(chip.name, lang as 'en' | 'es')}</span>
            </button>
          )
        })}
      </div>

      {/* Sub-stain chips */}
      {expandedChip && (
        <div className="flex flex-wrap gap-2 pl-2 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {expandedChip.subs.map((sub) => {
            const isActive = selectedStain === sub
            return (
              <button
                key={sub}
                onClick={() => handleSubClick(sub)}
                className={`px-3 py-1.5 rounded-lg min-h-[44px] border text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_10px_24px_rgba(16,185,129,0.22)]'
                    : 'bg-white text-gray-600 border-gray-200 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 dark:bg-[#0f172a] dark:text-gray-300 dark:border-white/10 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/25'
                }`}
              >
                {getStainLabel(sub, lang as 'en' | 'es')}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
