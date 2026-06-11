'use client'

import { Shirt, Loader2 } from 'lucide-react'
import GonrLogo from '@/components/brand/GonrLogo'
import FirstAidBanner from '@/components/consumer/FirstAidBanner'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// TASK-240 — static boot shell for /solve-v2/solve. Previously this route
// rendered NOTHING (Suspense fallback={null} + a null pre-boot return) until
// hydration + the sessionStorage boot effect finished — a blank content
// window on every entry. This shell mirrors the AgenticIntake Shell layout
// (logo row, context card, thinking line) and puts the conservative
// first-aid guidance on screen from the very first paint. No search params,
// no effects — safe as a Suspense fallback and as route loading UI.
export default function SolveBootShell() {
  const { t } = useLanguage()
  return (
    <main
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-28 pt-5 lg:max-w-[960px] lg:px-10 lg:pb-12 lg:pt-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <GonrLogo className="w-[104px] lg:invisible" priority tmClassName="text-[6px]" />
        <span className="text-xs font-extrabold uppercase tracking-wide text-gonr-textgray">
          {t('intake.tagline')}
        </span>
      </div>

      <div className="gonr-card mt-5 flex items-center gap-3 p-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
          <Shirt size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-gonr-textgray">
            {t('intake.contextShownLabel')}
          </p>
          <div className="mt-1 h-4 w-2/3 animate-pulse rounded-full bg-gonr-navy/10" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 px-1">
        <Loader2 size={18} className="animate-spin text-gonr-hotpink" aria-hidden="true" />
        <p className="text-sm font-bold text-gonr-textgray">{t('intake.loading.reading')}</p>
      </div>

      <FirstAidBanner className="mt-4" />
    </main>
  )
}
