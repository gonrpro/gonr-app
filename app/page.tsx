'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ResultCard from '@/components/solve/ResultCard'
import DisambiguationPrompt from '@/components/solve/DisambiguationPrompt'
import DisclosureRenderedBeacon from '@/components/solve/DisclosureRenderedBeacon'
import type { DisambiguationPrompt as DisambiguationPromptType } from '@/lib/protocols/ambiguity'
import SolveLoadingSkeleton from '@/components/solve/SolveLoadingSkeleton'
import StainChips from '@/components/solve/StainChips'
import SurfaceChips from '@/components/solve/SurfaceChips'
import PaywallModal from '@/components/paywall/PaywallModal'
import LanguageToggle from '@/components/protocols/LanguageToggle'
import LoginGateModal from '@/components/auth/LoginGateModal'
import ResultTierUpsell from '@/components/solve/ResultTierUpsell'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useOptionalAuth } from '@/lib/auth/AuthContext'
import { canAccessFeature } from '@/lib/auth/features'
import { fetchUsageState, getRemainingTextFromState, type UsageState } from '@/lib/auth/trialGuard'
import type { ProtocolCard } from '@/lib/types'
import { getStainLabel, getSurfaceLabel } from '@/lib/protocols/chips'
import { BookOpen, Clock, ShieldCheck } from 'lucide-react'

interface SolveResult {
  card: ProtocolCard | null
  tier: number
  confidence: number
  source: 'verified' | 'ai' | 'no-verified-protocol' | 'ai-unavailable' | 'library-safety-blocked'
  correlationId?: string
  viewerTier?: 'free' | 'home' | 'spotter' | 'operator' | 'founder' | 'anon'
  /** Spotter/Operator-only gate response — library missed, AI disabled for pros. */
  noVerifiedProtocol?: boolean
  message?: string
  stainType?: string | null
  /** TASK-056 — disclosure banner when the user consented to a general baseline
   *  via the Unknown option in a disambiguation flow. */
  ai_fallback_disclosure?: {
    label: string
    body: string
  }
}

/** TASK-056 — returned by /api/solve instead of a card when the input is
 *  ambiguous and the viewer is Pro-tier. Client shows the picker instead of
 *  a result, re-solves on pick with the refined_stain. */
interface DisambiguationResponse {
  disambiguation_prompt: DisambiguationPromptType
  original_query: { stain: string; surface: string }
  correlationId?: string
  viewerTier?: string
}

