'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import StainBrainChat from '@/components/solve/StainBrainChat'
import GarmentFlag from '@/components/solve/GarmentFlag'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useUser } from '@/lib/hooks/useUser'

const COURSES = [
  {
    titleKey: 'courseSpottingFundamentalsTitle',
    descKey: 'courseSpottingFundamentalsDesc',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    ),
  },
  {
    titleKey: 'courseDanEisenTitle',
    descKey: 'courseDanEisenDesc',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
  },
  {
    titleKey: 'courseFiberMasteryTitle',
    descKey: 'courseFiberMasteryDesc',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    titleKey: 'courseCustomerCommTitle',
    descKey: 'courseCustomerCommDesc',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
] as const

function CourseCard({ course }: { course: typeof COURSES[number] }) {
  const { t } = useLanguage()
  return (
    <div className="card space-y-2" style={{ opacity: 0.75 }}>
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--text-secondary)' }}>{course.icon}</span>
        <h3 className="text-base font-bold">{t(course.titleKey)}</h3>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', borderColor: 'rgba(245,158,11,0.3)' }}>
          {t('comingSoon')}
        </span>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t(course.descKey)}</p>
    </div>
  )
}

type ActiveTool = 'stain_brain' | 'garment_flag' | null

function SpotterPageInner() {
  const { t } = useLanguage()
  const { tier } = useUser()
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
          href="/handoff"
          className="card w-full text-left space-y-1 transition-colors hover:border-yellow-500/30 block"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🤝</span>
            <h2 className="text-base font-bold">Customer Handoff</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Generate counter scripts for intake, tough cases, and pickup conversations.
          </p>
        </Link>

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
            Situational analysis for old stains, prior treatments, and high-value garments.
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

      {/* ── Courses (coming soon) ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-mono font-bold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
            {t('spotterSectionCourses')}
          </p>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', borderColor: 'rgba(245,158,11,0.3)' }}>
            {t('comingSoon')}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('spotterCoursesTagline')}
        </p>
        {COURSES.map((course) => (
          <CourseCard key={course.titleKey} course={course} />
        ))}
      </div>

      {/* Upgrade CTA — dynamic based on tier */}
      {tier !== 'operator' && tier !== 'founder' && (
        <div className="space-y-3">
          <a
            href={tier === 'spotter'
              ? 'https://gonrlabs.lemonsqueezy.com/checkout/buy/21a29828-e007-4989-834f-50b372a82240'
              : 'https://gonrlabs.lemonsqueezy.com/checkout/buy/67c21a2e-ae15-4b25-9021-42c791f80325'}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center space-y-2 rounded-2xl p-5 transition-all hover:scale-[1.01]"
            style={{
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.12), rgba(168, 85, 247, 0.08))',
              border: '2px solid rgba(147, 51, 234, 0.4)',
              boxShadow: '0 0 20px rgba(147, 51, 234, 0.1)',
            }}
          >
            <p className="text-base font-bold" style={{ color: '#a855f7' }}>
              {tier === 'spotter' ? 'Upgrade to Operator — $99/mo' : 'Get Spotter — $49/mo'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {tier === 'spotter'
                ? 'Unlimited Deep Solve, team accounts, custom protocol library, and API access.'
                : 'Unlock all pro tools, garment analysis, and customer handoff scripts.'}
            </p>
            <span
              className="inline-block mt-1 px-5 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #9333ea, #a855f7)' }}
            >
              Upgrade Now
            </span>
          </a>
        </div>
      )}
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
