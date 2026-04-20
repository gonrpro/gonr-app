'use client'

// /auth/signup — TASK-054.
//
// Flow change: anon users used to be redirected straight to the LemonSqueezy
// Home checkout on submit. That gutted the funnel because they'd never feel
// the product's value before a credit-card ask.
//
// Now: email → supabase.auth.signInWithOtp → magic link → 3 free email-tracked
// solves → paywall on exhaustion (trial_expired branch, already built). Home
// checkout now fires ONLY from the paywall after the user has used their free
// solves. /auth/login is unchanged — it was already correct.
//
// A small "Dry cleaner or pro?" link is rendered below the main Sign-In link
// for pro users who land here. It routes to /pro which explains Spotter +
// Operator. Zero friction added for the 80%+ home audience that should stay
// on this single-CTA flow.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail]     = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    setError('')
    setSending(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (authError) throw authError
      // Store the email locally so the first authed solve can prefill it
      // after the magic link round-trip. Matches LoginGateModal's pattern.
      try { localStorage.setItem('gonr_user_email', trimmed.toLowerCase()) } catch { /* incognito */ }
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send link')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-10">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="text-3xl">📧</p>
          <h1 className="text-xl font-bold">Check your email</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            We sent a secure link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
            Tap it to unlock your 3 free solves.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="text-xs font-medium mt-2"
            style={{ color: 'var(--accent)', background: 'transparent', border: 'none' }}
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Create your free account</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            3 free solves. No credit card. Just your email.
          </p>
        </div>

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
            disabled={sending}
          />

          <button
            type="submit"
            className="btn-primary"
            disabled={sending || !email.trim()}
          >
            {sending ? 'Sending…' : 'Send me the link'}
          </button>
        </form>

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

        {/* TASK-054: pro escape hatch. Small, discoverable, zero friction
            for the home funnel. Routes to /pro which owns the tier comparison. */}
        <p className="text-xs text-center" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
          Dry cleaner or pro?{' '}
          <a href="/pro" style={{ color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'underline' }}>
            See Spotter &amp; Operator →
          </a>
        </p>
      </div>
    </div>
  )
}
