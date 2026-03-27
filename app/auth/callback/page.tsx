'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      // The Supabase browser client automatically processes the hash fragment
      // (#access_token=...&refresh_token=...) on initialization.
      // We just need to wait for it then check the session.

      // Small delay to let the client process the hash
      await new Promise(resolve => setTimeout(resolve, 800))

      const { data, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        setError(sessionError.message)
        return
      }

      if (data.session) {
        router.replace('/profile')
        return
      }

      // Fallback: try explicit token exchange for edge cases
      const url = new URL(window.location.href)
      const token = url.searchParams.get('token')
      const tokenHash = url.searchParams.get('token_hash')
      const code = url.searchParams.get('code')
      const type = url.searchParams.get('type') as 'magiclink' | 'email' | 'recovery' | null

      try {
        if (token && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: type === 'magiclink' ? 'magiclink' : 'email' })
          if (error) throw error
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type === 'magiclink' ? 'magiclink' : 'email' })
          if (error) throw error
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else {
          setError('No session found. Please request a new magic link.')
          return
        }

        router.replace('/profile')
      } catch (err: any) {
        console.error('Auth callback error:', err)
        setError(err.message || 'Authentication failed')
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-bold">{t('authErrorTitle')}</h1>
        <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        <a href="/profile" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          {t('authTryAgain')}
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
      <div className="text-4xl">🔄</div>
      <h1 className="text-lg font-semibold">{t('authSigningIn')}</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('authVerifyingCredentials')}
      </p>
    </div>
  )
}
