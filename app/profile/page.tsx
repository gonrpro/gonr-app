'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function ProfilePage() {
  const { t, lang, setLang } = useLanguage()
  const [solveCount, setSolveCount] = useState(0)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setSolveCount(parseInt(localStorage.getItem('gonr_solve_count') || '0', 10))
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t('profile')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t('profileSubtitle')}
        </p>
      </div>

      {/* Stats card */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t('usage')}
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-green-500">{solveCount}</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('solvesRun')}</span>
        </div>
      </div>

      {/* Language toggle */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t('language')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setLang('en')}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: lang === 'en' ? 'var(--green)' : 'var(--surface-2)',
              color: lang === 'en' ? '#000' : 'var(--text-secondary)',
              border: '1px solid var(--border-strong)'
            }}
          >
            English
          </button>
          <button
            onClick={() => setLang('es')}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: lang === 'es' ? 'var(--green)' : 'var(--surface-2)',
              color: lang === 'es' ? '#000' : 'var(--text-secondary)',
              border: '1px solid var(--border-strong)'
            }}
          >
            Español
          </button>
        </div>
      </div>

      {/* Theme preference */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t('appearance')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('currentTheme')}: <span className="font-medium" style={{ color: 'var(--text)' }}>{dark ? t('dark') : t('light')}</span>
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('headerThemeHint')}
        </p>
      </div>

      {/* Tier CTA */}
      <a
        href="https://gonrlabs.lemonsqueezy.com"
        target="_blank"
        rel="noopener noreferrer"
        className="block card text-center space-y-2 hover:border-green-500/30 transition-colors"
      >
        <p className="text-sm font-semibold">{t('upgradeToGonrPro')}</p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('unlockProFeatures')}
        </p>
      </a>
    </div>
  )
}
