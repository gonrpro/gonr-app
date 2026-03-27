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

  // Profile fields
  const [displayName, setDisplayName] = useState('')
  const [shopName, setShopName] = useState('')
  const [role, setRole] = useState('spotter')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    setSolveCount(parseInt(localStorage.getItem('gonr_solve_count') || '0', 10))
    setDark(document.documentElement.classList.contains('dark'))

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthLoading(false)
      if (data.user) {
        fetch('/api/profile').then(r => r.json()).then(p => {
          if (p.name) setDisplayName(p.name)
          if (p.shop_name) setShopName(p.shop_name)
          if (p.role) setRole(p.role)
          setProfileLoaded(true)
        }).catch(() => setProfileLoaded(true))
      } else {
        setProfileLoaded(true)
      }
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

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileSaved(false)
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName, shop_name: shopName, role }),
      })
      setProfileSaved(true)
      setEditingProfile(false)
      setTimeout(() => setProfileSaved(false), 3000)
    } finally {
      setProfileSaving(false)
    }
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
                {t('profileAccountLabel')}
              </p>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text)' }}>{user.email}</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
              {t('profileSignedIn')}
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
              {t('manageSub')}
            </a>
            <button
              onClick={handleSignOut}
              className="text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
            >
              {t('profileSignOut')}
            </button>
          </div>
        </div>
      ) : sent ? (
        /* Magic link sent */
        <div className="card text-center space-y-2">
          <p className="text-2xl">📧</p>
          <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
            {t('loginCheckEmail')}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('profileMagicLinkSent')} {email}
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="text-xs mt-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('loginUseDifferentEmail')}
          </button>
        </div>
      ) : (
        /* Sign in form */
        <div className="card space-y-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {t('loginSignInTitle')}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {t('profileSignInHint')}
            </p>
          </div>
          <form onSubmit={handleSignIn} className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('loginEmailPlaceholder')}
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
              {sending ? t('loginSending') : t('loginSendMagicLink')}
            </button>
          </form>
        </div>
      )}

      {/* Profile identity (logged in only) */}
      {user && profileLoaded && !editingProfile && (displayName || shopName) && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {t('profileYourProfile')}
            </h2>
            <button
              onClick={() => setEditingProfile(true)}
              className="text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {lang === 'es' ? 'Editar' : 'Edit'}
            </button>
          </div>
          {displayName && (
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('profileDisplayName')}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{displayName}</p>
            </div>
          )}
          {shopName && (
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('profileShopName')}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{shopName}</p>
            </div>
          )}
          {role && (
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('profileRoleLabel')}</p>
              <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-0.5"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {t(role === 'spotter' ? 'profileRoleSpotter' : role === 'counter' ? 'profileRoleCounter' : 'profileRoleOwner')}
              </span>
            </div>
          )}
          {profileSaved && (
            <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>{t('profileSaved')}</p>
          )}
        </div>
      )}

      {user && profileLoaded && (editingProfile || (!displayName && !shopName)) && (
        <form onSubmit={handleSaveProfile} className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {t('profileYourProfile')}
            </h2>
            {profileSaved && (
              <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>
                {t('profileSaved')}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('profileDisplayName')}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={t('profileNamePlaceholder')}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none border mt-1 transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('profileShopName')}
              </label>
              <input
                type="text"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                placeholder={t('profileShopPlaceholder')}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none border mt-1 transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('profileRoleLabel')}
              </label>
              <div className="flex gap-2 mt-1">
                {[
                  { key: 'spotter', tKey: 'profileRoleSpotter' },
                  { key: 'counter', tKey: 'profileRoleCounter' },
                  { key: 'owner', tKey: 'profileRoleOwner' },
                ].map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRole(r.key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: role === r.key ? 'var(--accent)' : 'var(--surface)',
                      color: role === r.key ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {t(r.tKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="w-full py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {profileSaving ? t('profileSaving') : t('profileSave')}
          </button>
          {editingProfile && (
            <button
              type="button"
              onClick={() => setEditingProfile(false)}
              className="w-full py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {lang === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          )}
        </form>
      )}

      {/* Credentials — coming soon */}
      {user && (
        <div className="card space-y-3" style={{ opacity: 0.85 }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {t('profileCredentialsTitle')}
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }}>
              {t('comingSoon')}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('profileCredentialsSubtitle')}
          </p>
          <div className="space-y-2">
            {(['credDli', 'credNca', 'credYears', 'credSpecialties', 'credPortfolio', 'credBadge'] as const).map((key) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border flex-shrink-0" style={{ borderColor: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {t(key)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-semibold" style={{ color: '#d97706' }}>
            {t('profileCredentialsCta')}
          </p>
        </div>
      )}

      {/* Trial status (only for non-logged-in or free tier) */}
      {!user && (
        <div className="card space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {t('profileTrialStatus')}
          </p>
          <p className="text-2xl font-bold" style={{ color: daysRemaining > 0 ? '#22c55e' : '#ef4444' }}>
            {daysRemaining > 0
              ? `${daysRemaining} ${t('profileDaysRemaining')}`
              : t('profileTrialExpired')}
          </p>
          {daysRemaining <= 3 && daysRemaining > 0 && (
            <a
              href="https://gonr.lemonsqueezy.com/checkout/buy/67c21a2e"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-semibold mt-1"
              style={{ color: '#22c55e' }}
            >
              {t('profileUpgradeNow')}
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
            {t('profileUpgradeCta')}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('profileUpgradeDesc')}
          </p>
        </a>
      )}
    </div>
  )
}
