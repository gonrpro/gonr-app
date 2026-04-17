'use client'

import { useState } from 'react'
import { SURFACE_CHIPS, getSurfaceLabel } from '@/lib/protocols/chips'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface SurfaceChipsProps {
  onSurfaceSelect: (surface: string) => void
  selectedSurface: string
  visible: boolean
}

export default function SurfaceChips({ onSurfaceSelect, selectedSurface, visible }: SurfaceChipsProps) {
  const { t, lang } = useLanguage()
  const [showCottonMods, setShowCottonMods] = useState(false)

  if (!visible) return null

  const COTTON_MODIFIERS = [
    { id: 'cotton-white', nameKey: 'cottonWhite' },
    { id: 'cotton-color', nameKey: 'cottonColored' },
  ]

  function handleChipClick(surface: string) {
    if (surface === 'Cotton') {
      setShowCottonMods(!showCottonMods)
      onSurfaceSelect('cotton')
    } else {
      setShowCottonMods(false)
      onSurfaceSelect(surface.toLowerCase())
    }
  }

  function handleCottonMod(id: string) {
    onSurfaceSelect(id)
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1">
        {t('whatSurface')}
      </p>

      <div className="flex flex-wrap gap-2">
        {SURFACE_CHIPS.map((surface) => {
          const isActive =
            selectedSurface === surface.toLowerCase() ||
            (surface === 'Cotton' &&
              (selectedSurface === 'cotton-white' || selectedSurface === 'cotton-color'))
          const isExpanded = surface === 'Cotton' && showCottonMods

          return (
            <button
              key={surface}
              onClick={() => handleChipClick(surface)}
              className={`flex items-center px-3 py-2 rounded-xl min-h-[44px] border text-sm font-medium transition-all active:scale-[0.98] ${
                isActive
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_10px_24px_rgba(16,185,129,0.22)]'
                  : isExpanded
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/12 dark:text-emerald-300 dark:border-emerald-500/30'
                    : 'bg-white text-gray-700 border-gray-200 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 dark:bg-[#0f172a] dark:text-gray-200 dark:border-white/10 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/25'
              }`}
            >
              <span>{getSurfaceLabel(surface, lang as 'en' | 'es')}</span>
            </button>
          )
        })}
      </div>

      {showCottonMods && (
        <div className="flex flex-wrap gap-2 pl-2 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {COTTON_MODIFIERS.map((mod) => {
            const isActive = selectedSurface === mod.id
            return (
              <button
                key={mod.id}
                onClick={() => handleCottonMod(mod.id)}
                className={`px-3 py-1.5 rounded-lg min-h-[44px] border text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_10px_24px_rgba(16,185,129,0.22)]'
                    : 'bg-white text-gray-600 border-gray-200 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 dark:bg-[#0f172a] dark:text-gray-300 dark:border-white/10 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/25'
                }`}
              >
                {t(mod.nameKey)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
