'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const FEATURES = [
  { titleKey: 'operatorFeature1Title', descKey: 'operatorFeature1Desc', icon: '🔍' },
  { titleKey: 'operatorFeature2Title', descKey: 'operatorFeature2Desc', icon: '💬' },
  { titleKey: 'operatorFeature3Title', descKey: 'operatorFeature3Desc', icon: '📋' },
  { titleKey: 'operatorFeature4Title', descKey: 'operatorFeature4Desc', icon: '👥' },
  { titleKey: 'operatorFeature5Title', descKey: 'operatorFeature5Desc', icon: '📊' },
  { titleKey: 'operatorFeature6Title', descKey: 'operatorFeature6Desc', icon: '🏢' },
] as const

export default function OperatorPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      {/* Header — matches Spotter: left-aligned, no center */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('operatorTitle')}</h1>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md
            bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
            {t('comingSoon')}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('operatorComingSoonSubtitle')}
        </p>
      </div>

      {/* What's coming — matches Spotter section style */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t('operatorWhatsComingHeader')}
        </p>

        <div className="grid gap-3">
          {FEATURES.map((feature) => (
            <div key={feature.titleKey} className="card space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">{feature.icon}</span>
                <h3 className="text-base font-bold">{t(feature.titleKey)}</h3>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t(feature.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Grandfather note + CTA */}
      <div className="space-y-3">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('operatorGrandfatherNote')}
        </p>
        <div
          className="block w-full min-h-[44px] rounded-xl text-sm font-bold
            flex items-center justify-center cursor-default"
          style={{ background: 'rgba(147, 51, 234, 0.1)', color: '#9ca3af', border: '2px solid rgba(147, 51, 234, 0.2)' }}
        >
          Coming Soon
        </div>
      </div>

      {/* Back link */}
      <Link
        href="/spotter"
        className="block text-center text-sm font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        {t('operatorBackToSpotter')}
      </Link>
    </div>
  )
}
