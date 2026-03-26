'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function PartnersPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t('partnersTitle')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t('partnersSubtitle')}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-base font-bold">{t('partnersWhyPartner')}</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('partnersWhyPartnerContent')}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-base font-bold">{t('partnersModels')}</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('partnersModelsContent')}
        </p>
      </div>

      <div className="card space-y-3 text-center">
        <h2 className="text-base font-bold">{t('partnersContact')}</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('partnersContactContent')}
        </p>
        <a
          href="mailto:tyler@gonr.pro"
          className="inline-block px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600
            text-white text-sm font-semibold transition-colors"
        >
          tyler@gonr.pro
        </a>
      </div>
    </div>
  )
}
