'use client'

import { useState, useRef } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getStoredUserEmail } from '@/lib/auth/clientEmail'

interface AnalysisResult {
  rootCause: string
  damageType: string
  repairable: 'yes' | 'partial' | 'no' | 'uncertain'
  fiberConcerns: string[]
  protocol: { step: number; action: string; agent: string | null }[]
  handoff: { improved: string; tough: string; release: string }
  proTip: string
}

const DAMAGE_CHIPS = [
  'Color loss',
  'Yellowing',
  'Hole / tear',
  'Texture change',
  'Shrinkage',
  'Press mark',
  'Solvent ring',
  'Dye bleed',
] as const

const REPAIRABLE_BADGE: Record<string, { label: string; color: string }> = {
  yes:       { label: 'REPAIRABLE', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  partial:   { label: 'PARTIAL',    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  no:        { label: 'PERMANENT',  color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  uncertain: { label: 'UNCERTAIN',  color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
}

export default function GarmentAnalysis() {
  const { t, lang } = useLanguage()
  const [image, setImage] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [activeChips, setActiveChips] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [handoffTone, setHandoffTone] = useState<'improved' | 'tough' | 'release'>('improved')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  function toggleChip(chip: string) {
    setActiveChips(prev => {
      const next = new Set(prev)
      next.has(chip) ? next.delete(chip) : next.add(chip)
      return next
    })
  }

  async function handleAnalyze() {
    if (!image && !description) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const context = [
        ...Array.from(activeChips),
        description,
      ].filter(Boolean).join('. ')

      const email = getStoredUserEmail()

      const res = await fetch('/api/garment-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, description: context, lang, email }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t('analysisFailed'))
      }

      const data = await res.json()
      setResult(data.analysis)
    } catch (err: any) {
      setError(err.message || t('somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  function copyHandoff() {
    if (!result) return
    const text = result.handoff[handoffTone]
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setImage(null)
    setDescription('')
    setActiveChips(new Set())
    setResult(null)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <span className="text-lg">🔍</span>
            Garment Analysis
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md
              bg-amber-500/15 text-amber-400 border border-amber-500/30">
              OPERATOR
            </span>
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Photo of damage → AI reasoning → root cause + handoff language
          </p>
        </div>
        {result && (
          <button onClick={reset} className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg
            border border-white/10 hover:border-green-500/30 transition-colors"
            style={{ color: 'var(--text-secondary)' }}>
            NEW
          </button>
        )}
      </div>

      {!result ? (
        <>
          {/* Photo upload */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
            {image ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10">
                <img src={image} alt="Garment" className="w-full max-h-64 object-cover" />
                <button
                  onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white
                    text-sm flex items-center justify-center hover:bg-black/80">
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-8 rounded-xl border-2 border-dashed border-white/15
                  hover:border-amber-500/40 transition-colors flex flex-col items-center gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span className="text-2xl">📷</span>
                <span className="text-sm font-medium">Tap to photograph damage</span>
                <span className="text-xs opacity-60">or upload an existing photo</span>
              </button>
            )}
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Describe what you see (optional)..."
            className="w-full rounded-lg border border-white/10 text-sm p-3 resize-none
              focus:outline-none focus:ring-2 focus:ring-amber-500/30
              placeholder:opacity-40"
            style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}
          />

          {/* Damage chips */}
          <div className="flex flex-wrap gap-2">
            {DAMAGE_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => toggleChip(chip)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${activeChips.has(chip)
                    ? 'bg-amber-500 text-white'
                    : 'border border-white/10 hover:border-amber-500/30'
                  }`}
                style={!activeChips.has(chip) ? { color: 'var(--text-secondary)', background: 'var(--card-bg)' } : {}}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={loading || (!image && !description)}
            className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-600
              text-black text-sm font-bold transition-colors disabled:opacity-40
              shadow-lg shadow-amber-500/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Analyzing damage...
              </span>
            ) : (
              '🔍 Analyze Garment'
            )}
          </button>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
        </>
      ) : (
        /* ─── Results ──────────────────────────────────────── */
        <div className="space-y-3">
          {/* Root Cause */}
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold tracking-wider"
                style={{ color: 'var(--green)' }}>ROOT CAUSE</span>
              {REPAIRABLE_BADGE[result.repairable] && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border
                  ${REPAIRABLE_BADGE[result.repairable].color}`}>
                  {REPAIRABLE_BADGE[result.repairable].label}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {result.rootCause}
            </p>
            <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-md
              border border-white/10" style={{ color: 'var(--text-secondary)' }}>
              {result.damageType.toUpperCase()}
            </span>
          </div>

          {/* Fiber Concerns */}
          {result.fiberConcerns.length > 0 && (
            <div className="card border-red-500/20">
              <span className="text-[10px] font-mono font-bold tracking-wider text-red-400">
                FIBER CONCERNS
              </span>
              <div className="mt-2 space-y-1">
                {result.fiberConcerns.map((c, i) => (
                  <p key={i} className="text-xs text-red-300/80 flex items-start gap-2">
                    <span className="shrink-0">⚠️</span> {c}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Protocol */}
          {result.protocol.length > 0 && (
            <div className="card">
              <span className="text-[10px] font-mono font-bold tracking-wider"
                style={{ color: 'var(--green)' }}>PROTOCOL</span>
              <div className="mt-3 space-y-3">
                {result.protocol.map(s => (
                  <div key={s.step} className="flex gap-3 items-start">
                    <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                      text-[11px] font-mono font-bold"
                      style={{ background: 'var(--green-dim, rgba(16,185,129,0.1))', color: 'var(--green)' }}>
                      {s.step}
                    </span>
                    <div className="min-w-0">
                      {s.agent && (
                        <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5
                          rounded-md mb-1"
                          style={{ background: 'var(--green-dim, rgba(16,185,129,0.1))', color: 'var(--green)' }}>
                          {s.agent}
                        </span>
                      )}
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {s.action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pro Tip */}
          {result.proTip && (
            <div className="card border-amber-500/20">
              <span className="text-[10px] font-mono font-bold tracking-wider text-amber-400">
                PRO TIP
              </span>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {result.proTip}
              </p>
            </div>
          )}

          {/* Customer Handoff */}
          <div className="card border-amber-500/20">
            <span className="text-[10px] font-mono font-bold tracking-wider text-amber-400">
              CUSTOMER HANDOFF
            </span>
            <div className="mt-3 flex gap-0 rounded-lg overflow-hidden border border-white/10">
              {(['improved', 'tough', 'release'] as const).map(tone => (
                <button
                  key={tone}
                  onClick={() => { setHandoffTone(tone); setCopied(false) }}
                  className={`flex-1 py-2 text-[11px] font-mono font-bold capitalize transition-all
                    ${handoffTone === tone
                      ? tone === 'release' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                      : 'text-gray-500 hover:text-gray-300'
                    }`}
                  style={handoffTone !== tone ? { background: 'var(--card-bg)' } : {}}
                >
                  {tone === 'release' ? 'Decline Note' : tone}
                </button>
              ))}
            </div>
            {handoffTone === 'release' ? (
              <div className="mt-3 rounded-lg border border-red-500/20"
                style={{ background: 'rgba(239,68,68,0.04)' }}>
                <div className="px-4 pt-3 pb-1 border-b border-red-500/15">
                  <p className="text-[10px] font-mono font-bold tracking-wider text-red-400">DECLINE NOTICE</p>
                </div>
                <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: 'var(--text-secondary)' }}>
                  {result.handoff[handoffTone]}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-lg p-3 text-sm leading-relaxed border border-white/10"
                style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                {result.handoff[handoffTone]}
              </div>
            )}
            <button
              onClick={copyHandoff}
              className={`mt-3 w-full py-2.5 rounded-lg text-xs font-mono font-bold transition-all border
                ${copied
                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                  : handoffTone === 'release'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                }`}
            >
              {copied ? 'COPIED' : handoffTone === 'release' ? 'COPY DECLINE NOTE' : 'COPY TO CLIPBOARD'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
