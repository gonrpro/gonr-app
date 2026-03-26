'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { strings } from './strings'

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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gonr_lang') || 'en'
    }
    return 'en'
  })

  function setLang(next: string) {
    setLangState(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem('gonr_lang', next)
    }
  }

  function t(key: string): string {
    return strings[key]?.[lang] || strings[key]?.en || key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
