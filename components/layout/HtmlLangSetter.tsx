'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

/**
 * Sets the <html lang="…"> attribute reactively when the user
 * switches language.  Drop this anywhere inside LanguageProvider
 * (e.g. in layout.tsx's <body>).  It renders nothing visible.
 */
export default function HtmlLangSetter() {
  const { lang } = useLanguage()

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return null
}
