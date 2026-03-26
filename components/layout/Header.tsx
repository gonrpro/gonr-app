'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function Header() {
  const { lang, setLang } = useLanguage()
  const [dark, setDark] = useState(true)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = useCallback(() => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('gonr_theme', next ? 'dark' : 'light')
  }, [dark])

  function toggleLang() {
    const next = lang === 'en' ? 'es' : 'en'
    setLang(next)
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#05070b] backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        {/* GONR wordmark */}
        <div className="select-none" style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1 }}>
          <span style={{ color: '#22c55e' }}>G</span>
          <span className="text-gray-900 dark:text-white">ONR</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg
              text-sm font-semibold text-gray-500 hover:text-gray-900
              dark:text-gray-400 dark:hover:text-white transition-colors"
            aria-label="Toggle language"
          >
            {lang === 'en' ? 'EN' : 'ES'}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg
              text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
        </div>
      </div>

      {/* Thin green accent line */}
      <div className="h-[2px] bg-gradient-to-r from-green-500/80 via-green-500 to-green-500/80" />
    </header>
  )
}
