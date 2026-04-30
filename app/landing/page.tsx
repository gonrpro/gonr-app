'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { AlertTriangle, BookOpen, CheckCircle2, Droplets, Mail, ShieldCheck, Sparkles } from 'lucide-react'

type Lang = 'en' | 'es'


type LandingTheme = {
  panel: string
  text: string
  muted: string
}

type Copy = {
  noApp: string
  freeChecks: string
  headline: string
  subhead: string
  proof: string
  socialProof: string
  examplesIntro: string
  examples: string[]
  unlockHint: string
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
    family: string
    title: string
    action: string
    warning: string
    color: string
    glow: string
    preview: Array<{ label: string; text: string }>
  }>
}

const COPY: Record<Lang, Copy> = {
  en: {
    noApp: 'No app needed',
    freeChecks: '3 sample solves',
    headline: 'Know what to do before the stain sets.',
    subhead: 'Fabric-aware stain guidance in seconds — safe first steps, risk warnings, and when to stop.',
    proof: 'Not generic tips. GONR checks the stain, fabric, color risk, and stop signs before you make it worse.',
    socialProof: '270+ verified protocols · Trusted by dry cleaning pros',
    examplesIntro: 'Tap a solve to preview',
    examples: ['Red wine', 'Ink', 'Oil', 'Silk', 'Wool', 'Mystery stain'],
    unlockHint: 'Sign up to run GONR on your own stain.',
    emailPlaceholder: 'your@email.com',
    cta: 'Start free',
    sending: 'Sending secure link…',
    helper: 'No password. Secure magic link when needed.',
    trust: 'Safety-first · Fabric-aware · Professional textile-care sources',
    checkEmail: 'Check your email',
    sentPrefix: 'We sent a secure link to',
    sentSuffix: 'Tap it to start solving stains.',
    reset: 'Use a different email',
    failed: 'Failed to send link',
    cards: [
      { icon: Droplets, eyebrow: 'SAFE FIRST STEP', family: 'TANNIN', title: 'Red wine on cotton', action: 'Blot. Flush cool from the back.', warning: 'Avoid heat until tannin is out.', color: '#22c55e', glow: 'rgba(34,197,94,0.12)', preview: [ { label: 'First move', text: 'Blot with a white towel, then flush cool water from the back of the fabric.' }, { label: 'Why', text: 'Wine is tannin-heavy. Cool flushing moves pigment out before heat locks it in.' }, { label: 'Stop if', text: 'The fabric is silk, wool, dry-clean-only, or the color starts moving.' } ] },
      { icon: AlertTriangle, eyebrow: 'RISK CHECK', family: 'INK', title: 'Ink on polyester', action: 'Test solvent on a hidden seam.', warning: 'Do not spread the dye ring.', color: '#f59e0b', glow: 'rgba(245,158,11,0.13)', preview: [ { label: 'First move', text: 'Do not scrub. Test alcohol or ink remover on a hidden seam before touching the spot.' }, { label: 'Why', text: 'Ink can migrate fast on synthetics; testing prevents a small dot becoming a halo.' }, { label: 'Stop if', text: 'Color transfers to the towel, the ring grows, or the garment has special trim.' } ] },
      { icon: ShieldCheck, eyebrow: 'STOP SIGNAL', family: 'HIGH-RISK', title: 'Silk / unknown stain', action: 'Stop before water rings set.', warning: 'High-risk fiber. Pro route.', color: '#ef4444', glow: 'rgba(239,68,68,0.12)', preview: [ { label: 'First move', text: 'Pause. Blot dry only and identify the fiber before adding water or chemistry.' }, { label: 'Why', text: 'Silk can water-ring, lose luster, or bleed dye even when the stain looks simple.' }, { label: 'Stop if', text: 'The item is valuable, lined, vintage, structured, or already shows a ring.' } ] },
    ],
  },
  es: {
    noApp: 'Sin app',
    freeChecks: '3 ejemplos de resolución',
    headline: 'Sepa qué hacer antes de que la mancha se fije.',
    subhead: 'Guía según tela y riesgo en segundos: primeros pasos seguros, alertas y cuándo parar.',
    proof: 'No son consejos genéricos. GONR revisa la mancha, la tela, el riesgo de color y cuándo parar.',
    socialProof: '270+ protocolos verificados · Confianza de profesionales de tintorería',
    examplesIntro: 'Toque una resolución',
    examples: ['Vino tinto', 'Tinta', 'Aceite', 'Seda', 'Lana', 'Mancha desconocida'],
    unlockHint: 'Regístrese para usar GONR con su propia mancha.',
    emailPlaceholder: 'tu@email.com',
    cta: 'Empezar gratis',
    sending: 'Enviando enlace seguro…',
    helper: 'Sin contraseña. Enlace seguro cuando haga falta.',
    trust: 'Primero seguridad · Según la tela · Fuentes profesionales',
    checkEmail: 'Revise su email',
    sentPrefix: 'Enviamos un enlace seguro a',
    sentSuffix: 'Tóquelo para empezar a resolver manchas.',
    reset: 'Usar otro email',
    failed: 'No se pudo enviar el enlace',
    cards: [
      { icon: Droplets, eyebrow: 'PASO SEGURO', family: 'TANINO', title: 'Vino tinto en algodón', action: 'Absorba. Enjuague frío desde atrás.', warning: 'Evite calor hasta sacar el tanino.', color: '#22c55e', glow: 'rgba(34,197,94,0.12)', preview: [ { label: 'Primer paso', text: 'Absorba con una toalla blanca y enjuague con agua fría desde atrás.' }, { label: 'Por qué', text: 'El vino tiene taninos. El agua fría mueve el pigmento antes de que el calor lo fije.' }, { label: 'Pare si', text: 'La tela es seda, lana, solo tintorería, o el color empieza a moverse.' } ] },
      { icon: AlertTriangle, eyebrow: 'REVISAR RIESGO', family: 'TINTA', title: 'Tinta en poliéster', action: 'Pruebe solvente en costura oculta.', warning: 'No extienda el aro de tinte.', color: '#f59e0b', glow: 'rgba(245,158,11,0.13)', preview: [ { label: 'Primer paso', text: 'No frote. Pruebe alcohol o removedor de tinta en una costura oculta.' }, { label: 'Por qué', text: 'La tinta puede migrar rápido en telas sintéticas; probar evita un aro más grande.' }, { label: 'Pare si', text: 'El color se transfiere a la toalla, el aro crece, o la prenda tiene adornos.' } ] },
      { icon: ShieldCheck, eyebrow: 'SEÑAL DE PARAR', family: 'ALTO RIESGO', title: 'Seda / mancha desconocida', action: 'Pare antes de dejar marcas de agua.', warning: 'Tela delicada. Ruta profesional.', color: '#ef4444', glow: 'rgba(239,68,68,0.12)', preview: [ { label: 'Primer paso', text: 'Pausa. Absorba en seco solamente e identifique la fibra antes de agregar agua o química.' }, { label: 'Por qué', text: 'La seda puede dejar marcas de agua, perder brillo o soltar tinte aunque la mancha parezca simple.' }, { label: 'Pare si', text: 'La pieza es valiosa, forrada, vintage, estructurada, o ya muestra un aro.' } ] },
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
  const [openCard, setOpenCard] = useState(0)

  useEffect(() => {
    let cancelled = false
    createClient().auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) window.location.replace('/solve')
    }).catch(() => {})

    const params = new URLSearchParams(window.location.search)
    const requestedLang = params.get('lang')
    if (requestedLang === 'en' || requestedLang === 'es') {
      setLang(requestedLang)
      setLandingLang(requestedLang)
    } else {
      const storedLang = localStorage.getItem('gonr_lang')
      if (storedLang === 'en' || storedLang === 'es') setLandingLang(storedLang)
    }

    document.documentElement.classList.add('dark')
    document.body.classList.add('gonr-landing-active')

    return () => {
      cancelled = true
      document.body.classList.remove('gonr-landing-active')
    }
  }, [setLang])

  const theme = {
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
          <button type="button" onClick={() => { const next = activeLang === 'en' ? 'es' : 'en'; setLang(next); setLandingLang(next) }} className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${theme.pill}`}>
            {activeLang === 'en' ? 'Español' : 'English'}
          </button>
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
              <p className={`mt-3 max-w-[520px] text-[12px] font-semibold leading-snug sm:text-[13px] lg:mt-4 lg:text-[15px] ${theme.text}`}>
                {copy.proof}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 lg:mt-5">
                {copy.examples.map((item) => (
                  <span key={item} className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${theme.tag}`}>{item}</span>
                ))}
              </div>
              <div className={`mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.08em] sm:text-[11px] ${theme.faint}`}>
                <BookOpen size={12} className="shrink-0 text-[var(--accent)]" />
                <span>{copy.socialProof}</span>
              </div>

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
              <p className={`px-1 text-[10px] font-black uppercase tracking-[0.16em] lg:text-[12px] ${theme.faint}`}>{copy.examplesIntro}</p>
              {copy.cards.map((card, index) => {
                const Icon = card.icon
                const isOpen = openCard === index
                return (
                  <button
                    type="button"
                    key={card.title}
                    onClick={() => setOpenCard(index)}
                    className={`w-full rounded-2xl border p-3 text-left shadow-lg transition hover:border-white/20 lg:rounded-[28px] lg:p-5 ${theme.card}`}
                  >
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
                      <p className={`text-[12px] font-semibold leading-snug lg:text-[15px] text-white/76`}>{card.action}</p>
                      <span
                        className="rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em]"
                        style={{ background: card.glow, color: card.color }}
                      >
                        {card.family}
                      </span>
                    </div>
                    <p className={`mt-1 pl-[52px] text-[11px] font-medium leading-snug lg:pl-[68px] lg:text-[13px] ${theme.cardMuted}`}>{card.warning}</p>
                    {isOpen ? (
                      <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/18 p-3 lg:ml-[68px] lg:mt-4">
                        {card.preview.map((item) => (
                          <div key={item.label}>
                            <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: card.color }}>{item.label}</p>
                            <p className="mt-0.5 text-[11px] font-semibold leading-snug text-white/72 lg:text-[13px]">{item.text}</p>
                          </div>
                        ))}
                        <p className="pt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--accent)]">{copy.unlockHint}</p>
                      </div>
                    ) : null}
                  </button>
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

function SentState({ email, copy, theme, onReset }: { email: string; copy: Copy; theme: LandingTheme; onReset: () => void }) {
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
