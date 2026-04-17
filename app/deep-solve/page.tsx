'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LoginGateModal from '@/components/auth/LoginGateModal'
import { isAuthError, needsLogin } from '@/lib/auth/handleAuthError'

/* ═══════════════════════════════════════════════════
   TASK-127 — Operator Flow
   Full replacement for app/operator/page.tsx
   Two modules: Deep Solve → Customer Handoff
   ═══════════════════════════════════════════════════ */

// ── Types ──────────────────────────────────────────

interface ProtocolStep {
  step: number
  agent: string
  instruction: string
  warning?: string | null
}

interface DeepSolveResult {
  assessment: string
  modifiedProtocol: ProtocolStep[]
  riskFactors: string[]
  outcomes: { best: string; likely: string; worst: string }
  recommendation: 'proceed' | 'caution' | 'release'
  recommendationNote: string
}

interface OperatorSession {
  stain: string
  cardId: string
  deepSolveResult?: DeepSolveResult
  deepSolveSituations?: string[]
  deepSolveContext?: string
}

type StepStatus = 'idle' | 'loading' | 'done'

const SITUATION_CHIPS = [
  { key: 'stain_old', i18nKey: 'chipStainOld' },
  { key: 'already_treated', i18nKey: 'chipAlreadyTreated' },
  { key: 'high_value', i18nKey: 'chipHighValue' },
  { key: 'customer_upset', i18nKey: 'chipCustomerUpset' },
  { key: 'delicate_fiber', i18nKey: 'chipDelicateFiber' },
  { key: 'unknown_fiber', i18nKey: 'chipUnknownFiber' },
  { key: 'dye_bleed', i18nKey: 'chipDyeBleed' },
  { key: 'heat_damage', i18nKey: 'chipHeatDamage' },
] as const

const TONES = [
  { key: 'confident', i18nKey: 'toneConfident' },
  { key: 'cautious', i18nKey: 'toneCautious' },
  { key: 'apologetic', i18nKey: 'toneApologetic' },
  { key: 'release', i18nKey: 'toneRelease' },
] as const

// ── Progress Bar ───────────────────────────────────

