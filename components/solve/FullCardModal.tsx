'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Step, ProtocolCard } from '@/lib/types'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface FullCardModalProps {
  card: ProtocolCard
  steps: Step[]
  warnings: string[]
  onClose: () => void
}

/* ── Speech helpers ─────────────────────────── */

function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Map our app lang ('en' | 'es') to the BCP-47 tag the SpeechSynthesis API expects.
function speechLangFor(lang: string): string {
  if (lang === 'es') return 'es-ES'
  return 'en-US'
}

// Pick the best installed voice for the given lang. Prefer voices whose name
// contains a quality keyword, then a known-good named voice, then default,
// then any voice in the language family.
function pickBestVoice(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const targetPrefix = lang.split('-')[0].toLowerCase() // "en" or "es"

  const candidates = voices.filter(v => v.lang.toLowerCase().startsWith(targetPrefix))
  if (!candidates.length) return null

  const QUALITY_KEYWORDS = ['premium', 'enhanced', 'natural', 'neural', 'studio']
  const NAMED_GOOD = lang.startsWith('es')
    ? ['mónica', 'monica', 'paulina', 'jorge', 'google']
    : ['samantha', 'alex', 'google us english', 'microsoft aria', 'microsoft jenny']

  const lower = (s: string) => s.toLowerCase()

  // 1. Quality keyword match
  const qualityHit = candidates.find(v => QUALITY_KEYWORDS.some(k => lower(v.name).includes(k)))
  if (qualityHit) return qualityHit

  // 2. Named-good voice
  const namedHit = candidates.find(v => NAMED_GOOD.some(k => lower(v.name).includes(k)))
  if (namedHit) return namedHit

  // 3. Default voice in the language family
  const defaultHit = candidates.find(v => v.default)
  if (defaultHit) return defaultHit

  // 4. First match
  return candidates[0]
}

function speakText(text: string, lang: string, voice: SpeechSynthesisVoice | null, rate = 0.88) {
  if (!speechAvailable()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.trim())
  u.rate = rate
  u.pitch = 1.0
  u.lang = speechLangFor(lang)
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}

function stopSpeech() {
  if (speechAvailable()) window.speechSynthesis.cancel()
}

/* ── Component ──────────────────────────────── */

