'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { BADGES, getEarnedBadges, getSpotterScore } from '@/lib/courses/badges'
import type { User } from '@supabase/supabase-js'
import { buildCheckoutUrl } from '@/lib/payments/checkoutUrls'
import { fetchUsageState, type UsageState } from '@/lib/auth/trialGuard'
import PlantWizardModal, { type ExistingPlant } from '@/components/wizard/PlantWizardModal'

// TASK-034: stale-while-revalidate cache for the profile page.
// Cached payload is painted on mount (feels instant on repeat visits);
// the fetch still fires in the background to refresh state.
const CACHE_KEY = 'gonr_profile_cache_v1'
type ProfileRecord = {
  name?: string
  shop_name?: string
  role?: string
  dli_member?: boolean
  nca_member?: boolean
  years_experience?: string
  specialties?: string[]
}
type CachedPayload = {
  user_email: string | null
  profile: ProfileRecord | null
  plant: ExistingPlant | null
  usage: UsageState | null
}

function loadCached(): CachedPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) as CachedPayload : null
  } catch { return null }
}
function saveCached(payload: CachedPayload): void {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload)) } catch { /* quota / incognito */ }
}

const SOLVENT_LABELS: Record<string, string> = {
  perc: 'Perc', hydrocarbon: 'Hydrocarbon (DF-2000)', 'green-earth': 'GreenEarth (D5)',
  'solvon-k4': 'Solvon K4', sensene: 'Sensene', intense: 'Intense',
  co2: 'CO\u2082', wet: 'Wet cleaning', other: 'Other',
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="card h-20" style={{ background: 'var(--surface-2)' }} />
      <div className="card h-28" style={{ background: 'var(--surface-2)' }} />
      <div className="card h-32" style={{ background: 'var(--surface-2)' }} />
      <div className="card h-24" style={{ background: 'var(--surface-2)' }} />
    </div>
  )
}

