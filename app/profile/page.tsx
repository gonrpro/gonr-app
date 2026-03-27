'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function ProfilePage() {
  const { t, lang, setLang } = useLanguage()
  const [solveCount, setSolveCount] = useState(0)
  const [dark, setDark] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Sign-in form state
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    setSolveCount(parseInt(localStorage.getItem('gonr_solve_count') || '0', 10))
    setDark(document.documentElement.classList.contains('dark'))

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setAuthError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to send link')
    } finally {
      setSending(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  // Trial days remaining
  const trialStart = typeof window !== 'undefined' ? parseInt(localStorage.getItem('gonr_trial_start') || '0', 10) : 0
  const daysRemaining = trialStart
    ? Math.max(0, Math.ceil(7 - (Date.now() - trialStart) / (1000 * 60 * 60 * 24)))
    : 7

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t('profile')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t('profileSubtitle')}
        </p>
      </div>

      {/* Auth section */}
      {authLoading ? (
        <div className="card">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>...</p>
        </div>
      ) : user ? (
        /* Logged in */
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {lang === 'es' ? 'Cuenta' : 'Account'}
              </p>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text)' }}>{user.email}</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
              {lang === 'es' ? 'Conectado' : 'Signed in'}
            </span>
          </div>
          <div className="flex gap-2 pt-1">
            <a
              href="https://gonr.lemonsqueezy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-xs font-semibold py-2 rounded-lg transition-colors"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              {lang === 'es' ? 'Gestionar Suscripción' : 'Manage Subscription'}
            </a>
            <button
              onClick={handleSignOut}
              className="text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
            >
              {lang === 'es' ? 'Salir' : 'Sign Out'}
            </button>
          </div>
        </div>
      ) : sent ? (
        /* Magic link sent */
        <div className="card text-center space-y-2">
          <p className="text-2xl">📧</p>
          <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
            {lang === 'es' ? 'Revisa tu correo' : 'Check your email'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'es'
              ? `Enviamos un enlace de inicio de sesión a ${email}`
              : `We sent a sign-in link to ${email}`}
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="text-xs mt-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {lang === 'es' ? 'Usar otro correo' : 'Use a different email'}
          </button>
        </div>
      ) : (
        /* Sign in form */
        <div className="card space-y-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {lang === 'es' ? 'Iniciar sesión' : 'Sign in to your account'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {lang === 'es'
                ? 'Accede a tu suscripción desde cualquier dispositivo. Sin contraseña.'
                : 'Access your subscription from any device. No password needed.'}
            </p>
          </div>
          <form onSubmit={handleSignIn} className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={lang === 'es' ? 'tu@correo.com' : 'you@example.com'}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors"
              style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
              required
            />
            {authError && (
              <p className="text-xs" style={{ color: '#ef4444' }}>{authError}</p>
            )}
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {sending
                ? (lang === 'es' ? 'Enviando...' : 'Sending...')
                : (lang === 'es' ? 'Enviar enlace mágico' : 'Send Magic Link')}
            </button>
          </form>
        </div>
      )}

      {/* Trial status (only for non-logged-in or free tier) */}
      {!user && (
        <div className="card space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'es' ? 'Estado de prueba' : 'Trial Status'}
          </p>
          <p className="text-2xl font-bold" style={{ color: daysRemaining > 0 ? '#22c55e' : '#ef4444' }}>
            {daysRemaining > 0
              ? (lang === 'es' ? `${daysRemaining} días restantes` : `${daysRemaining} days remaining`)
              : (lang === 'es' ? 'Prueba expirada' : 'Trial expired')}
          </p>
          {daysRemaining <= 3 && daysRemaining > 0 && (
            <a
              href="https://gonr.lemonsqueezy.com/checkout/buy/67c21a2e"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-semibold mt-1"
              style={{ color: '#22c55e' }}
            >
              {lang === 'es' ? 'Actualizar ahora →' : 'Upgrade now →'}
            </a>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t('usage')}
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-green-500">{solveCount}</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('solvesRun')}</span>
        </div>
      </div>

      {/* Language */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t('language')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setLang('en')}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: lang === 'en' ? '#22c55e' : 'var(--surface)',
              color: lang === 'en' ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            English
          </button>
          <button
            onClick={() => setLang('es')}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: lang === 'es' ? '#22c55e' : 'var(--surface)',
              color: lang === 'es' ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Español
          </button>
        </div>
      </div>

      {/* Theme */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t('appearance')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('currentTheme')}: <span className="font-medium" style={{ color: 'var(--text)' }}>{dark ? t('dark') : t('light')}</span>
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('headerThemeHint')}
        </p>
      </div>

      {/* Upgrade CTA */}
      {!user && (
        <a
          href="https://gonr.lemonsqueezy.com/checkout/buy/67c21a2e"
          target="_blank"
          rel="noopener noreferrer"
          className="block card text-center space-y-1 hover:border-green-500/30 transition-colors"
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {lang === 'es' ? 'Actualizar a Spotter — $49/mes' : 'Upgrade to Spotter — $49/mo'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'es'
              ? 'Acceso completo: Chemical Reference, Stain Brain, Deep Solve y más'
              : 'Full access: Chemical Reference, Stain Brain, Deep Solve, and more'}
          </p>
        </a>
      )}
    </div>
  )
}
