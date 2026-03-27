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
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
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

      {/* Vision quote */}
      <div className="card text-center space-y-2 border-amber-500/20">
        <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          &ldquo;{t('operatorVisionQuote')}&rdquo;
        </p>
        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          &mdash; {t('operatorVisionAttribution')}
        </p>
      </div>

      {/* What's coming */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t('operatorWhatsComingHeader')}
        </h2>

        <div className="grid gap-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.titleKey}
              className="card space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{feature.icon}</span>
                <h3 className="text-sm font-bold">{t(feature.titleKey)}</h3>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t(feature.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Grandfather note + CTA */}
      <div className="text-center space-y-3">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('operatorGrandfatherNote')}
        </p>
        <a
          href="https://gonrlabs.lemonsqueezy.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full min-h-[44px] rounded-xl bg-amber-500 text-black text-sm font-semibold
            hover:bg-amber-400 transition-colors flex items-center justify-center"
        >
          {t('operatorGetSpotterCta')}
        </a>
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
