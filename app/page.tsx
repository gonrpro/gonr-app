'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import ResultCard from '@/components/solve/ResultCard'
import StainChips from '@/components/solve/StainChips'
import SurfaceChips from '@/components/solve/SurfaceChips'
import type { ProtocolCard } from '@/lib/types'

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
  const [result, setResult] = useState<SolveResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [solveCount, setSolveCount] = useState(0)
  const [showBrowse, setShowBrowse] = useState(false)
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
        body: JSON.stringify({ stain: s, surface: surf }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Solve failed')
      }

      const data = await res.json()
      setResult(data)

      const newCount = solveCount + 1
      setSolveCount(newCount)
      localStorage.setItem('gonr_solve_count', String(newCount))

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
    setStainInput(stain)
    setResult(null)
  }

  const handleSurfaceSelect = (surface: string) => {
    setSelectedSurface(surface)
  }

  const handleBack = () => {
    setResult(null)
    setError('')
  }

  const handleCameraClick = () => {
    // Camera / scan stain flow — triggers native camera or file picker
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setLoading(true)
      setError('')
      setResult(null)

      try {
        const formData = new FormData()
        formData.append('image', file)

        const res = await fetch('/api/solve', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Scan failed')
        }

        const data = await res.json()
        setResult(data)

        const newCount = solveCount + 1
        setSolveCount(newCount)
        localStorage.setItem('gonr_solve_count', String(newCount))

        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Scan failed')
      } finally {
        setLoading(false)
      }
    }
    input.click()
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
    <div className="space-y-4">
      {/* ── Hero Camera ── */}
      <button
        onClick={handleCameraClick}
        disabled={loading}
        style={{
          background: '#1a2e1a',
          borderRadius: '12px',
          minHeight: '80px',
          width: '100%',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        className="flex flex-col items-center justify-center gap-1 px-4 py-5 hover:opacity-90 active:scale-[0.98]"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
        <span style={{ color: '#22c55e', fontSize: '18px', fontWeight: 600 }}>
          Scan Stain
        </span>
        <span style={{ color: '#8a94a6', fontSize: '13px' }}>
          Point at the stain — AI identifies it instantly
        </span>
      </button>

      {/* ── Text Fallback ── */}
      <div>
        <input
          type="text"
          className="input"
          placeholder="Or describe the stain and material..."
          value={stainInput}
          onChange={(e) => {
            setStainInput(e.target.value)
            if (!e.target.value) setSelectedStain('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSolve()
          }}
        />
      </div>

      {/* ── Care Label Scanner ── */}
      <button
        onClick={() => {
          // Care label scan — same camera flow but for care labels
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'
          input.capture = 'environment'
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            // TODO: wire to care label API endpoint when available
          }
          input.click()
        }}
        className="flex items-center gap-2 w-full text-sm py-2 px-1"
        style={{ color: 'var(--text-secondary)' }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h5M12 12h5M12 17h5" />
        </svg>
        <span>Scan care label for fiber ID</span>
      </button>

      {/* ── Browse Toggle ── */}
      <button
        onClick={() => setShowBrowse(!showBrowse)}
        className="flex items-center gap-1 text-sm py-1"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span>Browse by stain type</span>
        <span>{showBrowse ? '▲' : '▼'}</span>
      </button>

      {showBrowse && (
        <div className="space-y-4">
          <StainChips
            onStainSelect={handleStainSelect}
            selectedStain={selectedStain}
          />
          <SurfaceChips
            onSurfaceSelect={handleSurfaceSelect}
            selectedSurface={selectedSurface}
            visible={!!(selectedStain || stainInput.trim())}
          />
        </div>
      )}

      {/* ── Get Protocol button ── */}
      {(selectedStain || stainInput.trim()) && (
        <button
          className="btn-primary"
          disabled={loading}
          onClick={() => handleSolve()}
        >
          {loading ? 'Finding protocol...' : 'Get Protocol'}
        </button>
      )}

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
