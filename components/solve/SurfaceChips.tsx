'use client'

import { useState } from 'react'
import { SURFACE_CHIPS } from '@/lib/protocols/chips'

const SURFACE_EMOJIS: Record<string, string> = {
  Cotton: '\uD83E\uDDF5',
  Polyester: '\uD83E\uDDF6',
  Silk: '\uD83E\uDD4A',
  Wool: '\uD83D\uDC11',
  Cashmere: '\u2728',
  Linen: '\uD83C\uDF3E',
  Rayon: '\uD83C\uDF00',
  Nylon: '\uD83E\uDDF1',
  Leather: '\uD83D\uDC5C',
  Denim: '\uD83D\uDC56',
  Suede: '\uD83E\uDDE4',
  Upholstery: '\uD83D\uDECB\uFE0F',
}

const COTTON_MODIFIERS = [
  { id: 'cotton-white', name: 'White / Light' },
  { id: 'cotton-color', name: 'Colored / Dark' },
]

interface SurfaceChipsProps {
  onSurfaceSelect: (surface: string) => void
  selectedSurface: string
  visible: boolean
}

export default function SurfaceChips({ onSurfaceSelect, selectedSurface, visible }: SurfaceChipsProps) {
  const [showCottonMods, setShowCottonMods] = useState(false)

  if (!visible) return null

  function handleChipClick(surface: string) {
    if (surface === 'Cotton') {
      setShowCottonMods(!showCottonMods)
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
        What surface?
      </p>

      <div className="flex flex-wrap gap-2">
        {SURFACE_CHIPS.map((surface) => {
          const emoji = SURFACE_EMOJIS[surface] || ''
          const isActive =
            selectedSurface === surface.toLowerCase() ||
            (surface === 'Cotton' &&
              (selectedSurface === 'cotton-white' || selectedSurface === 'cotton-color'))
          const isExpanded = surface === 'Cotton' && showCottonMods

          return (
            <button
              key={surface}
              onClick={() => handleChipClick(surface)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl min-h-[44px]
                text-sm font-medium transition-all
                ${
                  isActive || isExpanded
                    ? 'bg-green-500/20 text-green-400 ring-2 ring-green-500/50 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                    : 'bg-[#0e131b] dark:bg-[#0e131b] bg-gray-100 text-gray-300 dark:text-gray-300 text-gray-700 hover:bg-[#161d28]'
                }`}
            >
              <span className="text-base">{emoji}</span>
              <span>{surface}</span>
            </button>
          )
        })}
      </div>

      {/* Cotton color modifier */}
      {showCottonMods && (
        <div className="flex flex-wrap gap-2 pl-2 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {COTTON_MODIFIERS.map((mod) => {
            const isActive = selectedSurface === mod.id
            return (
              <button
                key={mod.id}
                onClick={() => handleCottonMod(mod.id)}
                className={`px-3 py-1.5 rounded-lg min-h-[44px] text-sm font-medium transition-all
                  ${
                    isActive
                      ? 'bg-green-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.35)]'
                      : 'bg-[#0e131b] dark:bg-[#0e131b] bg-gray-100 text-gray-400 dark:text-gray-400 text-gray-600 hover:text-white hover:bg-[#161d28]'
                  }`}
              >
                {mod.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
