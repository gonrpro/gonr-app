'use client'

// TASK-070 — /auth/error — simple error surface the callback route
// redirects to when PKCE/code exchange fails. Pure display, no auth work.
// The server-side route handler at /auth/callback/route.ts is the
// authoritative exchange path now; this page renders the friendly error.

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function AuthErrorInner() {
  const { t } = useLanguage()
  const params = useSearchParams()
  const reason = params.get('error') || 'unknown'
  const pretty = decodeURIComponent(reason)

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
      <div className="text-4xl">⚠️</div>
      <h1 className="text-xl font-bold">{t('authErrorTitle') || 'Authentication Error'}</h1>
      <p className="text-sm max-w-md" style={{ color: '#ef4444' }}>
        {pretty === 'no_code'
          ? 'No authentication code was present in the link. Request a new magic link from the sign-in page.'
          : pretty === 'unsupported_params'
            ? 'This link format is not recognized. Request a new magic link from the sign-in page.'
            : `Sign-in could not be completed: ${pretty}`}
      </p>
      <p className="text-xs max-w-md" style={{ color: 'var(--text-secondary)' }}>
        Tip: open the magic link in the same browser where you entered your email.
      </p>
      <a href="/auth/signup" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
        {t('authTryAgain') || 'Try again'}
      </a>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">…</div>}>
      <AuthErrorInner />
    </Suspense>
  )
}
