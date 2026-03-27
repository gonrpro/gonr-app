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
      const url = new URL(window.location.href)

      const code = url.searchParams.get('code')
      const token = url.searchParams.get('token')          // legacy magic link format
      const tokenHash = url.searchParams.get('token_hash') // newer PKCE format
      const type = url.searchParams.get('type') as 'magiclink' | 'email' | 'recovery' | null
      const errorDesc = url.searchParams.get('error_description')

      if (errorDesc) {
        setError(errorDesc)
        return
      }

      try {
        if (token && type) {
          // Legacy magic link format: ?token=...&type=magiclink
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type === 'magiclink' ? 'magiclink' : 'email',
          })
          if (error) throw error
        } else if (tokenHash && type) {
          // Newer PKCE format: ?token_hash=...&type=...
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type === 'magiclink' ? 'magiclink' : 'email',
          })
          if (error) throw error
        } else if (code) {
          // PKCE code exchange
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else {
          // Fallback — check if session already exists (hash fragment flow)
          await new Promise(resolve => setTimeout(resolve, 500))
          const { data, error } = await supabase.auth.getSession()
          if (error) throw error
          if (!data.session) {
            setError('No session found. Please request a new magic link.')
            return
          }
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
