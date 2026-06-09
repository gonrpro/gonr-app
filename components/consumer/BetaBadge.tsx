'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

// TASK-218 — quiet honest Beta mark for the consumer header.
// Atlas gate: keep it honest, keep it QUIET. A loud badge next to the wordmark
// reads as "unfinished" and costs trust; this is a low-contrast hairline chip with
// a small dot — present if you look, never shouting. Green-free.
export default function BetaBadge() {
  const { t } = useLanguage()
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-gonr-navy/40">
      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gonr-navy/30" />
      {t('common.beta')}
    </span>
  )
}
