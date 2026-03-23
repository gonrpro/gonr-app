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

      // Supabase client-side auth automatically picks up the
      // hash fragment or code from the URL
      const { error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        setError(sessionError.message)
        return
      }

      // Exchange code if present in URL params
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError(exchangeError.message)
          return
        }
      }

      // Redirect to home on success
      router.replace('/')
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-bold">Authentication Error</h1>
        <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
        <a
          href="/auth/login"
          className="text-sm font-medium"
          style={{ color: 'var(--accent)' }}
        >
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
