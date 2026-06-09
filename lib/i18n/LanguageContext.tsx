'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { strings } from './strings'

const STORAGE_KEY = 'gonr_lang'
// One year, in seconds — matches localStorage persistence longevity.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

type Lang = 'en' | 'es'
const SUPPORTED: readonly Lang[] = ['en', 'es']

function normalizeLang(value: string | null | undefined): Lang | null {
  return value && (SUPPORTED as readonly string[]).includes(value) ? (value as Lang) : null
}

interface LanguageContextType {
  lang: string
  setLang: (lang: string) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => strings[key]?.en || key,
})

export function LanguageProvider({
  children,
  initialLang = 'en',
}: {
  children: ReactNode
  /**
   * Server-resolved language from the `gonr_lang` cookie (see app/layout.tsx).
   * The server can't read localStorage, but it CAN read the cookie, so it
   * renders the first paint in the correct language. The client's first render
   * reads this same prop, so hydration matches exactly — no English flash on a
   * fresh/direct /solve-v2 load.
   */
  initialLang?: string
}) {
  const [lang, setLangState] = useState<string>(() => normalizeLang(initialLang) ?? 'en')

  const setLang = useCallback((next: string) => {
    const safe = normalizeLang(next)
    if (!safe) return
    setLangState(safe)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, safe)
      // Mirror into a cookie so the SERVER can render the correct language on
      // the next fresh/direct load (the flash-free path).
      document.cookie = `${STORAGE_KEY}=${safe}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
      // Keep <html lang> in sync for a11y/SEO (HtmlLangSetter also mirrors this).
      document.documentElement.lang = safe
    }
  }, [])

  useEffect(() => {
    // Legacy bridge: users who selected a language BEFORE the cookie existed
    // only have it in localStorage. On their first post-deploy load the cookie
    // is absent, so the server rendered the default; pick up their stored choice
    // and write the cookie so every later load is flash-free.
    if (typeof window === 'undefined') return
    const stored = normalizeLang(localStorage.getItem(STORAGE_KEY))
    if (stored && stored !== lang) setLang(stored)
    // mount-only migration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t = useCallback(
    (key: string): string => strings[key]?.[lang] || strings[key]?.en || key,
    [lang],
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
