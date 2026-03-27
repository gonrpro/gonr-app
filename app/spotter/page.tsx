'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import StainBrainChat from '@/components/solve/StainBrainChat'
import GarmentFlag from '@/components/solve/GarmentFlag'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type ActiveTool = 'stain_brain' | 'garment_flag' | null

function SpotterPageInner() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const [activeTool, setActiveTool] = useState<ActiveTool>(() => {
    if (searchParams.get('tool') === 'stain_brain') return 'stain_brain'
    return null
  })

  if (activeTool === 'stain_brain') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setActiveTool(null)}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Spotter
        </button>
        <div className="card p-0 overflow-hidden">
          <StainBrainChat />
        </div>
      </div>
    )
  }

  if (activeTool === 'garment_flag') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setActiveTool(null)}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Spotter
        </button>
        <div className="card p-0 overflow-hidden">
          <GarmentFlag onClose={() => setActiveTool(null)} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Spotter</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Reference, chemistry, and expert tools for professional spotters.
        </p>
      </div>

      {/* Reference tools */}
      <div className="space-y-1">
        <p className="text-[10px] font-mono font-bold tracking-wider uppercase px-1" style={{ color: 'var(--text-secondary)' }}>Reference</p>
        <Link
          href="/pro/chemicals"
          className="card w-full text-left space-y-1 transition-colors hover:border-green-500/30 block"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🧪</span>
            <h2 className="text-base font-bold">Chemical Reference</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Every spotting agent — what it does, when to use it, fiber safety, brand crosswalk.
          </p>
        </Link>

        <Link
          href="/pro/chemistry"
          className="card w-full text-left space-y-1 transition-colors hover:border-green-500/30 block"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">⚗️</span>
            <h2 className="text-base font-bold">Chemistry Cards</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Stain family chemistry — how each family bonds to fiber, what breaks it, what makes it permanent.
          </p>
        </Link>
      </div>

      {/* AI tools */}
      <div className="space-y-1">
        <p className="text-[10px] font-mono font-bold tracking-wider uppercase px-1" style={{ color: 'var(--text-secondary)' }}>AI Tools</p>

        <button
          onClick={() => setActiveTool('stain_brain')}
          className="card w-full text-left space-y-1 transition-colors hover:border-purple-500/30"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <h2 className="text-base font-bold">Stain Brain</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Chat with the AI about any stain scenario. Ask why. Ask what if. Dan Eisen methodology.
          </p>
        </button>

        <Link
          href="/deep-solve"
          className="card w-full text-left space-y-1 transition-colors hover:border-green-500/30 block"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🔬</span>
            <h2 className="text-base font-bold">Deep Solve</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border ml-auto"
              style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}>
              Pro
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Situational analysis for old stains, prior treatments, and high-value garments. Includes customer handoff scripts.
          </p>
        </Link>

        <button
          onClick={() => setActiveTool('garment_flag')}
          className="card w-full text-left space-y-1 transition-colors hover:border-amber-500/30"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📸</span>
            <h2 className="text-base font-bold">Flag for Garment Analysis</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border ml-auto"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.35)' }}>
              Operator
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Capture a problem garment for operator review. Photo + notes sent to your operator for full AI assessment.
          </p>
        </button>
      </div>
    </div>
  )
}

export default function SpotterPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</div>}>
      <SpotterPageInner />
    </Suspense>
  )
}
