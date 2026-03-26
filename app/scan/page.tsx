'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function ScanPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t('scan')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t('scanSubtitle')}
        </p>
      </div>

      <div className="card flex flex-col items-center justify-center py-16 space-y-4">
        <span className="text-5xl">📷</span>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {t('comingSoon')}
        </p>
        <p className="text-xs text-center max-w-[260px]" style={{ color: 'var(--text-secondary)' }}>
          {t('scanPageDesc')}
        </p>
      </div>
    </div>
  )
}
