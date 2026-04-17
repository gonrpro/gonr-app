'use client'

import { useEffect, useState } from 'react'

interface LanguageToggleProps {
  protocolId?: string
  protocolJson: any
  translatedJson: any | null
  initialLang?: 'en' | 'es'
  onTranslated: (translated: any) => void
  onLangChange?: (lang: 'en' | 'es') => void
}

export default function LanguageToggle({
  protocolId,
  protocolJson,
  translatedJson,
  initialLang = 'en',
  onTranslated,
  onLangChange,
}: LanguageToggleProps) {
  const [lang, setLang] = useState<'en' | 'es'>(initialLang)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLang(initialLang)
  }, [initialLang])

  async function toggle() {
    const newLang = lang === 'en' ? 'es' : 'en'

    if (newLang === 'es' && !translatedJson) {
      // Need to fetch translation
      setLoading(true)
      try {
        const res = await fetch('/api/protocols/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            protocolId,
            protocolJson,
            targetLang: 'es',
          }),
        })
        const data = await res.json()
        if (res.ok && data.translated) {
          onTranslated(data.translated)
        }
      } catch {
        // Silent fail — stay on current lang
        setLoading(false)
        return
      }
      setLoading(false)
    }

    setLang(newLang)
    onLangChange?.(newLang)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-strong)',
        color: 'var(--text-secondary)',
      }}
    >
      {loading ? (
        <svg width="12" height="12" viewBox="0 0 16 16" className="animate-spin">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" />
        </svg>
      ) : null}
      <span style={{ color: lang === 'en' ? 'var(--accent)' : 'var(--text-secondary)' }}>EN</span>
      <span>|</span>
      <span style={{ color: lang === 'es' ? 'var(--accent)' : 'var(--text-secondary)' }}>ES</span>
    </button>
  )
}
