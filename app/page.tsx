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
    // iOS Safari requires input to be in the DOM before click
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none'
    document.body.appendChild(input)

    const cleanup = () => { if (document.body.contains(input)) document.body.removeChild(input) }

    input.addEventListener('change', async () => {
      cleanup()
      const file = input.files?.[0]
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
    })

    // iOS cancel fallback — clean up if user dismisses camera
    const handleFocus = () => {
      setTimeout(() => { if (!input.files?.length) cleanup(); window.removeEventListener('focus', handleFocus) }, 500)
    }
    window.addEventListener('focus', handleFocus)
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
          Powered by <a href="/pro" style={{ color: '#a855f7', fontWeight: 600, textDecoration: 'none' }}>Stain Brain</a>
        </p>
      </div>

      {/* ── Hero Camera ── */}
      <button
        onClick={handleCameraClick}
        disabled={loading}
        className="scan-hero-btn active:scale-[0.98]"
        style={{
          width: '100%',
          borderRadius: '16px',
          minHeight: '90px',
          cursor: 'pointer',
          transition: 'all 0.12s ease',
          position: 'relative',
          overflow: 'hidden',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '18px',
        }}
      >
        {/* gold top stripe */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px',
          background: 'linear-gradient(90deg, transparent, #d4a853, transparent)',
          borderRadius: '999px',
        }} />
        {/* icon left-aligned */}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="scan-hero-icon" style={{ flexShrink: 0 }}>
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
        {/* text left-aligned */}
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div className="scan-hero-label" style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>
            {t('scanStain')}
          </div>
          <div className="scan-hero-sub" style={{ fontSize: '12px', marginTop: '3px' }}>
            {t('scanStainSubtext')}
          </div>
        </div>
        {/* arrow right */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="scan-hero-label" style={{ flexShrink: 0, opacity: 0.5 }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
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
          borderRadius: '16px',
          border: '1.5px solid rgba(168, 85, 247, 0.45)',
          background: 'rgba(168, 85, 247, 0.05)',
          padding: '0 24px',
          minHeight: '70px',
          cursor: 'pointer',
          transition: 'all 0.12s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="hover:opacity-90 active:scale-[0.98]"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h5M12 12h5M12 17h5" />
        </svg>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ color: '#a855f7', fontSize: '15px', fontWeight: 600 }}>{t('scanCareLabel')}</div>
          <div style={{ color: '#8a94a6', fontSize: '12px', marginTop: '2px' }}>{t('careLabelSubtext')}</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.4 }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
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
          {selectedStain && (
            <button
              onClick={() => handleSolve(selectedStain, selectedSurface)}
              disabled={loading}
              className="solve-btn w-full hover:opacity-90 active:scale-[0.96]"
              style={{ marginTop: '4px' }}
            >
              {t('solveBtn')}
            </button>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="card flex flex-col items-center justify-center py-10 gap-4" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
          {/* spinner */}
          <div style={{
            width: '36px', height: '36px',
            border: '3px solid rgba(34,197,94,0.15)',
            borderTop: '3px solid #22c55e',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>
              Analyzing stain…
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Stain Brain is on it
            </p>
          </div>
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