export default function FullCardModal({ card, steps, warnings, onClose }: FullCardModalProps) {
  const { lang, t } = useLanguage()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [activeStepIdx, setActiveStepIdx] = useState<number | null>(null)
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Keyboard: Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Voice loading. getVoices() is async on Chrome — must wait for voiceschanged.
  useEffect(() => {
    if (!speechAvailable()) return
    const updateVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      setVoice(pickBestVoice(lang, voices))
    }
    updateVoice()
    window.speechSynthesis.addEventListener('voiceschanged', updateVoice)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoice)
  }, [lang])

  // iOS keep-alive for speechSynthesis
  useEffect(() => {
    if (isSpeaking && speechAvailable()) {
      keepAliveRef.current = setInterval(() => {
        try { window.speechSynthesis.pause(); window.speechSynthesis.resume() } catch {}
      }, 12000)
    }
    return () => {
      if (keepAliveRef.current) clearInterval(keepAliveRef.current)
    }
  }, [isSpeaking])

  // Cleanup speech on unmount
  useEffect(() => () => stopSpeech(), [])

  const buildFullText = useCallback(() => {
    const parts: string[] = []
    parts.push(card.title + '.')
    if (card.whyThisWorks) parts.push(card.whyThisWorks)
    steps.forEach((s) => {
      let line = `Step ${s.step ?? ''}. `
      if (s.agent) line += s.agent + '. '
      line += s.instruction
      if (s.dwellTime) line += ` Wait ${s.dwellTime}.`
      parts.push(line)
    })
    if (warnings.length) {
      parts.push(t('warnings') + '.')
      warnings.forEach(w => parts.push(w))
    }
    return parts.join(' \n')
  }, [card, steps, warnings, t])

  const handleReadAloud = useCallback(() => {
    if (!speechAvailable()) return
    if (isSpeaking) {
      stopSpeech()
      setIsSpeaking(false)
      return
    }
    speakText(buildFullText(), lang, voice)
    setIsSpeaking(true)
    // Track when speech ends
    const check = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setIsSpeaking(false)
        clearInterval(check)
      }
    }, 500)
  }, [isSpeaking, buildFullText, lang, voice])

  const handleStepTap = useCallback((idx: number) => {
    if (!speechAvailable()) return
    const s = steps[idx]
    let text = ''
    if (s.agent) text += s.agent + '. '
    text += s.instruction
    if (s.dwellTime) text += ` Wait ${s.dwellTime}.`
    speakText(text, lang, voice)
    setActiveStepIdx(idx)
    setIsSpeaking(true)
  }, [steps, lang, voice])

  const handleClose = useCallback(() => {
    stopSpeech()
    setIsSpeaking(false)
    onClose()
  }, [onClose])

  const hasSpeech = speechAvailable()

  return (
    <div
      className="fixed inset-0 z-[1100] flex flex-col"
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
            {t('fullProtocol')}
          </span>
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
            {card.title}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="w-9 h-9 flex items-center justify-center rounded-full text-lg flex-shrink-0"
          style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}
          aria-label={t('done')}
        >
          &times;
        </button>
      </div>

      {/* ── Audio controls ── */}
      {hasSpeech && (
        <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={handleReadAloud}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: isSpeaking ? 'rgba(239,68,68,0.12)' : 'rgba(129,140,248,0.1)',
              border: `1px solid ${isSpeaking ? 'rgba(239,68,68,0.3)' : 'rgba(129,140,248,0.25)'}`,
              color: isSpeaking ? '#ef4444' : '#818cf8',
            }}
          >
            {isSpeaking ? `⏹ ${t('stopReading')}` : `🔊 ${t('readAloud')}`}
          </button>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {isSpeaking ? t('readingFullProtocol') : t('tapStepsToHear')}
          </span>
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

        {/* Why This Works */}
        {card.whyThisWorks && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#22c55e' }}>
              {t('whyThisWorks')}
            </p>
            <p className="text-base leading-relaxed" style={{ color: 'var(--text)' }}>
              {card.whyThisWorks}
            </p>
          </div>
        )}

        {/* Steps */}
        {steps.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {t('proProtocol')} — {steps.length}
            </p>

            {/* Progress bar */}
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  background: '#22c55e',
                  width: activeStepIdx !== null ? `${((activeStepIdx + 1) / steps.length) * 100}%` : '0%',
                }}
              />
            </div>

            {steps.map((step, i) => (
              <div
                key={i}
                ref={el => { stepRefs.current[i] = el }}
                onClick={() => handleStepTap(i)}
                className="flex gap-3 rounded-xl p-3 transition-colors cursor-pointer"
                style={{
                  background: activeStepIdx === i ? 'rgba(34,197,94,0.08)' : 'var(--surface)',
                  border: `1px solid ${activeStepIdx === i ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                }}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                  {step.step ?? i + 1}
                </div>
                <div className="flex-1 space-y-1">
                  {step.agent && (
                    <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#22c55e' }}>
                      {step.agent}
                    </p>
                  )}
                  <p className="text-base leading-relaxed" style={{ color: 'var(--text)' }}>
                    {step.instruction}
                  </p>
                  {(step.technique || step.temperature) && (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {[step.technique, step.temperature].filter(Boolean).join(' — ')}
                    </p>
                  )}
                  {step.dwellTime && (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      ⏱ {step.dwellTime}
                    </p>
                  )}
                </div>
                {hasSpeech && (
                  <div className="flex-shrink-0 self-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                    🔊
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#ef4444' }}>
              {t('warnings')}
            </p>
            <ul className="space-y-1.5">
              {warnings.map((w, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                  <span className="text-red-400 flex-shrink-0">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Escalation */}
        {card.escalation && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#ca8a04' }}>
              {t('escalation')}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
              {typeof card.escalation === 'string' ? card.escalation : card.escalation.when}
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleClose}
          className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold"
          style={{
            background: 'rgba(34,197,94,0.12)',
            color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.3)',
          }}
        >
          {t('done')}
        </button>
      </div>
    </div>
  )
}
