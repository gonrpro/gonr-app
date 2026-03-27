'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import Link from 'next/link'

const COMING_FEATURES = [
  {
    icon: '📸',
    title: 'Garment Analysis',
    description: 'Photo-based AI assessment. Root cause, repairability verdict, fiber concerns — before you touch it.',
  },
  {
    icon: '🛡️',
    title: 'Legal-Shield Customer Handoff',
    description: 'Documented intake scripts, ticket notes, and pickup communication that protects your shop and builds customer trust.',
  },
  {
    icon: '📋',
    title: 'Problem Garment Queue',
    description: 'Spotters flag tough cases. You review, analyze, and action — from anywhere.',
  },
  {
    icon: '👥',
    title: 'Team Seats',
    description: 'Add spotters and counter staff under one account. Everyone sees what they need, nothing they don\'t.',
  },
  {
    icon: '📊',
    title: 'Training Dashboard',
    description: 'Knowledge scores, protocol quiz results, and training progress across your entire team.',
  },
  {
    icon: '🏪',
    title: 'Multi-Location',
    description: 'Run multiple plants from one login. Compare performance. Share protocols.',
  },
]

export default function OperatorPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold tracking-tight">Operator</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }}>
            COMING SOON
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Built for the plant owner who runs the whole operation — not just the spotting board.
        </p>
      </div>

      {/* Vision statement */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text)' }}>
          "A customer drops off a $2,000 suit. Your spotter flags it. You analyze the photo, assess the risk, generate a documented handoff script — and your counter person delivers it word for word. No guessing. No liability."
        </p>
        <p className="text-xs mt-2 font-semibold" style={{ color: '#d97706' }}>
          That's what Operator makes possible.
        </p>
      </div>

      {/* Features */}
      <div>
        <p className="text-[10px] font-mono font-bold tracking-wider uppercase mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>
          What's coming
        </p>
        <div className="space-y-3">
          {COMING_FEATURES.map((feature) => (
            <div key={feature.title} className="card flex gap-3 items-start">
              <span className="text-xl shrink-0 mt-0.5">{feature.icon}</span>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{feature.title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grandfathering CTA */}
      <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Early Spotter subscribers get grandfathered pricing</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Sign up for Spotter now and lock in your rate before Operator launches.
        </p>
        <Link
          href="https://gonr.lemonsqueezy.com/checkout/buy/67c21a2e"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: '#22c55e' }}
        >
          Get Spotter — $49/mo
        </Link>
      </div>

      {/* Back to Spotter */}
      <div className="text-center">
        <Link href="/spotter" className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          ← Back to Spotter tools
        </Link>
      </div>
    </div>
  )
}
