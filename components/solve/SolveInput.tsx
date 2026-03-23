'use client'

import { useState, useRef, useEffect } from 'react'

interface SolveInputProps {
  onSolve: (input: string) => void
  onSuggest?: (query: string) => void
}

export default function SolveInput({ onSolve, onSuggest }: SolveInputProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(value: string) {
    setQuery(value)

    // Debounce suggestion fetching
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length >= 2) {
      debounceRef.current = setTimeout(() => {
        onSuggest?.(value)
        // Generate local suggestions based on common stain+surface combos
        const localSuggestions = generateSuggestions(value)
        setSuggestions(localSuggestions)
        setShowSuggestions(localSuggestions.length > 0)
      }, 200)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  function handleSuggestionClick(suggestion: string) {
    setQuery(suggestion)
    setShowSuggestions(false)
    onSolve(suggestion)
  }

  function handleSubmit() {
    if (query.length >= 3) {
      setShowSuggestions(false)
      onSolve(query)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <div className="relative w-full">
      {/* Input row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="e.g. red wine on silk"
            className="w-full min-h-[44px] rounded-lg bg-white dark:bg-[#0e131b]
              border border-gray-200 dark:border-white/10
              text-sm text-gray-800 dark:text-gray-200 pl-4 pr-12
              focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50
              placeholder:text-gray-400 dark:placeholder:text-gray-600
              transition-colors"
          />

          {/* Camera button */}
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px]
              flex items-center justify-center rounded-md
              text-gray-400 hover:text-green-500 transition-colors"
            aria-label="Scan with camera"
          >
            {'\uD83D\uDCF7'}
          </button>
        </div>
      </div>

      {/* Get Protocol button (appears at 3+ chars) */}
      {query.length >= 3 && (
        <button
          onClick={handleSubmit}
          className="w-full mt-2 min-h-[44px] rounded-lg bg-green-500 hover:bg-green-600
            text-white text-sm font-semibold transition-colors
            animate-in fade-in slide-in-from-bottom-1 duration-150"
        >
          Get Protocol
        </button>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50
          bg-white dark:bg-[#0e131b] border border-gray-200 dark:border-white/10
          rounded-lg shadow-lg overflow-hidden
          animate-in fade-in slide-in-from-top-1 duration-100">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(s)}
              className="w-full text-left px-4 py-3 text-sm
                text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-white/5 transition-colors
                border-b border-gray-100 dark:border-white/5 last:border-b-0"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Local suggestion generator ────────────── */

const COMMON_STAINS = [
  'red wine', 'coffee', 'blood', 'grass', 'grease', 'ink',
  'chocolate', 'mustard', 'tomato sauce', 'lipstick', 'foundation',
  'pet urine', 'sweat', 'deodorant', 'rust', 'mildew', 'beer',
  'curry', 'berries', 'candle wax', 'mud', 'marker',
]

const COMMON_SURFACES = [
  'cotton', 'silk', 'wool', 'polyester', 'linen', 'leather',
  'denim', 'suede', 'upholstery', 'cashmere', 'nylon', 'rayon',
]

function generateSuggestions(query: string): string[] {
  const q = query.toLowerCase().trim()
  const results: string[] = []

  // Match stain names
  for (const stain of COMMON_STAINS) {
    if (stain.includes(q)) {
      // Suggest stain + top surfaces
      for (const surface of COMMON_SURFACES.slice(0, 3)) {
        results.push(`${stain} on ${surface}`)
      }
    }
  }

  // Match surface names
  for (const surface of COMMON_SURFACES) {
    if (surface.includes(q)) {
      for (const stain of COMMON_STAINS.slice(0, 3)) {
        const combo = `${stain} on ${surface}`
        if (!results.includes(combo)) results.push(combo)
      }
    }
  }

  // Match "stain on surface" patterns
  if (q.includes(' on ')) {
    const [stainQ, surfaceQ] = q.split(' on ').map((s) => s.trim())
    for (const stain of COMMON_STAINS) {
      if (stain.includes(stainQ)) {
        for (const surface of COMMON_SURFACES) {
          if (surface.includes(surfaceQ || '')) {
            const combo = `${stain} on ${surface}`
            if (!results.includes(combo)) results.push(combo)
          }
        }
      }
    }
  }

  return results.slice(0, 6)
}
