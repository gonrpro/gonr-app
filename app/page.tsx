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
  const resultRef = useRef<HTMLDivElement>(null)

  // Photo enrichment state
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null)
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string>('')
  const [careLabelFile, setCareLabelFile] = useState<File | null>(null)
  const [fabricDescription, setFabricDescription] = useState('')
  const [garmentLocation, setGarmentLocation] = useState('')

  useEffect(() => {
    const count = parseInt(localStorage.getItem('gonr_solve_count') || '0', 10)
    setSolveCount(count)
  }, [])

  useEffect(() => {
    return () => {
      if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl)
    }
  }, [capturedPhotoUrl])

  const incrementSolveCount = useCallback(() => {
    const newCount = solveCount + 1
    setSolveCount(newCount)
    localStorage.setItem('gonr_solve_count', String(newCount))
  }, [solveCount])

  const scrollToResult = useCallback(() => {
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  // Derived: what the solve button will show
  const solveStainLabel = selectedStain || stainInput.trim() || (capturedPhoto ? 'Photo' : '')
  const solveSurfaceLabel = selectedSurface || ''
  const hasSolveInput = !!(capturedPhoto || selectedStain || stainInput.trim())

  // --- Camera: Scan Stain ---
  const handleScanStain = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none'
    document.body.appendChild(input)
    input.addEventListener('change', () => {
      document.body.removeChild(input)
      const file = (input as HTMLInputElement).files?.[0]
      if (!file) return
      setCapturedPhoto(file)
      if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl)
      setCapturedPhotoUrl(URL.createObjectURL(file))
    })
    input.click()
  }, [capturedPhotoUrl])

  // --- Camera: Scan Care Label ---
  const handleScanCareLabel = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none'
    document.body.appendChild(input)
    input.addEventListener('change', () => {
      document.body.removeChild(input)
      const file = (input as HTMLInputElement).files?.[0]
      if (!file) return
      setCareLabelFile(file)
    })
    input.click()
  }, [])

  // --- Retake stain photo ---
  const handleRetakePhoto = useCallback(() => {
    if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl)
    setCapturedPhoto(null)
    setCapturedPhotoUrl('')
  }, [capturedPhotoUrl])

  // --- Remove care label ---
  const handleRemoveCareLabel = useCallback(() => {
    setCareLabelFile(null)
  }, [])

  // --- SOLVE: unified handler ---
  const handleSolve = useCallback(async () => {
    if (!hasSolveInput) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      let res: Response

      if (capturedPhoto) {
        // Image-based solve with enrichment
        const formData = new FormData()
        formData.append('image', capturedPhoto)
        formData.append('lang', lang)
        if (careLabelFile) formData.append('careLabel', careLabelFile)
        if (fabricDescription.trim()) formData.append('fabricDescription', fabricDescription.trim())
        if (garmentLocation.trim()) formData.append('garmentLocation', garmentLocation.trim())
        // If user also typed or selected a stain/surface, pass those as hints
        if (selectedStain || stainInput.trim()) formData.append('stainHint', selectedStain || stainInput.trim())
        if (selectedSurface) formData.append('surfaceHint', selectedSurface)

        res = await fetch('/api/solve', {
          method: 'POST',
          body: formData,
        })
      } else {
        // Text-based solve
        const s = selectedStain || stainInput.trim()
        res = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stain: s, surface: selectedSurface, lang }),
        })
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('solveFailed'))
      }

      const data = await res.json()
      setResult(data)
      incrementSolveCount()
      scrollToResult()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }, [hasSolveInput, capturedPhoto, careLabelFile, fabricDescription, garmentLocation, selectedStain, selectedSurface, stainInput, lang, t, incrementSolveCount, scrollToResult])

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
    handleRetakePhoto()
    setCareLabelFile(null)
    setFabricDescription('')
    setGarmentLocation('')
    setSelectedStain('')
    setSelectedSurface('')
    setStainInput('')
  }

  // --- Result view ---
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

  // --- Build solve subtext ---
  let solveSubtext = ''
  if (solveStainLabel && solveSurfaceLabel) {
    solveSubtext = `${solveStainLabel} on ${solveSurfaceLabel}`
  } else if (solveStainLabel) {
    solveSubtext = solveStainLabel
  }

  return (
    <div className="space-y-4">

      {/* ── SCAN SECTION ── */}
      <div className="flex gap-3">
        {/* Scan Stain — green */}
        {!capturedPhoto ? (
          <button
            onClick={handleScanStain}
            disabled={loading}
            style={{
              background: '#1a2e1a',
              borderRadius: '12px',
              flex: 1,
              minHeight: '70px',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            className="flex flex-col items-center justify-center gap-1 px-3 py-3 hover:opacity-90 active:scale-[0.98]"
          >
            <svg
              width="28"
              height="28"
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
            <span style={{ color: '#22c55e', fontSize: '15px', fontWeight: 600 }}>
              {t('scanStain')}
            </span>
          </button>
        ) : (
          /* Stain photo captured — show thumbnail with retake */
          <div
            style={{
              position: 'relative',
              flex: 1,
              minHeight: '70px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid rgba(34, 197, 94, 0.4)',
            }}
          >
            <img
              src={capturedPhotoUrl}
              alt="Stain photo"
              style={{
                width: '100%',
                height: '70px',
                objectFit: 'cover',
              }}
            />
            <button
              onClick={handleRetakePhoto}
              disabled={loading}
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.9)',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
              aria-label="Retake photo"
            >
              ✕
            </button>
            <div
              style={{
                position: 'absolute',
                bottom: '4px',
                left: '4px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '4px',
                padding: '1px 6px',
                fontSize: '11px',
                color: '#22c55e',
                fontWeight: 600,
              }}
            >
              Stain ✓
            </div>
          </div>
        )}

        {/* Scan Care Label — purple */}
        {!careLabelFile ? (
          <button
            onClick={handleScanCareLabel}
            disabled={loading}
            style={{
              background: '#1e1528',
              borderRadius: '12px',
              flex: 1,
              minHeight: '70px',
              border: '1px solid rgba(147, 51, 234, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            className="flex flex-col items-center justify-center gap-1 px-3 py-3 hover:opacity-90 active:scale-[0.98]"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h5M12 12h5M12 17h5" />
            </svg>
            <span style={{ color: '#a855f7', fontSize: '15px', fontWeight: 600 }}>
              {t('scanCareLabel') || 'Scan Care Label'}
            </span>
          </button>
        ) : (
          /* Care label captured — show indicator with remove */
          <div
            style={{
              position: 'relative',
              flex: 1,
              minHeight: '70px',
              borderRadius: '12px',
              background: '#1e1528',
              border: '1px solid rgba(147, 51, 234, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span style={{ color: '#a855f7', fontSize: '13px', fontWeight: 600 }}>
              {t('careLabelAdded') || 'Care Label ✓'}
            </span>
            <button
              onClick={handleRemoveCareLabel}
              disabled={loading}
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.9)',
                border: 'none',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
              aria-label="Remove care label"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── ENRICHMENT (visible after photo captured) ── */}
      {capturedPhoto && (
        <div className="space-y-2">
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, paddingLeft: '2px' }}>
            {t('addContextOptional') || 'Add more context (optional)'}
          </div>
          <input
            type="text"
            className="input"
            placeholder={t('fabricPlaceholder') || 'e.g. feels silky, stiff denim, stretchy knit, fuzzy wool'}
            value={fabricDescription}
            onChange={(e) => setFabricDescription(e.target.value)}
            disabled={loading}
            style={{ fontSize: '14px' }}
          />
          <input
            type="text"
            className="input"
            placeholder={t('garmentLocationPlaceholder') || 'e.g. collar, underarm, sleeve, chest'}
            value={garmentLocation}
            onChange={(e) => setGarmentLocation(e.target.value)}
            disabled={loading}
            style={{ fontSize: '14px' }}
          />
        </div>
      )}

      {/* ── TEXT INPUT ── */}
      <div>
        <input
          type="text"
          className="input"
          placeholder={t('solvePlaceholder')}
          value={stainInput}
          onChange={(e) => {
            setStainInput(e.target.value)
            if (!e.target.value) setSelectedStain('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hasSolveInput) handleSolve()
          }}
          disabled={loading}
        />
      </div>

      {/* ── OR BROWSE BY ── */}
      <div className="space-y-3">
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500, paddingLeft: '2px' }}>
          {t('orBrowseByType') || 'Or browse by type'}
        </div>
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

      {/* ── SOLVE BUTTON ── */}
      {hasSolveInput && (
        <button
          onClick={handleSolve}
          disabled={loading}
          style={{
            background: '#1a2e1a',
            borderRadius: '12px',
            minHeight: '56px',
            width: '100%',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.15s ease',
            opacity: loading ? 0.7 : 1,
          }}
          className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 hover:opacity-90 active:scale-[0.98]"
        >
          <span style={{ color: '#22c55e', fontSize: '17px', fontWeight: 600 }}>
            {loading ? (t('findingProtocol') || 'Finding protocol...') : (t('solve') || 'Solve →')}
          </span>
          {solveSubtext && !loading && (
            <span style={{ color: '#8a94a6', fontSize: '12px' }}>
              {solveSubtext}
            </span>
          )}
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
