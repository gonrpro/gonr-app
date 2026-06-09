'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import GonrLogo from '@/components/brand/GonrLogo'

export default function Header({ brand = 'gonr' }: { brand?: 'gonr' | 'spottingboard' }) {
  const pathname = usePathname()
  const { lang, setLang } = useLanguage()
  const [dark, setDark] = useState(() => (
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  ))

  const toggleTheme = useCallback(() => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('gonr_theme', next ? 'dark' : 'light')
  }, [dark])

  const toggleLang = useCallback(() => {
    const next = lang === 'en' ? 'es' : 'en'
    setLang(next)
  }, [lang, setLang])

  // Workbench routes own their own topbar.
  if (brand === 'spottingboard' && pathname.startsWith('/spottingboard/')) return null

  if (brand === 'spottingboard') {
    return (
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0e1a]/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Spotting Board home" className="flex select-none items-center gap-2.5">
            <span
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: 'linear-gradient(135deg, #00d4aa, #00a085)',
                position: 'relative',
                flex: '0 0 auto',
                boxShadow: '0 0 28px rgba(0,212,170,0.22)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 7,
                  borderRadius: 2,
                  background: '#0a0e1a',
                  display: 'block',
                }}
              />
            </span>
            <span style={{ lineHeight: 1 }}>
              <span className="block text-white" style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Spotting Board
              </span>
              <span className="block" style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                Plant brain workbench
              </span>
            </span>
          </Link>

          <button
            onClick={toggleLang}
            className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-white/70 transition-colors hover:border-white/30 hover:text-white"
            aria-label="Toggle language"
          >
            {lang === 'en' ? 'EN / ES' : 'ES / EN'}
          </button>
        </div>
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, rgba(0,212,170,0.4), #00d4aa, rgba(0,212,170,0.4))' }} />
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#05070b] backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" aria-label="GONR home" className="flex min-h-[44px] items-center">
          <GonrLogo className="w-[112px] sm:w-[124px]" priority tmClassName="text-[6px] sm:text-[7px]" />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleLang}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg
              text-sm font-semibold text-gray-500 hover:text-gray-900
              dark:text-gray-400 dark:hover:text-white transition-colors"
            aria-label="Toggle language"
          >
            {lang === 'en' ? 'EN' : 'ES'}
          </button>
          <button
            onClick={toggleTheme}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg
              text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      <div className="h-[2px] bg-gradient-to-r from-[#f70a75] via-[#e40b86] to-[#ff5a18]" />
    </header>
  )
}
