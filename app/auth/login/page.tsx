'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function LoginPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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