function ProgressBar({
  session,
  deepSolveStatus,
  handoffStatus,
  onTap,
}: {
  session: OperatorSession
  deepSolveStatus: StepStatus
  handoffStatus: StepStatus
  onTap: (id: string) => void
}) {
  const { t } = useLanguage()
  const hasSolve = !!session.stain

  const steps = [
    { id: 'solve', label: t('progressSolve'), status: hasSolve ? 'done' : 'idle' },
    { id: 'deep-solve', label: t('progressDeepSolve'), status: deepSolveStatus },
    { id: 'handoff', label: t('progressHandoff'), status: handoffStatus },
  ] as const

  const icon = (s: string) => {
    if (s === 'done') return '✅'
    if (s === 'loading') return '🔄'
    return '⭕'
  }

  return (
    <div className="flex items-center justify-start gap-3 px-4 py-2 overflow-x-auto">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1 min-w-0">
          <button
            onClick={() => onTap(step.id)}
            className="flex items-center gap-1 text-xs font-medium whitespace-nowrap
              hover:opacity-80 transition-opacity"
            style={{ color: step.status === 'done' ? 'var(--accent)' : 'var(--text-secondary)' }}
          >
            <span>{icon(step.status)}</span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
          {i < steps.length - 1 && (
            <span className="text-xs mx-1" style={{ color: 'var(--text-secondary)' }}>→</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────

function Section({
  id,
  icon,
  title,
  subtitle,
  children,
}: {
  id: string
  icon: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="rounded-xl border shadow-sm overflow-hidden"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border, rgba(128,128,128,0.15))' }}>
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          {icon} {title}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
      </div>
      <div className="px-4 pb-4">
        {children}
      </div>
    </section>
  )
}

// ── Deep Solve Module ──────────────────────────────

function DeepSolveModule({
  session,
  setSession,
  status,
  setStatus,
  onAuthError,
}: {
  session: OperatorSession
  setSession: React.Dispatch<React.SetStateAction<OperatorSession>>
  status: StepStatus
  setStatus: (s: StepStatus) => void
  onAuthError: () => void
}) {
  const { t, lang } = useLanguage()
  const [situations, setSituations] = useState<string[]>([])
  const [context, setContext] = useState('')
  const [stainInput, setStainInput] = useState(session.stain)
  const [isEditing, setIsEditing] = useState(!session.stain)
  const [error, setError] = useState('')

  // Sync stain input when session changes from URL params
  useEffect(() => {
    if (session.stain) {
      setStainInput(session.stain)
      setIsEditing(false)
    }
  }, [session.stain])

  const toggleSituation = (key: string) => {
    setSituations(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const runDeepSolve = async () => {
    const stain = stainInput.trim()
    if (!stain) return

    setError('')
    setStatus('loading')

    try {
      const res = await fetch('/api/deep-solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stain,
          cardId: session.cardId || undefined,
          context: context.trim() || undefined,
          situations: situations.length > 0 ? situations : undefined,
          lang,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (isAuthError(res.status, data)) {
          if (needsLogin(data)) onAuthError()
          throw new Error(t('loginRequired'))
        }
        throw new Error(data.error || 'Deep Solve failed')
      }

      const result: DeepSolveResult = await res.json()

      setSession(prev => ({
        ...prev,
        stain,
        deepSolveResult: result,
        deepSolveSituations: situations,
        deepSolveContext: context.trim(),
      }))
      setStatus('done')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setStatus('idle')
    }
  }

  const result = session.deepSolveResult

  const recBadge = (rec: string) => {
    if (rec === 'proceed') return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30', label: t('recommendationProceed') }
    if (rec === 'caution') return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: t('recommendationCaution') }
    return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: t('recommendationRelease') }
  }

  return (
    <Section id="deep-solve" icon="🔬" title={t('deepSolveModuleTitle')} subtitle={t('deepSolveModuleSubtitle')}>
      {/* Stain context */}
      <div className="mb-3">
        {!isEditing && stainInput ? (
          <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
            <span className="font-medium">{t('deepSolveLoaded')}:</span>
            <span className="flex-1">{stainInput}</span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{ color: 'var(--accent)' }}
            >
              {t('deepSolveEditContext')}
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={stainInput}
            onChange={e => setStainInput(e.target.value)}
            placeholder={t('deepSolveStainPlaceholder')}
            className="w-full rounded-lg px-3 py-2 text-sm border outline-none
              focus:ring-2 focus:ring-purple-500/40"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border, rgba(128,128,128,0.15))',
              color: 'var(--text)',
            }}
          />
        )}
      </div>

      {/* Situation chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {SITUATION_CHIPS.map(chip => {
          const active = situations.includes(chip.key)
          return (
            <button
              key={chip.key}
              onClick={() => toggleSituation(chip.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-gray-300 dark:border-white/15 hover:border-purple-400'
              }`}
              style={!active ? { color: 'var(--text-secondary)' } : undefined}
            >
              {t(chip.i18nKey)}
            </button>
          )
        })}
      </div>

      {/* Additional context */}
      <textarea
        value={context}
        onChange={e => setContext(e.target.value)}
        placeholder={t('deepSolvePlaceholder')}
        rows={2}
        className="w-full rounded-lg px-3 py-2 text-sm border outline-none resize-none
          focus:ring-2 focus:ring-purple-500/40 mb-3"
        style={{
          backgroundColor: 'var(--bg)',
          borderColor: 'var(--border, rgba(128,128,128,0.15))',
          color: 'var(--text)',
        }}
      />

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}

      {/* Run button */}
      {!result && (
        <button
          onClick={runDeepSolve}
          disabled={status === 'loading' || !stainInput.trim()}
          className="w-full min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700
            text-white text-sm font-semibold transition-colors shadow-lg shadow-purple-600/25
            disabled:opacity-50"
        >
          {status === 'loading' ? `🔄 ${t('deepSolveRunning')}` : `🔬 ${t('deepSolveRunButton')}`}
        </button>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="mt-4 space-y-4">
          {/* Assessment */}
          <div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>
              {t('situationAssessment')}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {result.assessment}
            </p>
          </div>

          {/* Modified Protocol */}
          <div>
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>
              {t('modifiedProtocol')}
            </h3>
            <div className="space-y-2">
              {result.modifiedProtocol.map(step => (
                <div key={step.step} className="rounded-lg p-3 border"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border, rgba(128,128,128,0.15))' }}>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                      {step.step}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold uppercase tracking-wide"
                        style={{ color: 'var(--accent)' }}>
                        {step.agent}
                      </span>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text)' }}>
                        {step.instruction}
                      </p>
                      {step.warning && (
                        <p className="text-xs mt-1 text-amber-400">
                          ⚠️ {step.warning}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Factors */}
          <div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>
              {t('riskFactors')}
            </h3>
            <ul className="space-y-1">
              {result.riskFactors.map((risk, i) => (
                <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Outcome Scenarios */}
          <div>
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>
              {t('outcomeScenarios')}
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span>✅</span>
                <div>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>{t('outcomeBest')}: </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{result.outcomes.best}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span>⚠️</span>
                <div>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>{t('outcomeLikely')}: </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{result.outcomes.likely}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span>❌</span>
                <div>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>{t('outcomeWorst')}: </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{result.outcomes.worst}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div>
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>
              {t('shouldYouProceed')}
            </h3>
            {(() => {
              const badge = recBadge(result.recommendation)
              return (
                <div className={`rounded-lg p-3 border ${badge.bg} ${badge.border}`}>
                  <span className={`text-sm font-bold ${badge.text}`}>{badge.label}</span>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {result.recommendationNote}
                  </p>
                </div>
              )
            })()}
          </div>

        </div>
      )}
    </Section>
  )
}

// ── Customer Handoff Module ────────────────────────

function CustomerHandoffModule({
  session,
  onDone,
  onAuthError,
}: {
  session: OperatorSession
  onDone?: () => void
  onAuthError: () => void
}) {
  const { t, lang } = useLanguage()
  const [tone, setTone] = useState<string>('')
  const [manualContext, setManualContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    intake: string
    ticketNotes: string
    pickup: string
    writtenNote: string
  } | null>(null)
  const [error, setError] = useState('')

  // Auto-select tone from Deep Solve recommendation
  useEffect(() => {
    if (session.deepSolveResult && !tone) {
      const rec = session.deepSolveResult.recommendation
      if (rec === 'proceed') setTone('confident')
      else if (rec === 'caution') setTone('cautious')
      else if (rec === 'release') setTone('release')
    }
  }, [session.deepSolveResult]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasContext = !!(session.stain || session.deepSolveResult || manualContext.trim())

  // Build context string from session
  const buildContext = () => {
    const parts: string[] = []
    if (session.stain) parts.push(`Stain/garment: ${session.stain}`)
    if (session.deepSolveResult) {
      parts.push(`Assessment: ${session.deepSolveResult.assessment}`)
      parts.push(`Recommendation: ${session.deepSolveResult.recommendation}`)
      if (session.deepSolveResult.outcomes) {
        parts.push(`Likely outcome: ${session.deepSolveResult.outcomes.likely}`)
      }
    }
    if (manualContext.trim()) parts.push(manualContext.trim())
    return parts.join('\n')
  }

  const toneToOutcome = (t: string): string => {
    if (t === 'confident') return 'improved'
    if (t === 'cautious') return 'tough'
    if (t === 'apologetic') return 'tough'
    return 'release'
  }

  const generateHandoff = async () => {
    if (!tone || !hasContext) return

    setError('')
    setLoading(true)

    try {
      const contextStr = buildContext()
      const stainSource = session.stain || manualContext.trim() || 'Unknown stain'
      const stainParts = stainSource.split(' on ')

      const res = await fetch('/api/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stain: stainParts[0] || stainSource,
          surface: stainParts[1] || '',
          outcome: toneToOutcome(tone),
          details: contextStr,
          lang,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (isAuthError(res.status, data)) {
          if (needsLogin(data)) onAuthError()
          throw new Error(t('loginRequired'))
        }
        throw new Error(data.error || 'Handoff generation failed')
      }

      const data = await res.json()

      setResult({
        intake: data.intake || '',
        ticketNotes: data.ticketNotes || '',
        pickup: data.pickup || '',
        writtenNote: data.writtenNote || '',
      })
      onDone?.()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section id="handoff" icon="📋" title={t('handoffOperatorTitle')} subtitle={t('handoffOperatorSubtitle')}>
      {/* Context summary */}
      {session.deepSolveResult && (
        <div className="rounded-lg p-3 border mb-3"
          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border, rgba(128,128,128,0.15))' }}>
          <p className="text-xs font-bold mb-1" style={{ color: 'var(--text)' }}>
            {t('handoffContextLabel')}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {session.stain}
            {session.deepSolveResult && ` — ${session.deepSolveResult.recommendation}`}
          </p>
        </div>
      )}

      {/* Manual context (if no prior modules ran) */}
      {!session.deepSolveResult && (
        <textarea
          value={manualContext}
          onChange={e => setManualContext(e.target.value)}
          placeholder={t('handoffNeedsContext')}
          rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm border outline-none resize-none
            focus:ring-2 focus:ring-purple-500/40 mb-3"
          style={{
            backgroundColor: 'var(--bg)',
            borderColor: 'var(--border, rgba(128,128,128,0.15))',
            color: 'var(--text)',
          }}
        />
      )}

      {/* Tone selector */}
      <div className="mb-3">
        <p className="text-xs font-bold mb-2" style={{ color: 'var(--text)' }}>
          {t('handoffToneLabel')}
        </p>
        <div className="flex flex-wrap gap-2">
          {TONES.map(t_ => {
            const active = tone === t_.key
            return (
              <button
                key={t_.key}
                onClick={() => setTone(t_.key)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'border-gray-300 dark:border-white/15 hover:border-purple-400'
                }`}
                style={!active ? { color: 'var(--text-secondary)' } : undefined}
              >
                {t(t_.i18nKey)}
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {/* Generate button */}
      {!result && (
        <button
          onClick={generateHandoff}
          disabled={loading || !tone || !hasContext}
          className="w-full min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700
            text-white text-sm font-semibold transition-colors shadow-lg shadow-purple-600/25
            disabled:opacity-50"
        >
          {loading ? `🔄 ${t('generatingHandoff')}` : `📋 ${t('generateHandoff')}`}
        </button>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="mt-4 space-y-3">
          {[
            { key: 'intake', label: t('handoffIntakeScript'), icon: '🎤', text: result.intake },
            { key: 'ticket', label: t('handoffTicketNotes'), icon: '🏷️', text: result.ticketNotes },
            { key: 'pickup', label: t('handoffPickupScript'), icon: '👋', text: result.pickup },
            { key: 'note', label: t('handoffWrittenNote'), icon: '📝', text: result.writtenNote },
          ].map(section => (
            <div key={section.key} className="rounded-lg p-3 border"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border, rgba(128,128,128,0.15))' }}>
              <h4 className="text-xs font-bold mb-1" style={{ color: 'var(--text)' }}>
                {section.icon} {section.label}
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {section.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ── Main Operator Page (inner, uses useSearchParams) ──

function OperatorPageInner() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const [showLoginGate, setShowLoginGate] = useState(false)

  // Require login
  const hasEmail = typeof window !== 'undefined' && localStorage.getItem('gonr_user_email')
  useEffect(() => {
    if (!hasEmail) setShowLoginGate(true)
  }, [hasEmail])

  const [session, setSession] = useState<OperatorSession>({
    stain: searchParams.get('stain') || '',
    cardId: searchParams.get('cardId') || '',
  })

  const [deepSolveStatus, setDeepSolveStatus] = useState<StepStatus>('idle')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [handoffStatus, setHandoffStatus] = useState<StepStatus>('idle')

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          {t('deepSolveModuleTitle')}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {t('deepSolveModuleSubtitle')}
        </p>
      </div>

      {/* Progress bar */}
      <ProgressBar
        session={session}
        deepSolveStatus={deepSolveStatus}
        handoffStatus={handoffStatus}
        onTap={scrollTo}
      />

      {/* Modules */}
      <div className="px-4 space-y-4 mt-2">
        <DeepSolveModule
          session={session}
          setSession={setSession}
          status={deepSolveStatus}
          setStatus={setDeepSolveStatus}
          onAuthError={() => setShowLoginGate(true)}
        />

        <CustomerHandoffModule
          session={session}
          onDone={() => setHandoffStatus('done')}
          onAuthError={() => setShowLoginGate(true)}
        />
      </div>
      {/* Login gate modal */}
      {showLoginGate && (
        <LoginGateModal
          onClose={() => setShowLoginGate(false)}
          onLoggedIn={() => { setShowLoginGate(false); window.location.reload() }}
        />
      )}
    </div>
  )
}

// ── Exported page (Suspense boundary for useSearchParams) ──

export default function OperatorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</span>
      </div>
    }>
      <OperatorPageInner />
    </Suspense>
  )
}
