'use client'

import { useState } from 'react'
import { buildCheckoutUrl, isCheckoutLive } from '@/lib/payments/checkoutUrls'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const homeAvailable = isCheckoutLive('home')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    setError('')
    setSubmitting(true)

    const url = buildCheckoutUrl('home', trimmed)
    if (!url) {
      setSubmitting(false)
      setError('Home checkout is not available yet. Please try again soon.')
      return
    }

    window.location.href = url
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Start with GONR Home</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Confident stain removal at home — $7.99/month for unlimited solves,
            safe home-ingredient protocols, and step-by-step guidance.
          </p>
        </div>

        {!homeAvailable ? (
          <div
            className="card text-sm"
            style={{
              padding: '16px',
              border: '1px solid var(--border-strong)',
              borderRadius: '12px',
              background: 'var(--surface)',
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}
          >
            GONR Home checkout is launching shortly. Check back soon, or{' '}
            <a href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              sign in
            </a>{' '}
            if you already have an account.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              disabled={submitting}
            />

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !email.trim()}
            >
              {submitting ? 'Redirecting…' : 'Continue to checkout'}
            </button>
          </form>
        )}

        {error && (
          <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}

        <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <a href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
