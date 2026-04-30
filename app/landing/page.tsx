'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { AlertTriangle, CheckCircle2, Droplets, Mail, Moon, ShieldCheck, Sparkles, Sun } from 'lucide-react'

type Lang = 'en' | 'es'

type Copy = {
  noApp: string
  freeChecks: string
  headline: string
  subhead: string
  emailPlaceholder: string
  cta: string
  sending: string
  helper: string
  trust: string
  checkEmail: string
  sentPrefix: string
  sentSuffix: string
  reset: string
  failed: string
  cards: Array<{
    icon: typeof Droplets
    eyebrow: string
    title: string
    action: string
    warning: string
    color: string
    glow: string
  }>
}

const COPY: Record<Lang, Copy> = {
  en: {
    noApp: 'No app needed',
    freeChecks: '3 free solves',
    headline: 'Know what to do before the stain sets.',
    subhead: 'Fabric-aware stain guidance in seconds — safe first steps, risk warnings, and when to stop.',
    emailPlaceholder: 'your@email.com',
    cta: 'Start free',
    sending: 'Sending secure link…',
    helper: 'No password. Secure magic link when needed.',
    trust: 'Safety-first · Fabric-aware · Professional textile-care sources',
    checkEmail: 'Check your email',
    sentPrefix: 'We sent a secure link to',
    sentSuffix: 'Tap it to start your 3 free solves.',
    reset: 'Use a different email',
    failed: 'Failed to send link',
    cards: [
      { icon: Droplets, eyebrow: 'SAFE FIRST STEP', title: 'Red wine on cotton', action: 'Blot. Flush cool from the back.', warning: 'Avoid heat until tannin is out.', color: '#22c55e', glow: 'rgba(34,197,94,0.12)' },
      { icon: AlertTriangle, eyebrow: 'RISK CHECK', title: 'Ink on polyester', action: 'Test solvent on a hidden seam.', warning: 'Do not spread the dye ring.', color: '#f59e0b', glow: 'rgba(245,158,11,0.13)' },
      { icon: ShieldCheck, eyebrow: 'STOP SIGNAL', title: 'Silk / unknown stain', action: 'Stop before water rings set.', warning: 'High-risk fiber. Pro route.', color: '#ef4444', glow: 'rgba(239,68,68,0.12)' },
    ],
  },
  es: {
    noApp: 'Sin app',
    freeChecks: '3 resoluciones gratis',
    headline: 'Sepa qué hacer antes de que la mancha se fije.',
    subhead: 'Guía según tela y riesgo en segundos: primeros pasos seguros, alertas y cuándo parar.',
    emailPlaceholder: 'tu@email.com',
    cta: 'Obtener mi plan gratis',
    sending: 'Enviando enlace seguro…',
    helper: 'Sin contraseña. Enlace seguro cuando haga falta.',
    trust: 'Primero seguridad · Según la tela · Fuentes profesionales',
    checkEmail: 'Revise su email',
    sentPrefix: 'Enviamos un enlace seguro a',
    sentSuffix: 'Tóquelo para empezar sus 3 resoluciones gratis.',
    reset: 'Usar otro email',
    failed: 'No se pudo enviar el enlace',
    cards: [
      { icon: Droplets, eyebrow: 'PASO SEGURO', title: 'Vino tinto en algodón', action: 'Absorba. Enjuague frío desde atrás.', warning: 'Evite calor hasta sacar el tanino.', color: '#22c55e', glow: 'rgba(34,197,94,0.12)' },
      { icon: AlertTriangle, eyebrow: 'REVISAR RIESGO', title: 'Tinta en poliéster', action: 'Pruebe solvente en costura oculta.', warning: 'No extienda el aro de tinte.', color: '#f59e0b', glow: 'rgba(245,158,11,0.13)' },
      { icon: ShieldCheck, eyebrow: 'SEÑAL DE PARAR', title: 'Seda / mancha desconocida', action: 'Pare antes de dejar marcas de agua.', warning: 'Tela delicada. Ruta profesional.', color: '#ef4444', glow: 'rgba(239,68,68,0.12)' },
    ],
  },
}

