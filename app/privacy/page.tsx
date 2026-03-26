'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function PrivacyPage() {
  const { t } = useLanguage()

  const sections = [
    { titleKey: 'privacyDataWeCollect', contentKey: 'privacyDataWeCollectContent' },
    { titleKey: 'privacyHowWeUse', contentKey: 'privacyHowWeUseContent' },
    { titleKey: 'privacyDataSharing', contentKey: 'privacyDataSharingContent' },
    { titleKey: 'privacySecurity', contentKey: 'privacySecurityContent' },
    { titleKey: 'privacyContact', contentKey: 'privacyContactContent' },
  ]

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t('privacyTitle')}</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t('privacyLastUpdated')}: 2026-03-01
        </p>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {t('privacyIntro')}
      </p>

      {sections.map((section) => (
        <div key={section.titleKey} className="space-y-2">
          <h2 className="text-base font-bold">{t(section.titleKey)}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {t(section.contentKey)}
          </p>
        </div>
      ))}
    </div>
  )
}
