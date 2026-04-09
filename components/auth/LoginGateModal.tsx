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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5 shadow-2xl"
        style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
      >
        {sent ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.12)' }}
              >
                <span className="text-2xl">📧</span>
              </div>
            </div>
            <h2 className="text-xl font-bold" style={{ color: '#111827' }}>
              {lang === 'es' ? 'Revisa tu correo' : 'Check your email'}
            </h2>
            <p className="text-sm" style={{ color: '#6b7280' }}>
              {lang === 'es' ? 'Enviamos un enlace seguro a' : 'We sent a secure link to'}{' '}
              <strong style={{ color: '#111827' }}>{email}</strong>
              <br />
              {lang === 'es' ? 'Toca el enlace para ver tu protocolo.' : 'Tap the link to unlock your protocol.'}
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="text-xs font-medium"
              style={{ color: '#a855f7' }}
            >
              {lang === 'es' ? 'Usar otro correo' : 'Use a different email'}
            </button>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div className="flex justify-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.15), rgba(34,197,94,0.15))' }}
              >
                <span className="text-2xl">🧪</span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold" style={{ color: '#111827' }}>
                {lang === 'es' ? 'Tu protocolo está listo' : 'Your protocol is ready'}
              </h2>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                {lang === 'es'
                  ? 'Sin contraseña. Sin tarjeta. Solo tu correo.'
                  : 'No password. No credit card. Just your email.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={lang === 'es' ? 'tu@ejemplo.com' : 'you@example.com'}
                className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
                style={{ background: '#f9fafb', color: '#111827', border: '2px solid #e5e7eb' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#a855f7'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                autoFocus
                required
              />

              {error && (
                <p className="text-xs text-center" style={{ color: '#ef4444' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #9333ea, #a855f7)', boxShadow: '0 4px 14px rgba(147,51,234,0.3)' }}
              >
                {loading
                  ? (lang === 'es' ? 'Enviando...' : 'Sending...')
                  : (lang === 'es' ? 'Obtener Mi Protocolo' : 'Get My Free Protocol')}
              </button>
            </form>

            <button
              onClick={onClose}
              className="block w-full text-center text-xs"
              style={{ color: '#9ca3af' }}
            >
              {lang === 'es' ? 'Ahora no' : 'Not now'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
