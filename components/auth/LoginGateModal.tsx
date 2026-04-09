'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface LoginGateModalProps {
  onClose: () => void
  onLoggedIn: (email: string) => void
  redirectPath?: string
}

export default function LoginGateModal({ onClose, onLoggedIn, redirectPath }: LoginGateModalProps) {
  const { t, lang } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const redirectTo = redirectPath
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`
        : `${window.location.origin}/auth/callback`

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      })

      if (authError) throw authError

      // Store email for immediate use after magic link click
      localStorage.setItem('gonr_user_email', email.trim().toLowerCase())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send login link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {sent ? (
          <div className="text-center space-y-3">
            <div className="text-4xl">📧</div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
              {lang === 'es' ? 'Revisa tu correo' : 'Check your email'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {lang === 'es' ? 'Enviamos un enlace a' : 'We sent a link to'}{' '}
              <strong>{email}</strong>.
              <br />
              {lang === 'es' ? 'Haz clic para ver tu protocolo.' : 'Click it to see your protocol.'}
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="text-xs font-medium"
              style={{ color: 'var(--accent)' }}
            >
              {lang === 'es' ? 'Usar otro correo' : 'Use a different email'}
            </button>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                {lang === 'es' ? 'Ingresa tu correo para ver tu protocolo' : 'Enter your email to get your free protocol'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {lang === 'es' ? 'Sin contraseña. Te enviaremos un enlace seguro.' : 'No password needed. We\'ll send you a secure link.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={lang === 'es' ? 'tu@ejemplo.com' : 'you@example.com'}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
                autoFocus
                required
              />

              {error && (
                <p className="text-xs text-center" style={{ color: '#ef4444' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #9333ea, #a855f7)' }}
              >
                {loading
                  ? (lang === 'es' ? 'Enviando...' : 'Sending...')
                  : (lang === 'es' ? 'Obtener Protocolo Gratis' : 'Get Free Protocol')}
              </button>
            </form>

            <button
              onClick={onClose}
              className="block w-full text-center text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {lang === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
