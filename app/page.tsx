'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import ResultCard from '@/components/solve/ResultCard'
import StainCamera from '@/components/solve/StainCamera'
import CareLabelScanner from '@/components/solve/CareLabelScanner'
import FiberChips from '@/components/solve/FiberChips'
import type { ProtocolCard } from '@/lib/types'

const STAIN_FAMILIES = [
  { id: 'protein', label: 'Protein', emoji: '🥩', stains: ['blood', 'egg', 'milk', 'sweat', 'urine', 'vomit', 'grass'] },
  { id: 'tannin', label: 'Tannin', emoji: '🍷', stains: ['red-wine', 'coffee-black', 'tea', 'beer'] },
  { id: 'oil-grease', label: 'Oil & Grease', emoji: '🛢️', stains: ['cooking-oil', 'butter', 'motor-oil', 'lipstick', 'foundation'] },
  { id: 'dye', label: 'Dye', emoji: '🎨', stains: ['hair-dye', 'food-coloring', 'permanent-marker', 'ballpoint-pen'] },
  { id: 'oxidizable', label: 'Oxidizable', emoji: '🧪', stains: ['rust', 'mustard', 'curry', 'tomato-sauce'] },
  { id: 'combination', label: 'Combo', emoji: '🔀', stains: ['chocolate', 'coffee-with-cream', 'nail-polish'] },
  { id: 'particulate', label: 'Particulate', emoji: '💨', stains: ['mildew', 'collar-ring'] },
  { id: 'wax-gum', label: 'Wax & Gum', emoji: '🕯️', stains: ['candle-wax', 'crayon'] },
  { id: 'bleach-damage', label: 'Bleach', emoji: '⚠️', stains: ['bleach'] },
  { id: 'adhesive', label: 'Adhesive', emoji: '🩹', stains: ['adhesive', 'nail-polish'] },
  { id: 'pigment', label: 'Pigment', emoji: '🖌️', stains: ['acrylic-paint', 'mascara'] },
  { id: 'unknown', label: 'Unknown', emoji: '❓', stains: [] },
]

const SURFACES = [
  'cotton-white', 'cotton-color', 'silk', 'wool', 'linen',
  'polyester', 'denim', 'leather', 'suede', 'nylon',
]

function formatLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface SolveResult {
  card: ProtocolCard
  tier: number
  confidence: number
  source: 'verified' | 'ai'
}

export default function SolvePage() {
  const [stainInput, setStainInput] = useState('')
  const [selectedStain, setSelectedStain] = useState('')
  const [selectedSurface, setSelectedSurface] = useState('')
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null)
  const [result, setResult] = useState<SolveResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [solveCount, setSolveCount] = useState(0)
  const [selectedFiber, setSelectedFiber] = useState<string | null>(null)
  const [fiberSource, setFiberSource] = useState<'label' | 'chips' | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const count = parseInt(localStorage.getItem('gonr_solve_count') || '0', 10)
    setSolveCount(count)
  }, [])

  const handleSolve = useCallback(async (stain?: string, surface?: string) => {
    const s = stain || selectedStain || stainInput.trim()
    const surf = surface || selectedSurface
    if (!s) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stain: s, surface: surf, fiber: selectedFiber || undefined }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Solve failed')
      }

      const data = await res.json()
      setResult(data)

      // Track solve count
      const newCount = solveCount + 1
      setSolveCount(newCount)
      localStorage.setItem('gonr_solve_count', String(newCount))

      // Scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [selectedStain, selectedSurface, stainInput, solveCount])

  const handleStainSelect = (stain: string) => {
    setSelectedStain(stain)
    setStainInput(formatLabel(stain))
    setResult(null)
  }

  const handleBack = () => {
    setResult(null)
    setError('')
  }

  // Result view
  if (result) {
    return (
      <div ref={resultRef}>
        <button
          onClick={handleBack}
          className="flex items-center gap-1 mb-4 text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← Back to search
        </button>
        <ResultCard
          card={result.card}
          source={result.source}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">What&apos;s the stain?</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Select or type your stain and surface for an expert protocol.
        </p>
      </div>

      {/* Intake cameras */}
      <div className="flex gap-3 flex-wrap">
        <StainCamera
          onStainDetected={(family, suggestion) => {
            setStainInput(suggestion)
            setSelectedStain(family)
          }}
          onReset={() => {
            setStainInput('')
            setSelectedStain('')
          }}
        />
        <CareLabelScanner
          onFiberDetected={(fiber) => {
            setSelectedFiber(fiber)
            setFiberSource('label')
          }}
          onReset={() => {
            setSelectedFiber(null)
            setFiberSource(null)
          }}
        />
      </div>

      {/* Fiber section */}
      {fiberSource === 'label' && selectedFiber && (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <span>🏷️</span>
          <span className="capitalize font-medium">{selectedFiber}</span>
          <button onClick={() => { setSelectedFiber(null); setFiberSource(null) }} className="text-gray-500 text-xs ml-1">change</button>
        </div>
      )}
      {fiberSource !== 'label' && (
        <FiberChips
          selectedFiber={selectedFiber}
          onFiberSelect={(f) => { setSelectedFiber(f); setFiberSource('chips') }}
        />
      )}

      {/* Text input */}
      <input
        type="text"
        className="input"
        placeholder="e.g. red wine, blood, coffee..."
        value={stainInput}
        onChange={(e) => {
          setStainInput(e.target.value)
          if (!e.target.value) setSelectedStain('')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSolve()
        }}
      />

      {/* Stain family chips */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
          Stain Families
        </p>
        <div className="flex flex-wrap gap-2">
          {STAIN_FAMILIES.map((fam) => (
            <div key={fam.id}>
              <button
                className={`chip ${expandedFamily === fam.id ? 'selected' : ''}`}
                onClick={() => {
                  setExpandedFamily(expandedFamily === fam.id ? null : fam.id)
                }}
              >
                <span>{fam.emoji}</span>
                <span>{fam.label}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Expanded sub-stains */}
        {expandedFamily && (
          <div className="mt-3 flex flex-wrap gap-2">
            {STAIN_FAMILIES.find(f => f.id === expandedFamily)?.stains.map((stain) => (
              <button
                key={stain}
                className={`chip text-xs ${selectedStain === stain ? 'selected' : ''}`}
                onClick={() => handleStainSelect(stain)}
              >
                {formatLabel(stain)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Surface chips — show after stain selected */}
      {(selectedStain || stainInput.trim()) && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
            Surface / Fabric
          </p>
          <div className="flex flex-wrap gap-2">
            {SURFACES.map((surface) => (
              <button
                key={surface}
                className={`chip text-xs ${selectedSurface === surface ? 'selected' : ''}`}
                onClick={() => setSelectedSurface(selectedSurface === surface ? '' : surface)}
              >
                {formatLabel(surface)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Get Protocol button */}
      <button
        className="btn-primary"
        disabled={loading || (!selectedStain && !stainInput.trim())}
        onClick={() => handleSolve()}
      >
        {loading ? 'Finding protocol...' : 'Get Protocol'}
      </button>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton h-32 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      )}
    </div>
  )
}