export default function ProfilePage() {
  const { t, lang, setLang } = useLanguage()

  // Core state
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [hydratedFromCache, setHydratedFromCache] = useState(false)

  // Data state — seeded from sessionStorage on first render so the page paints
  // immediately on repeat visits (stale-while-revalidate).
  const initial = typeof window !== 'undefined' ? loadCached() : null
  const [profile, setProfile] = useState<ProfileRecord | null>(initial?.profile ?? null)
  const [plant, setPlant] = useState<ExistingPlant | null>(initial?.plant ?? null)
  const [usage, setUsage] = useState<UsageState | null>(initial?.usage ?? null)

  // Local-only UI state
  const [solveCount, setSolveCount] = useState(0)
  const [dark, setDark] = useState(false)
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([])
  const [showWizard, setShowWizard] = useState(false)

  // Sign-in form
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [authError, setAuthError] = useState('')

  // Profile fields (seeded from cache, then refreshed on fetch)
  const [displayName, setDisplayName] = useState(initial?.profile?.name ?? '')
  const [shopName, setShopName] = useState(initial?.profile?.shop_name ?? '')
  const [role, setRole] = useState(initial?.profile?.role ?? 'spotter')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)

  // Credentials fields
  const [dliMember, setDliMember] = useState(initial?.profile?.dli_member ?? false)
  const [ncaMember, setNcaMember] = useState(initial?.profile?.nca_member ?? false)
  const [yearsExp, setYearsExp] = useState(initial?.profile?.years_experience ?? '')
  const [specialties, setSpecialties] = useState<string[]>(initial?.profile?.specialties ?? [])
  const [credsSaving, setCredsSaving] = useState(false)
  const [credsSaved, setCredsSaved] = useState(false)

  // Local-only bits on mount
  useEffect(() => {
    setSolveCount(parseInt(localStorage.getItem('gonr_solve_count') || '0', 10))
    setDark(document.documentElement.classList.contains('dark'))
    setEarnedBadgeIds(getEarnedBadges())
    if (loadCached()) setHydratedFromCache(true)
  }, [])

  // Auth state
  useEffect(() => {
    const supabase = createClient()
    const timeout = setTimeout(() => setAuthLoading(false), 3000)
    supabase.auth.getUser().then(({ data }) => {
      clearTimeout(timeout)
      setUser(data.user)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // TASK-034: parallel data fetch after auth resolves.
  // Previously three separate useEffects waterfalled — auth → profile, plus
  // independent plant + usage effects — so each card popped in on its own.
  // Now: Promise.allSettled fires all three simultaneously. Failed fetches
  // degrade to null rather than blocking the whole page.
  const refreshData = useCallback(async (userEmail: string | undefined) => {
    const fetches: [
      Promise<ProfileRecord | null>,
      Promise<ExistingPlant | null>,
      Promise<UsageState | null>,
    ] = [
      userEmail
        ? fetch(`/api/profile?email=${encodeURIComponent(userEmail)}`)
            .then(r => r.ok ? r.json() as Promise<ProfileRecord | null> : null)
            .catch(() => null)
        : Promise.resolve(null),
      userEmail
        ? fetch('/api/plant')
            .then(r => r.ok ? r.json() as Promise<{ plant?: ExistingPlant } | null> : null)
            .then(d => d?.plant ?? null)
            .catch(() => null)
        : Promise.resolve(null),
      fetchUsageState().catch(() => null),
    ]

    const [pRes, plRes, uRes] = await Promise.allSettled(fetches)
    const pVal = pRes.status === 'fulfilled' ? pRes.value : null
    const plVal = plRes.status === 'fulfilled' ? plRes.value : null
    const uVal = uRes.status === 'fulfilled' ? uRes.value : null

    setProfile(pVal)
    if (pVal) {
      setDisplayName(pVal.name ?? '')
      setShopName(pVal.shop_name ?? '')
      setRole(pVal.role ?? 'spotter')
      setDliMember(!!pVal.dli_member)
      setNcaMember(!!pVal.nca_member)
      setYearsExp(pVal.years_experience ?? '')
      setSpecialties(pVal.specialties ?? [])
    }
    setPlant(plVal)
    setUsage(uVal)
    setDataLoading(false)
    saveCached({ user_email: userEmail ?? null, profile: pVal, plant: plVal, usage: uVal })
  }, [])

  useEffect(() => {
    if (authLoading) return
    // Cache hit for this user → paint from cache, refresh in background.
    // Cache miss → show skeleton until first fetch lands.
    const cached = loadCached()
    if (cached && cached.user_email === (user?.email ?? null)) {
      setDataLoading(false)
    } else {
      setDataLoading(true)
    }
    refreshData(user?.email)
  }, [authLoading, user?.email, refreshData])

  const refreshPlant = useCallback(async () => {
    if (!user?.email) { setPlant(null); return }
    try {
      const res = await fetch('/api/plant')
      if (!res.ok) { setPlant(null); return }
      const data = await res.json() as { plant?: ExistingPlant }
      setPlant(data.plant ?? null)
      const cached = loadCached()
      if (cached) saveCached({ ...cached, plant: data.plant ?? null })
    } catch {
      setPlant(null)
    }
  }, [user?.email])

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
    try { sessionStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
    setUser(null)
    setProfile(null)
    setPlant(null)
    setUsage(null)
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

  async function handleSaveCreds() {
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
  }

  // Derived values
  const solvesRemaining = usage?.solvesRemaining ?? 3
  const solvesUsed = usage?.solvesUsed ?? 0
  const solvesLimit = usage?.limit ?? 3
  const showTrialStatus = !user && usage != null && solvesLimit > 0

  // Hard loading: no auth info AND no cache to paint.
  if (authLoading && !hydratedFromCache) {
    return (
      <div className="space-y-5 pb-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t('profile')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('profileSubtitle')}</p>
        </div>
        <Skeleton />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t('profile')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('profileSubtitle')}</p>
      </div>

      {/* TRIAL STATUS — top of page for anon users, with progress + CTA */}
      {showTrialStatus && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {t('profileTrialStatus')}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {solvesUsed} / {solvesLimit} {t('profileSolvesUsedOfLimit')}
            </p>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: solvesLimit }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full transition-colors"
                style={{
                  background: i < solvesUsed ? 'var(--accent)' : 'var(--surface-2)',
                  opacity: i < solvesUsed ? 1 : 0.6,
                }}
              />
            ))}
          </div>
          {solvesRemaining > 0 ? (
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {solvesRemaining} {solvesRemaining === 1 ? t('profileSolvesRemainingSingular') : t('profileSolvesRemainingPlural')}
            </p>
          ) : (
            <a
              href={buildCheckoutUrl('spotter') ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {t('profileUpgradeCta')}
            </a>
          )}
        </div>
      )}

      {/* ACCOUNT */}
      {user ? (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {t('profileAccountLabel')}
              </p>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text)' }}>{user.email}</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.3)' }}>
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
        <div className="card text-center space-y-2">
          <p className="text-2xl">📧</p>
          <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t('loginCheckEmail')}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('profileMagicLinkSent')} {email}</p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="text-xs mt-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('loginUseDifferentEmail')}
          </button>
        </div>
      ) : (
        <div className="card space-y-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t('loginSignInTitle')}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{t('profileSignInHint')}</p>
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
            {authError && <p className="text-xs" style={{ color: '#ef4444' }}>{authError}</p>}
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

      {/* PLAN — signed-in users (TASK-050) */}
      {user && usage && (
        <div className="card space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Plan
          </p>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {usage.tier === 'home' ? 'GONR Home · $7.99/mo'
                : usage.tier === 'spotter' ? 'GONR Spotter · $49/mo'
                : usage.tier === 'operator' ? 'GONR Operator · $99/mo'
                : usage.tier === 'founder' ? 'GONR Founder'
                : 'Free trial'}
            </p>
            <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              {usage.limit === -1 ? 'Unlimited solves'
                : `${usage.solvesRemaining} / ${usage.limit} solves left`}
            </p>
          </div>
        </div>
      )}

      {/* Logged-in content — skeleton on first visit (cache-miss) */}
      {user && dataLoading && !hydratedFromCache ? (
        <Skeleton />
      ) : user ? (
        <>
          {/* PLANT PROFILE — prominent name + chip-style solvents */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {t('profilePlantSection')}
              </h2>
              <button
                onClick={() => setShowWizard(true)}
                className="text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
                style={{
                  background: plant ? 'var(--surface)' : 'var(--accent)',
                  border: '1px solid var(--border)',
                  color: plant ? 'var(--text-secondary)' : '#fff',
                }}
              >
                {plant ? t('profilePlantEdit') : t('profilePlantSetUp')}
              </button>
            </div>
            {plant ? (
              <div className="space-y-3">
                <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{plant.name}</p>

                {plant.solvents && plant.solvents.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {t('profilePlantSolvents')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {plant.solvents.map(s => (
                        <span
                          key={s}
                          className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                        >
                          {SOLVENT_LABELS[s] ?? s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {plant.solvent_other && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      {t('profilePlantOtherSolvent')}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text)' }}>{plant.solvent_other}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {plant.board && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('profilePlantBoard')}</p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text)' }}>{plant.board.replace(/-/g, ' ')}</p>
                    </div>
                  )}
                  {plant.skill_level && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('profilePlantSkill')}</p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text)' }}>{plant.skill_level}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('profilePlantBleachAllowed')}</p>
                    <p className="text-sm mt-0.5 font-semibold" style={{ color: plant.bleach_allowed ? 'var(--accent)' : 'var(--text)' }}>
                      {plant.bleach_allowed ? t('profilePlantYes') : t('profilePlantNo')}
                    </p>
                  </div>
                </div>

                {plant.house_rules && (
                  <div className="pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('profilePlantHouseRules')}</p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text)' }}>{plant.house_rules}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('profilePlantSetupPrompt')}</p>
            )}
          </div>

          {/* YOUR PROFILE — identity */}
          {!editingProfile && (displayName || shopName) ? (
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
                  {t('profilePlantEdit')}
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
                <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{t('profileSaved')}</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {t('profileYourProfile')}
                </h2>
                {profileSaved && (
                  <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{t('profileSaved')}</span>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('profileDisplayName')}</label>
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
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('profileShopName')}</label>
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
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('profileRoleLabel')}</label>
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
                  {t('profileCancel')}
                </button>
              )}
            </form>
          )}

          {/* GONR BADGES */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {t('profileBadgesTitle')}
              </h2>
              {earnedBadgeIds.length > 0 && (
                <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
                  {t('profileBadgesScore')}: {getSpotterScore()}
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
                    <span className="text-[9px] font-bold leading-tight" style={{ color: earned ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {lang === 'es' ? badge.nameEs : badge.name}
                    </span>
                    {earned && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>
                        ✓
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            {earnedBadgeIds.length === 0 && (
              <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                {t('profileBadgesLocked')}
              </p>
            )}
          </div>

          {/* INDUSTRY CREDENTIALS */}
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {t('profileCredsTitle')}
            </h2>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm">{t('profileCredsDli')}</span>
                <button
                  onClick={() => setDliMember(!dliMember)}
                  className="w-10 h-5 rounded-full transition-colors relative"
                  style={{ background: dliMember ? 'var(--accent)' : 'var(--surface-2)', border: '1px solid var(--border)' }}
                  aria-label={t('profileCredsDli')}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                    style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', left: dliMember ? '20px' : '2px' }}
                  />
                </button>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm">{t('profileCredsNca')}</span>
                <button
                  onClick={() => setNcaMember(!ncaMember)}
                  className="w-10 h-5 rounded-full transition-colors relative"
                  style={{ background: ncaMember ? 'var(--accent)' : 'var(--surface-2)', border: '1px solid var(--border)' }}
                  aria-label={t('profileCredsNca')}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                    style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', left: ncaMember ? '20px' : '2px' }}
                  />
                </button>
              </label>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('profileCredsYears')}</label>
                <select
                  value={yearsExp}
                  onChange={(e) => setYearsExp(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none border mt-1"
                  style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
                >
                  <option value="">{t('profileCredsSelect')}</option>
                  <option value="1-5">1-5</option>
                  <option value="5-10">5-10</option>
                  <option value="10-20">10-20</option>
                  <option value="20+">20+</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('profileCredsSpecialties')}</label>
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
                          background: selected ? 'var(--accent)' : 'var(--surface-2)',
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
              onClick={handleSaveCreds}
              disabled={credsSaving || !user}
              className="w-full py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {credsSaving ? t('profileCredsSaving') : credsSaved ? t('profileCredsSaved') : t('profileCredsSave')}
            </button>
            <p className="text-[10px] text-center" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              {t('profileCredsDisclaimer')}
            </p>
          </div>
        </>
      ) : null}

      {/* STATS — logged-in only */}
      {user && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {t('usage')}
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{solveCount}</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('solvesRun')}</span>
          </div>
        </div>
      )}

      {/* INDUSTRY RESOURCES — now after personal sections */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t('profileResourcesTitle')}
        </h2>
        <a href="https://www.dlionline.org" target="_blank" rel="noopener noreferrer"
          className="card w-full text-left space-y-1 transition-colors hover:border-green-500/30 block">
          <div className="flex items-center gap-2">
            <span className="text-base">🏛️</span>
            <h3 className="text-sm font-bold">Drycleaning & Laundry Institute (DLI)</h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Education, certification, and technical resources. The gold standard for professional development.</p>
        </a>
        <a href="https://www.nca-i.com" target="_blank" rel="noopener noreferrer"
          className="card w-full text-left space-y-1 transition-colors hover:border-green-500/30 block">
          <div className="flex items-center gap-2">
            <span className="text-base">🏛️</span>
            <h3 className="text-sm font-bold">National Cleaners Association (NCA)</h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Founded 1946. Industry classes, events, and garment analysis services.</p>
        </a>
        <a href="https://www.tcata.org" target="_blank" rel="noopener noreferrer"
          className="card w-full text-left space-y-1 transition-colors hover:border-green-500/30 block">
          <div className="flex items-center gap-2">
            <span className="text-base">🤝</span>
            <h3 className="text-sm font-bold">TCATA</h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Textile Care Allied Trades Association — equipment, chemicals, and supply distributors.</p>
        </a>
        <a href="https://www.cleanersupply.com" target="_blank" rel="noopener noreferrer"
          className="card w-full text-left space-y-1 transition-colors hover:border-green-500/30 block">
          <div className="flex items-center gap-2">
            <span className="text-base">🧴</span>
            <h3 className="text-sm font-bold">Cleaner's Supply</h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>28,000+ products. The leading wholesale supplier for dry cleaners since 1992.</p>
        </a>
      </div>

      {/* LANGUAGE */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t('language')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setLang('en')}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: lang === 'en' ? 'var(--accent)' : 'var(--surface)',
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
              background: lang === 'es' ? 'var(--accent)' : 'var(--surface)',
              color: lang === 'es' ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Español
          </button>
        </div>
      </div>

      {/* APPEARANCE */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {t('appearance')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('currentTheme')}: <span className="font-medium" style={{ color: 'var(--text)' }}>{dark ? t('dark') : t('light')}</span>
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('headerThemeHint')}</p>
      </div>

      {/* UPGRADE CTA — anon only, bottom */}
      {!user && (
        <a
          href={buildCheckoutUrl('spotter') ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center space-y-2 rounded-2xl p-5 transition-all hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.12), rgba(168, 85, 247, 0.08))',
            border: '2px solid rgba(147, 51, 234, 0.4)',
            boxShadow: '0 0 20px rgba(147, 51, 234, 0.1)',
          }}
        >
          <p className="text-base font-bold" style={{ color: '#a855f7' }}>{t('profileUpgradeCta')}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('profileUpgradeDesc')}</p>
          <span
            className="inline-block mt-1 px-5 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #9333ea, #a855f7)' }}
          >
            Upgrade Now
          </span>
        </a>
      )}

      <PlantWizardModal
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={() => { setShowWizard(false); refreshPlant() }}
        existingPlant={plant}
      />
    </div>
  )
}
