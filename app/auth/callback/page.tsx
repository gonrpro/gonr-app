'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      // Magic links: Supabase sends ?code= (PKCE flow)
      // Token links: Supabase sends #access_token= in hash
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')

      try {
        if (code) {
          // PKCE code exchange
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (tokenHash && type) {
          // Token hash flow (magic link)
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
          if (error) throw error
        } else {
          // Try getting session from hash fragment (legacy)
          const { error } = await supabase.auth.getSession()
          if (error) throw error
        }

        // Redirect to profile so user sees they're logged in
        router.replace('/profile')
      } catch (err: any) {
        setError(err.message || 'Authentication failed')
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-bold">Authentication Error</h1>
        <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        <a href="/profile" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          Try again
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
      <div className="text-4xl">🔄</div>
      <h1 className="text-lg font-semibold">Signing you in...</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Please wait while we verify your credentials.
      </p>
    </div>
  )
}
