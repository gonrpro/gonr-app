'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

// TASK-218 — visible EN/ES toggle for the consumer surface. Reads/writes the
// shared LanguageContext (persisted to localStorage, rehydrated per subroute),
// so flipping here changes every t(key) render across /solve-v2 and threads the
// chosen language into the engine via the intake call.
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLanguage()
  const isEs = lang === 'es'

  return (
    <div
      role="group"
      aria-label={t('language.toggleAria')}
      className={`inline-flex items-center overflow-hidden rounded-full border border-gonr-navy/15 bg-white/70 text-[11px] font-black ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={!isEs}
        lang="en"
        className={`px-2.5 py-1 transition ${!isEs ? 'bg-gonr-navy text-white' : 'text-gonr-navy/60'}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('es')}
        aria-pressed={isEs}
        lang="es"
        className={`px-2.5 py-1 transition ${isEs ? 'bg-gonr-navy text-white' : 'text-gonr-navy/60'}`}
      >
        ES
      </button>
    </div>
  )
}
