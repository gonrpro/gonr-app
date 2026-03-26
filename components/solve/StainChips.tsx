'use client'

import { useState } from 'react'
import { STAIN_CHIPS } from '@/lib/protocols/chips'

interface StainChipsProps {
  onStainSelect: (stain: string) => void
  selectedStain: string
}

export default function StainChips({ onStainSelect, selectedStain }: StainChipsProps) {
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null)

  function handleFamilyClick(name: string) {
    const chip = STAIN_CHIPS.find((c) => c.name === name)
    if (chip && chip.subs.length === 0) {
      // No subs — select the family name directly
      onStainSelect(name)
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
        What stain?
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl min-h-[44px]
                text-sm font-medium transition-all
                ${
                  isExpanded || isSelected
                    ? 'bg-green-500/20 text-green-400 ring-2 ring-green-500/50 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                    : 'bg-[#0e131b] dark:bg-[#0e131b] bg-gray-100 text-gray-300 dark:text-gray-300 text-gray-700 hover:bg-[#161d28]'
                }`}
            >
              <span className="text-base">{chip.emoji}</span>
              <span>{chip.name}</span>
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
                className={`px-3 py-1.5 rounded-lg min-h-[44px] text-sm font-medium transition-all
                  ${
                    isActive
                      ? 'bg-green-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.35)]'
                      : 'bg-[#0e131b] dark:bg-[#0e131b] bg-gray-100 text-gray-400 dark:text-gray-400 text-gray-600 hover:text-white hover:bg-[#161d28]'
                  }`}
              >
                {sub}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