function SolvePageInner() {
  const { t, lang } = useLanguage()
  const { user, tier: authTier, isLoading: authLoading } = useOptionalAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false)
  const [stainInput, setStainInput] = useState('')
  const [selectedStain, setSelectedStain] = useState('')
  const [selectedSurface, setSelectedSurface] = useState('')
  const [showBrowse, setShowBrowse] = useState(false)
  const [result, setResult] = useState<SolveResult | null>(null)
  const [disambiguation, setDisambiguation] = useState<DisambiguationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [solveCount, setSolveCount] = useState(0)
  const resultRef = useRef<HTMLDivElement>(null)

  // Trial state
  const [showPaywall, setShowPaywall] = useState(false)
  const [showPaywallReason, setShowPaywallReason] = useState<'trial_expired' | 'anon_limit'>('trial_expired')
  const [usageState, setUsageState] = useState<UsageState | null>(null)
  const [userTier, setUserTier] = useState<'free' | 'home' | 'spotter' | 'operator' | 'founder'>('free')
  const solvesRemaining = usageState?.solvesRemaining ?? 3

  // Translation state for solve result
  const [translatedCard, setTranslatedCard] = useState<any>(null)
  const [showTranslated, setShowTranslated] = useState(false)

  const translateProtocolCard = useCallback(async (protocolJson: any, targetLang: 'en' | 'es') => {
    if (targetLang !== 'es') return null
    const res = await fetch('/api/protocols/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolJson, targetLang }),
    })
    const data = await res.json()
    return res.ok && data.translated ? data.translated : null
  }, [])

  // Login gate state
  const [showLoginGate, setShowLoginGate] = useState(false)
  // TASK-065: auto-restore-and-solve after magic-link return
  const [shouldAutoSolve, setShouldAutoSolve] = useState(false)

  // Photo enrichment state
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null)
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string>('')
  const [careLabelFile, setCareLabelFile] = useState<File | null>(null)
  const [fabricDescription, setFabricDescription] = useState('')
  const [garmentLocation, setGarmentLocation] = useState('')

  // ?upgraded=true — post-purchase redirect handler
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      setShowUpgradeBanner(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('upgraded')
      router.replace(url.pathname + url.search, { scroll: false })
      // TASK-033 P0-3: /api/auth/tier is session-only (TASK-032). POST with no
      // body; server reads email from the session cookie. Previous code read
      // email from localStorage and sent it in the body, which the server
      // now ignores — dead code that would mislead future readers.
      fetch('/api/auth/tier', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data.tier && data.tier !== 'free') {
            localStorage.setItem('gonr_user_tier', data.tier)
          }
        })
        .catch(() => {})
      setTimeout(() => setShowUpgradeBanner(false), 6000)
    }
  }, [searchParams, router])

  useEffect(() => {
    const count = parseInt(localStorage.getItem('gonr_solve_count') || '0', 10)
    setSolveCount(count)

    // Pull live usage from server (no more localStorage trial guesses).
    fetchUsageState().then(setUsageState).catch(() => setUsageState(null))
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (user?.email) {
      setUserTier(authTier)
    }

    // Refresh usage state when auth state changes (signup, login, logout).
    fetchUsageState().then(setUsageState).catch(() => setUsageState(null))
  }, [authLoading, user?.email, authTier])

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
  const solveStainLabel = selectedStain
    ? getStainLabel(selectedStain, lang as 'en' | 'es')
    : stainInput.trim() || photoLabel
  const solveSurfaceLabel = selectedSurface ? getSurfaceLabel(selectedSurface, lang as 'en' | 'es') : ''
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

    // TASK-073: anon users get one free sample protocol before email gate.
    // Server (/api/solve) enforces via IP-keyed ANON_SOLVE_LIMIT=1 and
    // returns 402 `anon_limit` on attempt #2, which triggers PaywallModal
    // below. No client-side short-circuit here — the server is the gate.
    // TASK-065 pending-solve persistence moved into the 402 handler so
    // it saves at the moment the user actually needs to come back.

    setLoading(true)
    setError('')
    setResult(null)
    setDisambiguation(null)
    setTranslatedCard(null)
    setShowTranslated(false)

    try {
      let res: Response

      if (capturedPhoto) {
        // Image-based solve with enrichment
        const formData = new FormData()
        formData.append('image', capturedPhoto)
        formData.append('lang', lang)
        // TASK-033 P0-3: /api/solve is session-only (TASK-032). Don't send email
        // in body — it's ignored server-side. Session cookie travels with fetch.
        if (careLabelFile) formData.append('careLabel', careLabelFile)
        if (fabricDescription.trim()) formData.append('fabricDescription', fabricDescription.trim())
        if (garmentLocation.trim()) formData.append('garmentLocation', garmentLocation.trim())
        // If user also typed or selected a stain/surface, pass those as hints
        // Parse "X on Y" pattern from free-text input
        let hintStain = selectedStain || stainInput.trim()
        let hintSurface = selectedSurface
        if (!hintSurface && hintStain) {
          const onMatch = hintStain.match(/^(.+?)\s+on\s+(.+)$/i)
          if (onMatch) {
            hintStain = onMatch[1].trim()
            hintSurface = onMatch[2].trim()
          }
        }
        if (hintStain) formData.append('stainHint', hintStain)
        if (hintSurface) formData.append('surfaceHint', hintSurface)

        res = await fetch('/api/solve', {
          method: 'POST',
          body: formData,
        })
      } else {
        // Text-based solve — parse "X on Y" pattern from free-text input
        let s = selectedStain || stainInput.trim()
        let surf = selectedSurface
        if (!surf && s) {
          const onMatch = s.match(/^(.+?)\s+on\s+(.+)$/i)
          if (onMatch) {
            s = onMatch[1].trim()
            surf = onMatch[2].trim()
          }
        }
        // TASK-033 P0-3: /api/solve is session-only (TASK-032). Session cookie
        // travels with fetch; client email in body is ignored server-side.
        res = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stain: s, surface: surf, lang }),
        })
      }

      if (!res.ok) {
        const data = await res.json()
        if ((res.status === 402 || res.status === 403) && (data.error === 'trial_expired' || data.error === 'anon_limit')) {
          // TASK-073: save the query the user just tried so that when they
          // come back after email + magic-link, the solve auto-replays.
          // (Moved from the old pre-solve email gate — now we save at the
          // moment the paywall actually fires.)
          try {
            const pending = {
              stain: selectedStain || stainInput.trim(),
              surface: selectedSurface,
              ts: Date.now(),
            }
            if (pending.stain || pending.surface) {
              localStorage.setItem('gonr_pending_solve', JSON.stringify(pending))
            }
          } catch {
            // storage unavailable — user re-types on return; acceptable fallback
          }
          setShowPaywallReason(data.error === 'anon_limit' ? 'anon_limit' : 'trial_expired')
          setShowPaywall(true)
          return
        }
        if (res.status === 422 && data.error === 'stain_not_identified') {
          setError("Couldn't identify the stain from the photo. Try describing it in the text field below.")
          return
        }
        throw new Error(data.error || t('solveFailed'))
      }

      const data = await res.json()

      // TASK-056 — disambiguation fork. Pro tier got an ambiguous token and
      // the server handed back a question instead of a card. Render the
      // picker; the onPick handler re-fires solve with the refined stain.
      if (data && data.disambiguation_prompt) {
        setDisambiguation(data)
        setResult(null)
        return
      }

      if (lang === 'es') {
        try {
          const translated = await translateProtocolCard(data.card, 'es')
          setTranslatedCard(translated)
          setShowTranslated(!!translated)
        } catch {
          setTranslatedCard(null)
          setShowTranslated(false)
        }
      }

      setResult(data)
      incrementSolveCount()

      // Haptic tap on result arrival — mobile only, fails silently elsewhere.
      // Short single pulse (12ms) so it reads as a confirmation, not a buzz.
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(12) } catch { /* some browsers throw inside iframes */ }
      }

      // Refresh usage state after solve so the badge counts down accurately.
      if (userTier === 'free') {
        try {
          const newUsage = await fetchUsageState()
          setUsageState(newUsage)
          if (newUsage.expired) {
            setTimeout(() => setShowPaywall(true), 1500)
          }
        } catch {
          // Server returned 503 / network blip — leave the prior state in place.
        }
      }

      scrollToResult()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }, [hasSolveInput, capturedPhoto, careLabelFile, fabricDescription, garmentLocation, selectedStain, selectedSurface, stainInput, lang, t, incrementSolveCount, scrollToResult, userTier, translateProtocolCard])

  // TASK-065: after magic-link return lands the user authenticated, restore
  // the stain/surface they were trying to solve and auto-run the solve once
  // so they don't re-type. One-hour expiry on the stored intent to avoid
  // zombie solves from an abandoned session.
  useEffect(() => {
    if (authLoading || !user || result || loading) return
    try {
      const raw = localStorage.getItem('gonr_pending_solve')
      if (!raw) return
      const pending = JSON.parse(raw)
      if (!pending || typeof pending !== 'object') {
        localStorage.removeItem('gonr_pending_solve')
        return
      }
      const HOUR_MS = 60 * 60 * 1000
      if (!pending.ts || Date.now() - pending.ts > HOUR_MS) {
        localStorage.removeItem('gonr_pending_solve')
        return
      }
      if (pending.stain) {
        setSelectedStain(pending.stain)
        setStainInput(pending.stain)
      }
      if (pending.surface) setSelectedSurface(pending.surface)
      localStorage.removeItem('gonr_pending_solve')
      setShouldAutoSolve(true)
    } catch {
      // corrupt storage — wipe and continue
      try { localStorage.removeItem('gonr_pending_solve') } catch { /* noop */ }
    }
  }, [authLoading, user, result, loading])

  // TASK-065: actually trigger the solve once state has settled from the
  // pending-restore above. Separate effect so React has applied the setState
  // calls before handleSolve runs and sees fresh values.
  useEffect(() => {
    if (!shouldAutoSolve) return
    if (!hasSolveInput) return
    setShouldAutoSolve(false)
    handleSolve()
  }, [shouldAutoSolve, hasSolveInput, handleSolve])

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

  // --- TASK-056: disambiguation picker ---
  // When the server returned a question instead of a card, show the picker.
  // onPick re-fires solve with the refined stain + the ORIGINAL surface.
  // Bypasses handleSolve so we don't have to mutate the input state.
  const handleDisambiguationPick = useCallback(
    async (refinedStain: string) => {
      if (!disambiguation) return
      const originalSurface = disambiguation.original_query.surface
      setLoading(true)
      setError('')
      setDisambiguation(null)
      setResult(null)
      try {
        const res = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stain: refinedStain, surface: originalSurface, lang }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || t('solveFailed'))
        }
        // Re-solve could itself return another disambiguation in edge cases.
        // If so, render it (shouldn't happen with the static tree, but cheap guard).
        if (data && data.disambiguation_prompt) {
          setDisambiguation(data)
          return
        }
        setResult(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'solve failed')
      } finally {
        setLoading(false)
      }
    },
    [disambiguation, lang, t]
  )

  // --- TASK-056: disambiguation view ---
  if (disambiguation) {
    return (
      <div
        ref={resultRef}
        className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl mx-auto space-y-4"
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-1 mb-2 text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('backToSearch')}
        </button>
        <DisambiguationPrompt
          prompt={disambiguation.disambiguation_prompt}
          originalQuery={disambiguation.original_query}
          onPick={handleDisambiguationPick}
          disabled={loading}
        />
      </div>
    )
  }

  // --- Result view ---
  if (result) {
    // Pro-tier verified-only gate — Spotter / Operator hit the library and
    // got no match. The API returns noVerifiedProtocol=true with card=null
    // (Atlas 8102). Render a clean explanatory surface instead of an
    // empty broken ResultCard.
    if (result.noVerifiedProtocol) {
      const stainSurface = [solveStainLabel, solveSurfaceLabel].filter(Boolean).join(' on ') || t('yourQuery') || 'this combination'
      return (
        <div
          ref={resultRef}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl mx-auto"
        >
          <button
            onClick={handleBack}
            className="flex items-center gap-1 mb-4 text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('backToSearch')}
          </button>
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">🔬</span>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                No verified protocol yet
              </h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
              We don&apos;t have a verified protocol for <span className="font-semibold">{stainSurface}</span> yet.
              Pro tiers only see protocols that have passed chemistry review, so we don&apos;t guess here —
              we&apos;d rather stay silent than ship shaky chemistry to a spotter in motion.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Your query was logged. Pro-tier misses are the highest-priority signal on our
              &ldquo;what to author next&rdquo; list — we add verified cards continuously. Try again soon.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleBack}
                className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  color: 'var(--accent)',
                }}
              >
                {t('backToSearch')}
              </button>
              <a
                href={`mailto:hello@gonr.pro?subject=${encodeURIComponent('Protocol request: ' + stainSurface)}&body=${encodeURIComponent('No verified protocol yet for ' + stainSurface + '. Adding details so you can author it next:\n\n')}`}
                className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text)',
                  textDecoration: 'none',
                }}
              >
                Email the team
              </a>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        ref={resultRef}
        className="animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-1 mb-4 text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('backToSearch')}
        </button>
        <div className="flex items-center justify-end mb-2">
          <LanguageToggle
            protocolJson={result.card}
            translatedJson={translatedCard}
            initialLang={showTranslated && translatedCard ? 'es' : 'en'}
            onTranslated={(translated) => {
              setTranslatedCard(translated)
              setShowTranslated(true)
            }}
            onLangChange={(l) => setShowTranslated(l === 'es')}
          />
        </div>
        {/* TASK-056 — AI-fallback disclosure banner.
            Rendered when the user picked the Unknown option in a
            disambiguation flow. Not hideable — this is the UX surface
            for verification_level = 'draft' (TASK-055) on cards served
            to users who consented to a general baseline. */}
        {result.ai_fallback_disclosure && (
          <DisclosureRenderedBeacon correlationId={result.correlationId ?? null} />
        )}
        {result.ai_fallback_disclosure && (
          <div
            className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <span className="text-xl leading-none" aria-hidden="true">⚠️</span>
              <div className="space-y-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {result.ai_fallback_disclosure.label}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {result.ai_fallback_disclosure.body}
                </p>
              </div>
            </div>
          </div>
        )}
        <ResultCard
          card={showTranslated && translatedCard ? translatedCard : result.card}
          source={result.source}
          correlationId={result.correlationId}
          viewerTier={result.viewerTier}
        />
        {(userTier === 'free' && !authLoading) && (
          <ResultTierUpsell
            correlationId={result.correlationId ?? 'no-correlation'}
            cardId={result.card?.id ?? null}
          />
        )}
      </div>
    )
  }

  // --- Build solve subtext ---
  let solveSubtext = ''
  if (solveStainLabel && solveSurfaceLabel) {
    solveSubtext = `${solveStainLabel} ${lang === 'es' ? 'en' : 'on'} ${solveSurfaceLabel}`
  } else if (solveStainLabel) {
    solveSubtext = solveStainLabel
  }

  // Hint when care label scanned but no stain input yet
  const showCareLabelHint = !!(careLabelFile && !hasSolveInput)

  return (
    <div className="space-y-4">

      {/* ── Upgrade success banner ── */}
      {showUpgradeBanner && (
        <div
          className="rounded-xl px-4 py-3 text-center text-sm font-semibold"
          style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          Welcome to Spotter! You're all set. 🎉
        </div>
      )}

      {/* ── Hero Copy ── */}
      <div style={{ paddingTop: '12px', paddingBottom: '4px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1, color: 'var(--text)', margin: 0, marginBottom: '8px' }}>
          {t('masterSpotter')}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>
          {t('aiStainIntelligence')}
        </p>
        <div className="flex justify-center gap-4 flex-wrap" style={{ marginBottom: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-1.5">
            <BookOpen size={14} strokeWidth={1.8} aria-hidden="true" />
            {t('heroBadgeProtocols')}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} strokeWidth={1.8} aria-hidden="true" />
            {t('heroBadgeTrial')}
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} strokeWidth={1.8} aria-hidden="true" />
            {t('heroBadgeTrusted')}
          </span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', opacity: 0.7 }}>
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
              className="flex flex-col items-center justify-center gap-1 px-3 py-3 hover:opacity-90 active:scale-[0.98]"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              <span style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600 }}>{t('scanStain')}</span>
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
              className="flex flex-col items-center justify-center gap-1 px-3 py-3 hover:opacity-90 active:scale-[0.98]"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h5M12 12h5M12 17h5" />
              </svg>
              <span style={{ color: '#38bdf8', fontSize: '14px', fontWeight: 600 }}>{t('scanCareLabel')}</span>
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
            <span style={{ color: '#38bdf8', fontSize: '14px', fontWeight: 600 }}>
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

      {/* ── QUICK ACTIONS (TASK-050: pro-tier only) ── */}
      {/* Handoff + Stain Brain are Spotter+ features. Home/free/anon users
          see no pro quick-actions on the homepage. */}
      {canAccessFeature(authTier, 'spotter') && (
        <div className="flex gap-3" style={{ marginBottom: '-8px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <a
              href="/handoff"
              className="flex flex-col items-center justify-center gap-1 px-3 py-3 hover:opacity-90 active:scale-[0.98] transition-all"
              style={{
                background: 'rgba(234,179,8,0.08)',
                borderRadius: '12px',
                minHeight: '100px',
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
            <div style={{ minHeight: '36px' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <a
              href="/spotter?tool=stain_brain"
              className="flex flex-col items-center justify-center gap-1 px-3 py-3 hover:opacity-90 active:scale-[0.98] transition-all"
              style={{
                background: 'rgba(147,51,234,0.08)',
                borderRadius: '12px',
                minHeight: '100px',
                border: '1.5px solid rgba(147,51,234,0.35)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
              </svg>
              <span style={{ color: '#9333ea', fontSize: '14px', fontWeight: 600 }}>{t('stainBrain') || 'Stain Brain'}</span>
            </a>
            <div style={{ minHeight: '36px' }} />
          </div>
        </div>
      )}

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
        className={`flex flex-col items-center justify-center gap-0.5 px-4 py-3 active:scale-[0.98] ${loading ? 'animate-pulse' : ''}`}
      >
        <span
          className="flex items-center gap-2"
          style={{
            color: hasSolveInput ? '#22c55e' : 'var(--text-secondary)',
            fontSize: '17px',
            fontWeight: 700,
            transition: 'color 0.2s ease',
          }}
        >
          {loading && (
            <span
              className="inline-block w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#22c55e' }}
              aria-hidden="true"
            />
          )}
          {loading ? (t('findingProtocol') || 'Analyzing…') : `${t('analyzeGarment')} →`}
        </span>
        {solveSubtext && !loading && hasSolveInput && (
          <span style={{ color: '#8a94a6', fontSize: '12px' }}>
            {solveSubtext}
          </span>
        )}
      </button>

      {/* Care label scanned but no stain — prompt user */}
      {showCareLabelHint && (
        <div style={{ textAlign: 'center', fontSize: '13px', color: '#38bdf8', fontWeight: 500, padding: '4px 0' }}>
          Care label scanned ✓ — now scan or describe the stain
        </div>
      )}

      {/* Free solves remaining badge — never for paid/founder users */}
      {userTier === 'free' && !authLoading && usageState && solvesRemaining > 0 && solvesRemaining <= 3 && (
        <div style={{
          textAlign: 'center',
          padding: '8px 12px',
          background: 'rgba(34, 197, 94, 0.08)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#22c55e',
          fontWeight: 500,
        }}>
          {getRemainingTextFromState(usageState)}
        </div>
      )}

      {/* Loading skeleton — ResultCard-shaped so the reveal feels continuous */}
      {loading && <SolveLoadingSkeleton />}

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
        reason={showPaywallReason}
        stain={stainInput || selectedStain}
      />

      {/* Login gate modal — shown when anonymous user tries to solve */}
      {showLoginGate && (
        <LoginGateModal
          stain={stainInput || selectedStain}
          onClose={() => setShowLoginGate(false)}
          onLoggedIn={() => {
            setShowLoginGate(false)
            // Auto-trigger solve after login
            handleSolve()
          }}
        />
      )}
    </div>
  )
}

export default function SolvePage() {
  return (
    <Suspense fallback={null}>
      <SolvePageInner />
    </Suspense>
  )
}
