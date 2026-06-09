'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  User as UserIcon,
  Bell,
  ShoppingBag,
  Trash2,
  Info,
  Sparkles,
  ChevronDown,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/consumer/BottomNav'
import { createClient } from '@/lib/supabase/client'
import { getStoredUserEmail } from '@/lib/auth/clientEmail'

// TASK-218 Screen 15 — SETTINGS / PROFILE. Lean consumer settings, premium and
// green-free. Marketing toggles (alerts / product recs) are LOCAL preferences and
// NEVER suppress safety content. Clear history is destructive → two-step confirm →
// soft-clear via DELETE /api/solves/history (the rep moat is preserved server-side).
// No operator/plant/credential sections here — this is the consumer view.

const PREF_ALERTS = 'gonr_pref_stain_alerts'
const PREF_RECS = 'gonr_pref_product_recs'

interface ProfileRecord {
  name?: string | null
}

function readPref(key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writePref(key: string, value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // incognito / quota — preference simply isn't persisted.
  }
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null)
  const [authResolved, setAuthResolved] = useState(false)

  // Sign-in (magic link)
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [authError, setAuthError] = useState('')

  // Display name
  const [name, setName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  // Preferences (local, marketing-only)
  const [alerts, setAlerts] = useState(false)
  const [recs, setRecs] = useState(false)

  // Clear history
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [cleared, setCleared] = useState(false)

  // Info accordions
  const [openInfo, setOpenInfo] = useState<'about' | 'how' | null>(null)

  useEffect(() => {
    setAlerts(readPref(PREF_ALERTS))
    setRecs(readPref(PREF_RECS))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let active = true
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return
        setUser(data.user)
        setAuthResolved(true)
      })
      .catch(() => {
        if (active) setAuthResolved(true)
      })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // Load display name once we have an authenticated email.
  useEffect(() => {
    const email = user?.email
    if (!email) return
    let active = true
    void (async () => {
      try {
        const res = await fetch(`/api/profile?email=${encodeURIComponent(email)}`)
        if (!res.ok || !active) return
        const data = (await res.json()) as ProfileRecord
        if (active && typeof data.name === 'string') setName(data.name)
      } catch {
        // non-fatal — name field simply stays empty/editable.
      }
    })()
    return () => {
      active = false
    }
  }, [user?.email])

  const handleSignIn = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const email = emailInput.trim().toLowerCase()
      if (!email) return
      setSending(true)
      setAuthError('')
      try {
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/solve-v2/profile` },
        })
        if (error) throw error
        try {
          window.localStorage.setItem('gonr_user_email', email)
        } catch {
          // non-fatal
        }
        setSent(true)
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Could not send the link. Try again.')
      } finally {
        setSending(false)
      }
    },
    [emailInput],
  )

  const handleSignOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    try {
      window.localStorage.removeItem('gonr_user_email')
      window.sessionStorage.removeItem('gonr_profile_cache_v1')
    } catch {
      // non-fatal
    }
    setUser(null)
    setName('')
    setSent(false)
    setEmailInput('')
  }, [])

  const handleSaveName = useCallback(async () => {
    const email = user?.email
    if (!email) return
    setNameSaving(true)
    setNameSaved(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name.trim() }),
      })
      if (res.ok) {
        setNameSaved(true)
        window.setTimeout(() => setNameSaved(false), 2500)
      }
    } catch {
      // non-fatal — leave the field as-is.
    } finally {
      setNameSaving(false)
    }
  }, [user?.email, name])

  const toggleAlerts = useCallback(() => {
    setAlerts((prev) => {
      const next = !prev
      writePref(PREF_ALERTS, next)
      return next
    })
  }, [])

  const toggleRecs = useCallback(() => {
    setRecs((prev) => {
      const next = !prev
      writePref(PREF_RECS, next)
      return next
    })
  }, [])

  const handleClearHistory = useCallback(async () => {
    setClearing(true)
    try {
      await fetch('/api/solves/history', { method: 'DELETE', credentials: 'include' })
      setCleared(true)
      window.setTimeout(() => setCleared(false), 3000)
    } catch {
      // non-fatal — surface nothing destructive on failure.
    } finally {
      setClearing(false)
      setConfirmClear(false)
    }
  }, [])

  const storedEmail = getStoredUserEmail()
  const accountEmail = user?.email ?? null

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-28 pt-5">
      <div className="flex items-center justify-between">
        <Link href="/solve-v2" aria-label="Back to home" className="text-gonr-navy/60">
          <ArrowLeft size={22} />
        </Link>
        <span className="gonr-gradient-text text-xl font-black tracking-tight">GONR</span>
        <span className="w-[22px]" aria-hidden="true" />
      </div>

      <h1 className="mt-6 text-[2rem] font-black leading-tight tracking-tight text-gonr-navy">Settings</h1>

      {/* ── Account / profile ─────────────────────────────────────────────── */}
      <section className="mt-6">
        {!authResolved ? (
          <div className="gonr-card h-[96px] animate-pulse opacity-60" aria-hidden="true" />
        ) : accountEmail ? (
          <div className="gonr-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
                <UserIcon size={22} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wide text-gonr-textgray">Profile</p>
                <p className="truncate text-sm font-bold text-gonr-navy">{accountEmail}</p>
              </div>
            </div>
            <label className="mt-4 block text-xs font-extrabold uppercase tracking-wide text-gonr-textgray">
              Display name
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Add your name"
                aria-label="Display name"
                className="min-w-0 flex-1 rounded-2xl border border-[var(--gonr-border)] bg-white px-4 py-2.5 text-sm font-bold text-gonr-navy outline-none placeholder:font-semibold placeholder:text-gonr-navy/40"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={nameSaving}
                className="gonr-gradient shrink-0 rounded-full px-4 py-2.5 text-sm font-extrabold text-white shadow-md disabled:opacity-50"
              >
                {nameSaving ? 'Saving…' : nameSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        ) : sent ? (
          <div className="gonr-card p-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
              <Sparkles size={22} aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-extrabold text-gonr-navy">Check your email</p>
            <p className="mt-1 text-xs font-semibold text-gonr-textgray">
              We sent a sign-in link to {storedEmail ?? 'your inbox'}.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setEmailInput('')
              }}
              className="mt-3 text-xs font-bold text-gonr-hotpink"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="gonr-card p-5">
            <p className="text-sm font-extrabold text-gonr-navy">Sign in to sync your library</p>
            <p className="mt-1 text-xs font-semibold text-gonr-textgray">
              You can solve stains without an account. Sign in to keep your saved rescues across devices.
            </p>
            <form onSubmit={handleSignIn} className="mt-3 space-y-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@email.com"
                aria-label="Email address"
                className="w-full rounded-2xl border border-[var(--gonr-border)] bg-white px-4 py-2.5 text-sm font-bold text-gonr-navy outline-none placeholder:font-semibold placeholder:text-gonr-navy/40"
                required
              />
              {authError ? <p className="text-xs font-semibold text-gonr-hotpink">{authError}</p> : null}
              <button
                type="submit"
                disabled={sending || emailInput.trim().length === 0}
                className="gonr-gradient w-full rounded-full py-2.5 text-sm font-extrabold text-white shadow-md disabled:opacity-40"
              >
                {sending ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          </div>
        )}
      </section>

      {/* ── Preferences (marketing only — never affect safety) ────────────── */}
      <section className="mt-6">
        <h2 className="px-1 text-xs font-extrabold uppercase tracking-[0.14em] text-gonr-textgray">Preferences</h2>
        <div className="gonr-card mt-2 divide-y divide-[var(--gonr-border)] p-0">
          <ToggleRow
            Icon={Bell}
            title="Stain type alerts"
            sub="Occasional fabric-care tips. Never affects safety warnings."
            on={alerts}
            onToggle={toggleAlerts}
          />
          <ToggleRow
            Icon={ShoppingBag}
            title="Product recommendations"
            sub="Show optional product suggestions in results."
            on={recs}
            onToggle={toggleRecs}
          />
        </div>
        <p className="mt-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-gonr-textgray">
          <ShieldCheck size={13} aria-hidden="true" />
          Safety warnings and do-not-do guidance always show, no matter what.
        </p>
      </section>

      {/* ── Data ──────────────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="px-1 text-xs font-extrabold uppercase tracking-[0.14em] text-gonr-textgray">Data</h2>
        <div className="gonr-card mt-2 p-0">
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
                <Trash2 size={18} aria-hidden="true" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-extrabold text-gonr-navy">Clear history</span>
                <span className="text-xs font-semibold text-gonr-textgray">
                  {cleared ? 'History cleared.' : 'Hide your past checks from this app.'}
                </span>
              </span>
            </span>
          </button>
        </div>
      </section>

      {/* ── About ─────────────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="px-1 text-xs font-extrabold uppercase tracking-[0.14em] text-gonr-textgray">About</h2>
        <div className="gonr-card mt-2 divide-y divide-[var(--gonr-border)] p-0">
          <InfoRow
            Icon={Info}
            title="About GONR"
            open={openInfo === 'about'}
            onToggle={() => setOpenInfo((c) => (c === 'about' ? null : 'about'))}
          >
            GONR is a free stain and fabric-care guide. Show it the problem, it reads what it can, asks only what
            matters, and gives you the safest first move — and what not to do. Built on sourced textile science, not
            guesswork.
          </InfoRow>
          <InfoRow
            Icon={Sparkles}
            title="How GONR works"
            open={openInfo === 'how'}
            onToggle={() => setOpenInfo((c) => (c === 'how' ? null : 'how'))}
          >
            GONR combines the structured knowledge of the GONR Encyclopedia — textile science, stain chemistry, and
            care rules — with a frontier model that reads your situation. The safety engine always makes the final
            call, so the guidance stays sourced and safe for the fabric.
          </InfoRow>
        </div>
      </section>

      {/* ── Log out ───────────────────────────────────────────────────────── */}
      {accountEmail ? (
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-gonr-hotpink/30 bg-white px-5 text-sm font-extrabold text-gonr-hotpink"
        >
          <LogOut size={18} aria-hidden="true" />
          Log out
        </button>
      ) : null}

      {/* ── Clear-history confirm sheet ───────────────────────────────────── */}
      {confirmClear ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Clear history"
          className="fixed inset-0 z-50 mx-auto flex max-w-[480px] flex-col justify-end bg-gonr-navy/30 px-5 pb-6 backdrop-blur-sm"
          onClick={() => {
            if (!clearing) setConfirmClear(false)
          }}
        >
          <div className="gonr-card p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-black text-gonr-navy">Clear your history?</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-gonr-textgray">
              This hides your past checks from the app. Your saved rescues in My Library are not affected.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                disabled={clearing}
                className="min-h-[48px] rounded-full border border-[var(--gonr-border)] bg-white px-4 text-sm font-extrabold text-gonr-navy disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={clearing}
                className="min-h-[48px] rounded-full px-4 text-sm font-extrabold text-white shadow-md disabled:opacity-50"
                style={{ background: 'var(--gonr-danger)' }}
              >
                {clearing ? 'Clearing…' : 'Clear history'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </main>
  )
}

function ToggleRow({
  Icon,
  title,
  sub,
  on,
  onToggle,
}: {
  Icon: typeof Bell
  title: string
  sub: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-gonr-navy">{title}</p>
          <p className="text-xs font-semibold leading-4 text-gonr-textgray">{sub}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
          on ? 'gonr-gradient' : 'bg-gonr-navy/15'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
            on ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

function InfoRow({
  Icon,
  title,
  open,
  onToggle,
  children,
}: {
  Icon: typeof Info
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="p-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
            <Icon size={18} aria-hidden="true" />
          </span>
          <span className="text-sm font-extrabold text-gonr-navy">{title}</span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gonr-navy/35 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <p className="px-4 pb-4 text-sm font-medium leading-6 text-gonr-textgray">{children}</p>
      ) : null}
    </div>
  )
}
