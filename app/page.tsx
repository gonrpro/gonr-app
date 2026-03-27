'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import ResultCard from '@/components/solve/ResultCard'
import StainChips from '@/components/solve/StainChips'
import SurfaceChips from '@/components/solve/SurfaceChips'
import PaywallModal from '@/components/paywall/PaywallModal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { initializeTrialState, getTrialState, isTrialExpired, getRemainingText } from '@/lib/auth/trialGuard'
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
  const [showBrowse, setShowBrowse] = useState(false)
  const [result, setResult] = useState<SolveResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [solveCount, setSolveCount] = useState(0)
  const resultRef = useRef<HTMLDivElement>(null)

  // Trial state
  const [showPaywall, setShowPaywall] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState(7)
  const [userTier, setUserTier] = useState<'free' | 'home' | 'spotter' | 'operator' | 'founder'>('free')

  // Photo enrichment state
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null)
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string>('')
  const [careLabelFile, setCareLabelFile] = useState<File | null>(null)
  const [fabricDescription, setFabricDescription] = useState('')
  const [garmentLocation, setGarmentLocation] = useState('')

  useEffect(() => {
    // Initialize trial state
    initializeTrialState()
    const count = parseInt(localStorage.getItem('gonr_solve_count') || '0', 10)
    setSolveCount(count)

    // Load trial state
    const trial = getTrialState()
    setDaysRemaining(trial.daysRemaining)
    setUserTier(trial.tier)
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
  const photoLabel = capturedPhoto
    ? (careLabelFile ? t('photoAndCareLabel') || 'Photo + Care Label' : t('photoOnly') || 'Photo')
    : ''
  const solveStainLabel = selectedStain || stainInput.trim() || photoLabel
  const solveSurfaceLabel = selectedSurface || ''
  const hasSolveInput = !!(capturedPhoto || selectedStain || stainInput.trim())

  // --- Photo: Scan Stain (camera or library) ---
  const handleScanStain = useCallback((useCamera = true) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    if (useCamera) input.capture = 'environment'
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

  // --- Photo: Scan Care Label (camera or library) ---
  const handleScanCareLabel = useCallback((useCamera = true) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    if (useCamera) input.capture = 'environment'
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

    // Check trial gate for free users
    if (isTrialExpired()) {
      setShowPaywall(true)
      return
    }

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

      // Refresh trial state after solve
      if (userTier === 'free') {
        const newTrial = getTrialState()
        setDaysRemaining(newTrial.daysRemaining)

        // If trial just expired, show paywall after result
        if (newTrial.expired) {
          setTimeout(() => setShowPaywall(true), 1500)
        }
      }

      scrollToResult()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }, [hasSolveInput, capturedPhoto, careLabelFile, fabricDescription, garmentLocation, selectedStain, selectedSurface, stainInput, lang, t, incrementSolveCount, scrollToResult, userTier, daysRemaining])

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

      {/* ── Hero Copy ── */}
      <div style={{ paddingTop: '12px', paddingBottom: '4px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1, color: 'var(--text)', margin: 0, marginBottom: '6px' }}>
          {t('masterSpotter')}
        </h1>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#22c55e', textTransform: 'uppercase', marginBottom: '4px' }}>
          {t('aiStainIntelligence')}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {t('poweredBy')} <span style={{ fontWeight: 600 }}>Stain Brain</span>
        </p>
      </div>

      {/* ── SCAN SECTION ── */}
      <div className="flex gap-3">
        {/* Scan Stain — green */}
        {!capturedPhoto ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => handleScanStain(true)}
              disabled={loading}
              style={{
                background: 'rgba(34,197,94,0.08)',
                borderRadius: '12px',
                flex: 1,
                minHeight: '100px',
                border: '1.5px solid rgba(34,197,94,0.35)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                width: '100%',
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 hover:opacity-90 active:scale-[0.98]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>{t('scanStain')}</span>
            </button>
            <button
              onClick={() => handleScanStain(false)}
              disabled={loading}
              style={{
                background: 'rgba(34,197,94,0.04)',
                borderRadius: '10px',
                minHeight: '36px',
                border: '1px dashed rgba(34,197,94,0.3)',
                cursor: 'pointer',
                width: '100%',
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 hover:opacity-80 active:scale-[0.98]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: 500 }}>{t('uploadPhoto') || 'Upload photo'}</span>
            </button>
          </div>
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
              {t('stainCaptured') || 'Stain ✓'}
            </div>
          </div>
        )}

        {/* Scan Care Label — light blue */}
        {!careLabelFile ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => handleScanCareLabel(true)}
              disabled={loading}
              style={{
                background: 'rgba(56,189,248,0.08)',
                borderRadius: '12px',
                minHeight: '100px',
                border: '1.5px solid rgba(56,189,248,0.35)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                width: '100%',
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 hover:opacity-90 active:scale-[0.98]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h5M12 12h5M12 17h5" />
              </svg>
              <span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 600 }}>{t('scanCareLabel')}</span>
            </button>
            <button
              onClick={() => handleScanCareLabel(false)}
              disabled={loading}
              style={{
                background: 'rgba(56,189,248,0.04)',
                borderRadius: '10px',
                minHeight: '36px',
                border: '1px dashed rgba(56,189,248,0.3)',
                cursor: 'pointer',
                width: '100%',
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 hover:opacity-80 active:scale-[0.98]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 500 }}>{t('uploadPhoto') || 'Upload photo'}</span>
            </button>
          </div>
        ) : (
          /* Care label captured — show indicator with remove */
          <div
            style={{
              position: 'relative',
              flex: 1,
              minHeight: '70px',
              borderRadius: '12px',
              background: 'rgba(56,189,248,0.08)',
              border: '1px solid rgba(56,189,248,0.4)',
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
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 600 }}>
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

      {/* ── QUICK ACTIONS ── */}
      <div className="flex gap-3">
        <a
          href="/handoff"
          className="flex items-center justify-center gap-2 px-3 py-3 hover:opacity-90 active:scale-[0.98] transition-all"
          style={{
            background: 'rgba(234,179,8,0.08)',
            borderRadius: '12px',
            flex: 1,
            minHeight: '80px',
            border: '1.5px solid rgba(234,179,8,0.35)',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span style={{ color: '#ca8a04', fontSize: '14px', fontWeight: 600 }}>{t('customerHandoff') || 'Handoff'}</span>
        </a>
        <a
          href="/spotter?tool=stain_brain"
          className="flex items-center justify-center gap-2 px-3 py-3 hover:opacity-90 active:scale-[0.98] transition-all"
          style={{
            background: 'rgba(147,51,234,0.08)',
            borderRadius: '12px',
            flex: 1,
            minHeight: '80px',
            border: '1.5px solid rgba(147,51,234,0.35)',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
          </svg>
          <span style={{ color: '#9333ea', fontSize: '14px', fontWeight: 600 }}>{t('stainBrain') || 'Stain Brain'}</span>
        </a>
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
      <button
        onClick={() => setShowBrowse(!showBrowse)}
        className="flex items-center gap-1 text-sm py-1"
        style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', paddingLeft: '2px' }}
      >
        <span>{t('orBrowseByType') || 'Or browse by type'}</span>
        <span style={{ fontSize: '10px' }}>{showBrowse ? '▲' : '▼'}</span>
      </button>

      {showBrowse && (
        <div className="space-y-3">
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

      {/* ── ANALYZE BUTTON — always visible, gray until input ── */}
      <button
        onClick={handleSolve}
        disabled={!hasSolveInput || loading}
        style={{
          background: hasSolveInput ? 'rgba(34,197,94,0.08)' : 'transparent',
          borderRadius: '12px',
          minHeight: '56px',
          width: '100%',
          border: `1.5px solid ${hasSolveInput ? 'rgba(34,197,94,0.4)' : 'rgba(150,150,150,0.25)'}`,
          cursor: hasSolveInput && !loading ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          opacity: loading ? 0.7 : 1,
        }}
        className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 active:scale-[0.98]"
      >
        <span style={{
          color: hasSolveInput ? '#22c55e' : 'var(--text-secondary)',
          fontSize: '17px',
          fontWeight: 700,
          transition: 'color 0.2s ease',
        }}>
          {loading ? (t('findingProtocol') || 'Analyzing…') : `${t('analyzeGarment')} →`}
        </span>
        {solveSubtext && !loading && hasSolveInput && (
          <span style={{ color: '#8a94a6', fontSize: '12px' }}>
            {solveSubtext}
          </span>
        )}
      </button>

      {/* Trial days remaining badge — show last 3 days only */}
      {userTier === 'free' && daysRemaining <= 3 && daysRemaining > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '8px 12px',
          background: 'rgba(34, 197, 94, 0.08)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#22c55e',
          fontWeight: 500,
        }}>
          {getRemainingText()}
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

      {/* Paywall modal */}
      <PaywallModal
        open={showPaywall}
        onDismiss={() => setShowPaywall(false)}
      />
    </div>
  )
}
