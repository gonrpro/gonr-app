'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function ProfilePage() {
  const [solveCount, setSolveCount] = useState(0)
  const [dark, setDark] = useState(false)
  const [email, setEmail] = useState('')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSolveCount(parseInt(localStorage.getItem('gonr_solve_count') || '0', 10))
    setDark(document.documentElement.classList.contains('dark'))

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return

    const sb = createBrowserClient(url, key)
    sb.auth.getUser().then(({ data }) => setUser(data.user ?? null))
  }, [])

  async function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return null
    return createBrowserClient(url, key)
  }

  async function handleLogin() {
    if (!email.trim()) return
    const sb = await getSupabase()
    if (!sb) { setError('Auth not configured'); return }
    setLoading(true)
    setError('')
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  async function handleLogout() {
    const sb = await getSupabase()
    if (sb) await sb.auth.signOut()
    setUser(null)
    setSent(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Your GONR account &amp; usage stats.
        </p>
      </div>

      {/* Login / Account */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Account
        </h2>

        {user ? (
          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{user.email}</p>
            <button
              onClick={handleLogout}
              className="text-sm px-4 py-2 rounded-lg"
              style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}
            >
              Sign Out
            </button>
          </div>
        ) : sent ? (
          <div className="space-y-2">
            <p className="text-sm text-green-600 font-medium">✓ Check your email for a login link</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tap the link in your email to sign in.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="email"
              className="input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              onClick={handleLogin}
              disabled={loading || !email.trim()}
              className="btn-primary"
            >
              {loading ? 'Sending...' : 'Send Login Link'}
            </button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Usage
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-green-500">{solveCount}</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>solves run</span>
        </div>
      </div>

      {/* Theme */}
      <div className="card space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Appearance
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Current theme: <span className="font-medium" style={{ color: 'var(--text)' }}>{dark ? 'Dark' : 'Light'}</span>
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Use the header toggle to switch.</p>
      </div>
    </div>
  )
}