export default function LandingPage() {
  const { lang, setLang } = useLanguage()
  const [landingLang, setLandingLang] = useState<Lang>(lang === 'es' ? 'es' : 'en')
  const activeLang: Lang = landingLang
  const copy = COPY[activeLang]
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedTheme = params.get('theme')
    const requestedLang = params.get('lang')
    if (requestedLang === 'en' || requestedLang === 'es') {
      setLang(requestedLang)
      setLandingLang(requestedLang)
    } else {
      const storedLang = localStorage.getItem('gonr_lang')
      if (storedLang === 'en' || storedLang === 'es') setLandingLang(storedLang)
    }

    const stored = localStorage.getItem('gonr_theme')
    const isDark = requestedTheme === 'light' ? false : requestedTheme === 'dark' ? true : stored ? stored === 'dark' : true
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('gonr_theme', isDark ? 'dark' : 'light')
  }, [setLang])

  const theme = useMemo(() => dark ? {
    page: 'bg-[#05070b] text-white',
    orb: 'bg-[radial-gradient(circle_at_50%_-10%,rgba(34,197,94,0.28),transparent_38%),radial-gradient(circle_at_0%_90%,rgba(34,197,94,0.10),transparent_35%)]',
    panel: 'border-white/10 bg-white/[0.06] shadow-black/30',
    pill: 'border-white/10 bg-white/5 text-white/60',
    text: 'text-white',
    muted: 'text-white/58',
    faint: 'text-white/35',
    inputWrap: 'border-[#22c55e]/35 bg-black/24 shadow-[0_0_0_1px_rgba(34,197,94,0.08),0_16px_40px_rgba(34,197,94,0.10)]',
    input: 'text-white placeholder:text-white/32',
    card: 'border-white/10 bg-white/[0.055] shadow-black/20',
    cardMuted: 'text-white/42',
    tag: 'bg-white/8 text-white/42',
  } : {
    page: 'bg-[#f5f7fa] text-slate-950',
    orb: 'bg-[radial-gradient(circle_at_50%_-10%,rgba(34,197,94,0.22),transparent_38%),radial-gradient(circle_at_0%_90%,rgba(34,197,94,0.10),transparent_35%)]',
    panel: 'border-black/5 bg-white shadow-slate-200/80',
    pill: 'border-black/5 bg-slate-100 text-slate-500',
    text: 'text-slate-950',
    muted: 'text-slate-600',
    faint: 'text-slate-400',
    inputWrap: 'border-[#22c55e]/40 bg-white shadow-[0_0_0_1px_rgba(34,197,94,0.08),0_16px_40px_rgba(34,197,94,0.12)]',
    input: 'text-slate-950 placeholder:text-slate-400',
    card: 'border-black/5 bg-white shadow-slate-200/70',
    cardMuted: 'text-slate-500',
    tag: 'bg-slate-100 text-slate-500',
  }, [dark])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('gonr_theme', next ? 'dark' : 'light')
  }

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
      try { localStorage.setItem('gonr_user_email', trimmed.toLowerCase()) } catch {}
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.failed)
    } finally {
      setSending(false)
    }
  }

  return (
    <main className={`relative -mx-4 -mb-4 -mt-2 min-h-screen md:fixed md:inset-0 md:z-[100] md:m-0 md:overflow-y-auto ${theme.page}`}>
      <div className={`pointer-events-none absolute inset-0 ${theme.orb}`} />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1120px] flex-col px-5 py-5 sm:px-8 lg:px-10 lg:py-8">
        <header className="mb-3 flex shrink-0 items-center justify-between lg:mb-8">
          <div className="flex items-end gap-2">
            <div className="select-none" style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1 }}>
              <span className={theme.text}>GON</span>
              <span style={{ color: 'var(--accent)' }}>R</span>
              <span
                aria-hidden="true"
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  verticalAlign: 'super',
                  marginLeft: '1px',
                  letterSpacing: 0,
                  opacity: 0.6,
                }}
              >
                ™
              </span>
            </div>
            <p className={`pb-[2px] text-[9px] font-bold uppercase tracking-[0.18em] ${theme.faint}`}>Stain Brain</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => { const next = activeLang === 'en' ? 'es' : 'en'; setLang(next); setLandingLang(next) }} className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${theme.pill}`}>
              {activeLang === 'en' ? 'ES' : 'EN'}
            </button>
            <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className={`flex h-7 w-7 items-center justify-center rounded-full border ${theme.pill}`}>
              {dark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        </header>

        {sent ? (
          <SentState email={email} copy={copy} theme={theme} onReset={() => { setSent(false); setEmail('') }} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 xl:gap-14">
            <section className={`rounded-[30px] border p-4 shadow-2xl backdrop-blur sm:p-6 lg:rounded-[42px] lg:p-8 ${theme.panel}`}>
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--accent)]">
                <Sparkles size={12} /> {copy.freeChecks}
              </div>

              <h1 className={`text-[31px] font-black leading-[0.99] tracking-[-0.06em] sm:text-[42px] lg:text-[64px] lg:leading-[0.92] ${theme.text}`}>
                {copy.headline}
              </h1>
              <p className={`mt-2 text-[13px] font-medium leading-snug sm:text-[15px] lg:mt-5 lg:max-w-[520px] lg:text-[20px] lg:leading-snug ${theme.muted}`}>
                {copy.subhead}
              </p>

              <form onSubmit={handleSubmit} className="mt-4 space-y-2 lg:mt-8 lg:max-w-[520px]">
                <div className={`rounded-2xl border p-1.5 ${theme.inputWrap}`}>
                  <div className="flex items-center gap-2 px-2 pb-1.5 pt-1">
                    <Mail size={17} className="text-[var(--accent)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError('') }}
                      placeholder={copy.emailPlaceholder}
                      required
                      autoComplete="email"
                      inputMode="email"
                      disabled={sending}
                      className={`min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none disabled:opacity-60 ${theme.input}`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !email.trim()}
                    className="min-h-[48px] w-full rounded-xl bg-[var(--accent)] px-4 text-[15px] font-black text-white shadow-[0_10px_28px_rgba(34,197,94,0.34)] transition active:scale-[0.99] disabled:opacity-50 lg:min-h-[56px] lg:text-[17px]"
                  >
                    {sending ? copy.sending : copy.cta}
                  </button>
                </div>
                <p className={`text-center text-[11px] font-medium leading-snug ${error ? 'text-red-500' : theme.faint}`}>
                  {error || copy.helper}
                </p>
              </form>
            </section>

            <section className="mt-4 space-y-2 lg:mt-0 lg:space-y-4">
              {copy.cards.map((card) => {
                const Icon = card.icon
                return (
                  <article key={card.title} className={`rounded-2xl border p-3 shadow-lg lg:rounded-[28px] lg:p-5 ${theme.card}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl lg:h-14 lg:w-14 lg:rounded-[22px]" style={{ background: card.glow, color: card.color }}>
                        <Icon size={19} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] font-black uppercase tracking-[0.14em] lg:text-[11px]" style={{ color: card.color }}>{card.eyebrow}</p>
                          <CheckCircle2 size={13} className="text-[var(--accent)]" />
                        </div>
                        <p className={`truncate text-[14px] font-black leading-tight lg:text-[20px] ${theme.text}`}>{card.title}</p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 pl-[52px] lg:mt-4 lg:pl-[68px]">
                      <p className={`text-[12px] font-semibold leading-snug lg:text-[15px] ${dark ? 'text-white/76' : 'text-slate-700'}`}>{card.action}</p>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${theme.tag}`}>Plan</span>
                    </div>
                    <p className={`mt-1 pl-[52px] text-[11px] font-medium leading-snug lg:pl-[68px] lg:text-[13px] ${theme.cardMuted}`}>{card.warning}</p>
                  </article>
                )
              })}
            </section>

            <footer className={`shrink-0 pt-3 text-center text-[10px] font-bold uppercase tracking-[0.08em] lg:col-span-2 lg:pt-8 lg:text-[11px] ${theme.faint}`}>
              {copy.trust}
            </footer>
          </div>
        )}
      </div>
    </main>
  )
}

function SentState({ email, copy, theme, onReset }: { email: string; copy: Copy; theme: any; onReset: () => void }) {
  return (
    <section className="flex flex-1 items-center justify-center">
      <div className={`w-full rounded-[30px] border p-6 text-center shadow-2xl ${theme.panel}`}>
        <p className="text-4xl">📧</p>
        <h1 className={`mt-4 text-2xl font-black tracking-tight ${theme.text}`}>{copy.checkEmail}</h1>
        <p className={`mt-2 text-sm leading-relaxed ${theme.muted}`}>
          {copy.sentPrefix} <strong className={theme.text}>{email}</strong>.<br />{copy.sentSuffix}
        </p>
        <button type="button" onClick={onReset} className="mt-5 text-xs font-bold text-[var(--accent)]">
          {copy.reset}
        </button>
      </div>
    </section>
  )
}
