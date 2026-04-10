'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { BADGES, getEarnedBadges, getSpotterScore } from '@/lib/courses/badges'
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

  // Badges & credentials state
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([])
  const [dliMember, setDliMember] = useState(false)
  const [ncaMember, setNcaMember] = useState(false)
  const [yearsExp, setYearsExp] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [credsSaving, setCredsSaving] = useState(false)
  const [credsSaved, setCredsSaved] = useState(false)

  useEffect(() => {
    setSolveCount(parseInt(localStorage.getItem('gonr_solve_count') || '0', 10))
    setDark(document.documentElement.classList.contains('dark'))
    setEarnedBadgeIds(getEarnedBadges())

    const supabase = createClient()
    // Timeout fallback — don't hang forever
    const timeout = setTimeout(() => setAuthLoading(false), 3000)

    supabase.auth.getUser().then(({ data }) => {
      clearTimeout(timeout)
      setUser(data.user)
      setAuthLoading(false)
      if (data.user?.email) {
        fetch(`/api/profile?email=${encodeURIComponent(data.user.email)}`).then(r => r.json()).then(p => {
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
        body: JSON.stringify({ email: user?.email, name: displayName, shop_name: shopName, role }),
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
              href="https://gonrlabs.lemonsqueezy.com"
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

      {/* GONR Badges */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'es' ? 'Insignias GONR' : 'GONR Badges'}
          </h2>
          {earnedBadgeIds.length > 0 && (
            <span className="text-xs font-bold" style={{ color: '#22c55e' }}>
              {lang === 'es' ? 'Puntuación' : 'Score'}: {getSpotterScore()}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {BADGES.map((badge) => {
            const earned = earnedBadgeIds.includes(badge.id)
            return (
              <div
                key={badge.id}
                className="flex flex-col items-center gap-1 rounded-xl p-2 text-center"
                style={{
                  background: earned ? 'rgba(34,197,94,0.06)' : 'var(--surface-2)',
                  border: `1px solid ${earned ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                  opacity: earned ? 1 : 0.4,
                }}
              >
                <span className="text-xl">{badge.icon}</span>
                <span className="text-[9px] font-bold leading-tight" style={{ color: earned ? '#22c55e' : 'var(--text-secondary)' }}>
                  {lang === 'es' ? badge.nameEs : badge.name}
                </span>
                {earned && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#22c55e', color: '#fff' }}>
                    ✓
                  </span>
                )}
              </div>
            )
          })}
        </div>
        {earnedBadgeIds.length === 0 && (
          <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
            {lang === 'es' ? 'Completa cursos para desbloquear insignias' : 'Complete courses to unlock badges'}
          </p>
        )}
      </div>

      {/* Industry Credentials */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {lang === 'es' ? 'Credenciales de la Industria' : 'Industry Credentials'}
        </h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">{lang === 'es' ? 'Miembro de DLI' : 'DLI Member'}</span>
            <button
              onClick={() => setDliMember(!dliMember)}
              className="w-10 h-5 rounded-full transition-colors relative"
              style={{ background: dliMember ? '#22c55e' : 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', left: dliMember ? '20px' : '2px' }}
              />
            </button>
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">{lang === 'es' ? 'Miembro de NCA' : 'NCA Member'}</span>
            <button
              onClick={() => setNcaMember(!ncaMember)}
              className="w-10 h-5 rounded-full transition-colors relative"
              style={{ background: ncaMember ? '#22c55e' : 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', left: ncaMember ? '20px' : '2px' }}
              />
            </button>
          </label>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {lang === 'es' ? 'Años de Experiencia' : 'Years of Experience'}
            </label>
            <select
              value={yearsExp}
              onChange={(e) => setYearsExp(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none border mt-1"
              style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
            >
              <option value="">{lang === 'es' ? 'Seleccionar...' : 'Select...'}</option>
              <option value="1-5">1-5</option>
              <option value="5-10">5-10</option>
              <option value="10-20">10-20</option>
              <option value="20+">20+</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {lang === 'es' ? 'Especialidades' : 'Specialties'}
            </label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {['Spotting', 'Wet Cleaning', 'Leather/Suede', 'Wedding Gowns'].map((spec) => {
                const selected = specialties.includes(spec)
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setSpecialties(selected ? specialties.filter(s => s !== spec) : [...specialties, spec])}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: selected ? '#22c55e' : 'var(--surface-2)',
                      color: selected ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${selected ? 'transparent' : 'var(--border)'}`,
                    }}
                  >
                    {spec}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <button
          onClick={async () => {
            if (!user?.email) return
            setCredsSaving(true)
            try {
              await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: user.email,
                  dli_member: dliMember,
                  nca_member: ncaMember,
                  years_experience: yearsExp,
                  specialties,
                }),
              })
              setCredsSaved(true)
              setTimeout(() => setCredsSaved(false), 3000)
            } finally {
              setCredsSaving(false)
            }
          }}
          disabled={credsSaving || !user}
          className="w-full py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {credsSaving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : credsSaved ? (lang === 'es' ? '✓ Guardado' : '✓ Saved') : (lang === 'es' ? 'Guardar Credenciales' : 'Save Credentials')}
        </button>
        <p className="text-[10px] text-center" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
          {lang === 'es' ? 'Auto-reportado. GONR no verifica credenciales de terceros.' : 'Self-reported. GONR does not verify third-party credentials.'}
        </p>
      </div>

      {/* Industry Resources */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Industry Resources
        </h2>
        <a
          href="https://www.dlionline.org"
          target="_blank"
          rel="noopener noreferrer"
          className="card w-full text-left space-y-1 transition-colors hover:border-green-500/30 block"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🏛️</span>
            <h3 className="text-sm font-bold">Drycleaning & Laundry Institute (DLI)</h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Education, certification, and technical resources. The gold standard for professional development.
          </p>
        </a>
        <a
          href="https://www.nca-i.com"
          target="_blank"
          rel="noopener noreferrer"
          className="card w-full text-left space-y-1 transition-colors hover:border-green-500/30 block"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🏛️</span>
            <h3 className="text-sm font-bold">National Cleaners Association (NCA)</h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Founded 1946. Industry classes, events, and garment analysis services.
          </p>
        </a>
        <a
          href="https://www.tcata.org"
          target="_blank"
          rel="noopener noreferrer"
          className="card w-full text-left space-y-1 transition-colors hover:border-green-500/30 block"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🤝</span>
            <h3 className="text-sm font-bold">TCATA</h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Textile Care Allied Trades Association — equipment, chemicals, and supply distributors.
          </p>
        </a>
        <a
          href="https://www.cleanersupply.com"
          target="_blank"
          rel="noopener noreferrer"
          className="card w-full text-left space-y-1 transition-colors hover:border-green-500/30 block"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🧴</span>
            <h3 className="text-sm font-bold">Cleaner's Supply</h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            28,000+ products. The leading wholesale supplier for dry cleaners since 1992.
          </p>
        </a>
      </div>

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
              href="https://gonrlabs.lemonsqueezy.com/checkout/buy/67c21a2e-ae15-4b25-9021-42c791f80325"
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
          href="https://gonrlabs.lemonsqueezy.com/checkout/buy/67c21a2e-ae15-4b25-9021-42c791f80325"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center space-y-2 rounded-2xl p-5 transition-all hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.12), rgba(168, 85, 247, 0.08))',
            border: '2px solid rgba(147, 51, 234, 0.4)',
            boxShadow: '0 0 20px rgba(147, 51, 234, 0.1)',
          }}
        >
          <p className="text-base font-bold" style={{ color: '#a855f7' }}>
            {t('profileUpgradeCta')}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('profileUpgradeDesc')}
          </p>
          <span
            className="inline-block mt-1 px-5 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #9333ea, #a855f7)' }}
          >
            Upgrade Now
          </span>
        </a>
      )}
    </div>
  )
}
