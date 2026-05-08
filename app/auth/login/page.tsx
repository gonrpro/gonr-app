'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null
  return next
}

function isSpottingBoardHost(): boolean {
  return typeof window !== 'undefined' && ['spottingboard.com', 'www.spottingboard.com'].includes(window.location.hostname)
}

function LoginForm() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const [isSpottingBoard, setIsSpottingBoard] = useState(false)
  const requestedSpottingBoard = searchParams.get('brand') === 'spottingboard' || searchParams.get('next')?.startsWith('/spottingboard')
  const spottingBoardBrand = isSpottingBoard || requestedSpottingBoard
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setIsSpottingBoard(isSpottingBoardHost())
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const nextPath = safeNextPath(searchParams.get('next')) ?? (spottingBoardBrand ? '/spottingboard/intake' : '/solve')
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Always include a query string so the Supabase email template can append
          // token_hash/type with `&...` for cross-browser magic-link reliability.
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      })

      if (authError) throw authError
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loginFailedToSend'))
    } finally {
      setLoading(false)
    }
  }

  if (spottingBoardBrand) {
    if (sent) {
      return (
        <div className="sb-login-shell">
          <section className="sb-login-card sb-login-card-sent" aria-label="Spotting Board magic link sent">
            <div className="sb-login-mark" aria-hidden="true" />
            <div className="sb-login-kicker">Private plant brain workbench</div>
            <h1>Check your email</h1>
            <p>
              We sent a secure Spotting Board magic link to <strong>{email}</strong>.
              Tap it to open Jerry’s Cleaners’ plant brain workbench.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="sb-login-secondary"
            >
              Use a different email
            </button>
          </section>
        </div>
      )
    }

    return (
      <div className="sb-login-shell">
        <section className="sb-login-card" aria-label="Spotting Board sign in">
          <h1>Sign in to your plant brain</h1>
          <p className="sb-login-copy">
            Operator-owned capture, review, and export for your plant’s stain knowledge. No runtime guidance goes live without review.
          </p>

          <form onSubmit={handleSubmit} className="sb-login-form">
            <label>
              <span>Email</span>
              <input
                type="email"
                placeholder="operator@yourplant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </label>

            <button type="submit" disabled={loading || !email.trim()}>
              {loading ? 'Sending secure link…' : 'Send magic link'}
            </button>
          </form>

          {error && <p className="sb-login-error" role="alert">{error}</p>}

          <div className="sb-login-trust">
            <span>Plant-local by default</span>
            <span>Supervisor reviewed</span>
            <span>Export anytime</span>
          </div>
        </section>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <div className="text-4xl">📧</div>
        <h1 className="text-xl font-bold">{t('loginCheckEmail')}</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('loginMagicLinkSent')} <strong>{email}</strong>.
          <br />{t('loginClickLink')}
        </p>
        <button
          onClick={() => { setSent(false); setEmail('') }}
          className="text-sm font-medium mt-4"
          style={{ color: 'var(--accent)' }}
        >
          {t('loginUseDifferentEmail')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">{t('loginSignInTitle')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('loginEnterEmailHint')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            className="input"
            placeholder={t('loginEmailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !email.trim()}
          >
            {loading ? t('loginSending') : t('loginSendMagicLink')}
          </button>
        </form>

        {error && (
          <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}

        <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
          {t('loginNoPasswordNeeded')}
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
