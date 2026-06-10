'use client'

import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// TASK-232 — immediate first-aid banner. Renders STATICALLY the moment a
// stain check starts (thinking/asking phases) so conservative protect-first
// guidance is visible while the model works — the stain must not set during
// Q&A. Copy mirrors the server-side card.firstAid block (lib/solve/first-aid)
// and never implies removal or treatment permission: blot, no heat, no
// chemistry, check label.

const STEP_KEYS = ['firstaid.blot', 'firstaid.noheat', 'firstaid.nochem', 'firstaid.label'] as const

export default function FirstAidBanner({ className = '' }: { className?: string }) {
  const { t } = useLanguage()
  return (
    <section aria-label={t('firstaid.aria')} className={`gonr-card border border-gonr-navy/10 p-4 ${className}`}>
      <p className="flex items-center gap-2 text-sm font-black text-gonr-navy">
        <ShieldCheck size={16} className="text-gonr-hotpink" aria-hidden="true" />
        {t('firstaid.headline')}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {STEP_KEYS.map((k) => (
          <li key={k} className="text-[13px] font-semibold leading-5 text-gonr-textgray">
            • {t(k)}
          </li>
        ))}
      </ul>
    </section>
  )
}
