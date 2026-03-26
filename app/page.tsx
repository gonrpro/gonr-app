'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import ResultCard from '@/components/solve/ResultCard'
import StainChips from '@/components/solve/StainChips'
import SurfaceChips from '@/components/solve/SurfaceChips'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { ProtocolCard } from '@/lib/types'

interface SolveResult {
  card: ProtocolCard
  tier: number
  confidence: number
  source: 'verified' | 'ai'
}

export default function SolvePage() {
  const { t, lang } = useLanguage()
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
        body: JSON.stringify({ stain: s, surface: surf, lang }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('solveFailed'))
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
      setError(err instanceof Error ? err.message : t('somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }, [selectedStain, selectedSurface, stainInput, solveCount, lang, t])

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
        formData.append('lang', lang)

        const res = await fetch('/api/solve', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || t('scanFailed'))
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
        setError(err instanceof Error ? err.message : t('scanFailed'))
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
          {t('backToSearch')}
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

      {/* ── Hero Title ── */}
      <div style={{ textAlign: 'center', paddingBottom: '4px', paddingTop: '8px' }}>
        <p style={{ fontSize: '10px', fontWeight: 600, color: '#22c55e', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
          AI Stain Intelligence for Textiles
        </p>
        <h1 style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1, margin: '0 0 6px 0' }}>
          Master Spotter
        </h1>
        <p style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '0.3px', margin: 0 }}>
          Powered by <a href="/pro" style={{ color: '#a855f7', fontWeight: 600, textDecoration: 'none' }}>Stain Brain Engine</a>
        </p>
      </div>

      {/* ── Hero Camera ── */}
      <button
        onClick={handleCameraClick}
        disabled={loading}
        className="scan-hero-btn flex flex-col items-center justify-center gap-2 px-4 active:scale-[0.97]"
        style={{ width: '100%', borderRadius: '20px', minHeight: '120px', cursor: 'pointer', transition: 'all 0.12s ease', position: 'relative', overflow: 'hidden', border: 'none', paddingTop: '28px', paddingBottom: '20px' }}
      >
        {/* radial glow behind icon */}
        <div className="scan-hero-glow" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -60%)',
          width: '140px', height: '140px',
          pointerEvents: 'none',
        }} />
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="scan-hero-icon">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
        <div style={{ textAlign: 'center' }}>
          <div className="scan-hero-label" style={{ fontSize: '14px', fontWeight: 600 }}>
            {t('scanStain')}
          </div>
          <div className="scan-hero-sub" style={{ fontSize: '11px', marginTop: '2px' }}>
            {t('scanStainSubtext')}
          </div>
        </div>
      </button>

      {/* ── Text Fallback + Solve button ── */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1 }}
          placeholder={t('solvePlaceholder')}
          value={stainInput}
          onChange={(e) => {
            setStainInput(e.target.value)
            if (!e.target.value) setSelectedStain('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSolve()
          }}
        />
        {(stainInput.trim().length >= 2 || selectedStain) && (
          <button
            onClick={() => handleSolve()}
            disabled={loading}
            className="solve-btn hover:opacity-90 active:scale-[0.96]"
            style={{
              borderRadius: '999px',
              padding: '0 20px',
              height: '42px',
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {t('solveBtn')}
          </button>
        )}
      </div>

      {/* ── Care Label Scanner ── */}
      <button
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'
          input.capture = 'environment'
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
          }
          input.click()
        }}
        style={{
          width: '100%',
          borderRadius: '10px',
          border: '1.5px solid rgba(168, 85, 247, 0.5)',
          background: 'rgba(168, 85, 247, 0.06)',
          padding: '10px 14px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
        className="hover:opacity-90 active:scale-[0.98]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h5M12 12h5M12 17h5" />
        </svg>
        <div style={{ textAlign: 'left' }}>
          <div style={{ color: '#a855f7', fontSize: '14px', fontWeight: 600 }}>{t('scanCareLabel')}</div>
          <div style={{ color: '#8a94a6', fontSize: '12px' }}>{t('careLabelSubtext')}</div>
        </div>
      </button>

      {/* ── Browse Toggle ── */}
      <button
        onClick={() => setShowBrowse(!showBrowse)}
        className="flex items-center gap-1 text-sm py-1"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span>{t('orBrowseByType')}</span>
        <span>{showBrowse ? '▲' : '▼'}</span>
      </button>

      {showBrowse && (
        <div className="space-y-4">
          <StainChips onStainSelect={handleStainSelect} selectedStain={selectedStain} />
          <SurfaceChips onSurfaceSelect={handleSurfaceSelect} selectedSurface={selectedSurface} visible={!!(selectedStain || stainInput.trim())} />
        </div>
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
