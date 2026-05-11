'use client'

// ============================================================================
// TASK-131 landing v2 — Apple-style editorial composition
// ============================================================================
// Replaces v1's dark-card landing. New composition rules per Atlas msg 11533:
//   - Editorial hero (single column, oversized type, asymmetric breathing room)
//   - Real paper Plant Guide preview as the visual showpiece (not a generic mock)
//   - No icon library (no Lucide), no glassmorphism, no checkmark feature grids,
//     no font-black soup
//   - One accent color (GONR rust) used surgically — primary CTA + hero pulse
//   - Mobile-first, desktop owns its own composition (not stretched mobile)
//   - Bilingual EN/ES toggle persisted in localStorage
// ============================================================================

import Link from 'next/link'
import { LiveChatDemo } from '@/components/spottingboard/LiveChatDemo'
import { useEffect, useState } from 'react'

type Lang = 'en' | 'es'
const LANG_KEY = 'gonr.plant-brain.lang'

const COPY: Record<Lang, {
  navWizardCta: string
  langToggleAria: string
  heroEyebrow: string
  heroLine1: string
  heroLine2: string
  heroSub: string
  heroPrimaryCta: string
  heroSecondaryLink: string
  guideEyebrow: string
  guideHeading: string
  guideSub: string
  paperBadge: string
  paperPlantTitle: string
  paperVersion: string
  paperSection1Label: string
  paperSection1Body: string
  paperSection2Label: string
  paperSection2Body: string
  paperSection3Label: string
  paperSection3Body: string
  paperFooter: string
  storyEyebrow: string
  storyHeadline: string
  storyParagraph: string
  statsHeading: string
  stats: { value: string; label: string }[]
  closingHeading: string
  closingSub: string
  closingCta: string
  footerLine: string
}> = {
  en: {
    navWizardCta: 'Start',
    langToggleAria: 'Switch language',
    heroEyebrow: 'Spotting Board',
    heroLine1: 'Your plant should not stop running',
    heroLine2: 'because one person is out.',
    heroSub:
      'Twenty minutes from your senior operator. A bilingual, printable, searchable plant brain forever.',
    heroPrimaryCta: 'Start your Plant Brain',
    heroSecondaryLink: 'See a sample guide',
    guideEyebrow: 'The reward',
    guideHeading: 'Walk away with the guide your team will actually pin to the board.',
    guideSub:
      'Bilingual English and Spanish. Built from your operator’s answers in their own words. Printable. Updated automatically when your operators teach Plant Brain new things.',
    paperBadge: 'PLANT GUIDE · DRAFT',
    paperPlantTitle: 'Jerry’s Cleaners — Plant Guide',
    paperVersion: 'V1 · GENERATED 2026-05-02',
    paperSection1Label: 'Spotting defaults',
    paperSection1Body:
      'Pre-test on every colored or fragile fabric. Cool-water flush from the back is first-touch on protein. Counter does first-touch only on fresh, simple stains; everything else routes to the spotter.',
    paperSection2Label: 'Chemistry on the shelf',
    paperSection2Body:
      'POG · RR-100 · Adjust-A-Blend · Tannin formula · Protein formula · Bone dry solvent. Strengths and use noted per item in the chemistry inventory.',
    paperSection3Label: 'Escalation triggers',
    paperSection3Body:
      'Aniline leather, vintage silk, pre-set protein, customer-applied product. Anything escalated gets a board entry with photo plus spotter notes before the second-touch.',
    paperFooter: 'Spotting Board · Generated from your wizard answers',
    storyEyebrow: 'Why now',
    storyHeadline:
      'The knowledge that runs your plant lives in your operators’ heads.',
    storyParagraph:
      'When your senior spotter calls in sick. When the night shift inherits the morning escalation. When a new hire walks in on day one. When a forty-year veteran retires next year. Every one of those moments is the moment your plant stops running well — unless the knowledge has somewhere to live. Plant Brain is the somewhere.',
    statsHeading: 'Built on real protocol craft.',
    stats: [
      { value: '30', label: 'sharp questions, not 300 generic ones' },
      { value: '8', label: 'plant expertise modules' },
      { value: '251', label: 'baseline protocols GONR-tunes to your plant' },
      { value: 'EN · ES', label: 'bilingual from day one' },
    ],
    closingHeading: 'Twenty minutes. A living plant brain forever.',
    closingSub: 'Start with your senior operator. End with a guide for your whole floor.',
    closingCta: 'Start your Plant Brain',
    footerLine:
      'Spotting Board · Built for plant operators by people who watched a wife’s shop almost lose decades of knowledge to one bad week.',
  },
  es: {
    navWizardCta: 'Empezar',
    langToggleAria: 'Cambiar idioma',
    heroEyebrow: 'Spotting Board',
    heroLine1: 'Tu planta no debería detenerse',
    heroLine2: 'porque falta una persona.',
    heroSub:
      'Veinte minutos de tu operador principal. Un cerebro de planta bilingüe, imprimible y buscable para siempre.',
    heroPrimaryCta: 'Empieza tu Plant Brain',
    heroSecondaryLink: 'Ver una guía de ejemplo',
    guideEyebrow: 'La recompensa',
    guideHeading: 'Llévate la guía que tu equipo de verdad pegará al tablero.',
    guideSub:
      'Bilingüe inglés y español. Construida desde las respuestas de tu operador en sus propias palabras. Imprimible. Se actualiza automáticamente cuando tus operadores le enseñan cosas nuevas.',
    paperBadge: 'PLANT GUIDE · BORRADOR',
    paperPlantTitle: 'Jerry’s Cleaners — Guía de Planta',
    paperVersion: 'V1 · GENERADO 2026-05-02',
    paperSection1Label: 'Manchado por defecto',
    paperSection1Body:
      'Probar en cada tela teñida o frágil. Enjuague con agua fría desde atrás como primer toque en proteína. El mostrador hace primer toque solo en manchas frescas y simples; todo lo demás va al manchador.',
    paperSection2Label: 'Química en el estante',
    paperSection2Body:
      'POG · RR-100 · Adjust-A-Blend · Fórmula de taninos · Fórmula de proteína · Solvente seco. Concentraciones y uso anotados por artículo en el inventario.',
    paperSection3Label: 'Disparadores de escalación',
    paperSection3Body:
      'Cuero anilina, seda vintage, proteína fijada, producto aplicado por el cliente. Cualquier escalación entra al tablero con foto y notas del manchador antes del segundo toque.',
    paperFooter: 'Spotting Board · Generado desde tus respuestas del wizard',
    storyEyebrow: 'Por qué ahora',
    storyHeadline:
      'El conocimiento que mantiene viva tu planta vive en la cabeza de tus operadores.',
    storyParagraph:
      'Cuando tu manchador principal no viene. Cuando el turno de noche hereda la escalación de la mañana. Cuando un empleado nuevo entra el primer día. Cuando un veterano de cuarenta años se jubila el año que viene. Cada uno de esos momentos es el momento en que tu planta deja de funcionar bien — a menos que el conocimiento tenga dónde vivir. Plant Brain es ese dónde.',
    statsHeading: 'Construido sobre el oficio real del protocolo.',
    stats: [
      { value: '30', label: 'preguntas agudas, no 300 genéricas' },
      { value: '8', label: 'módulos de experiencia de planta' },
      { value: '251', label: 'protocolos base que GONR ajusta a tu planta' },
      { value: 'EN · ES', label: 'bilingüe desde el primer día' },
    ],
    closingHeading: 'Veinte minutos. Un cerebro de planta vivo para siempre.',
    closingSub: 'Empieza con tu operador principal. Termina con una guía para todo tu piso.',
    closingCta: 'Empieza tu Plant Brain',
    footerLine:
      'Spotting Board · Construido para operadores de planta por gente que vio el negocio de su esposa casi perder décadas de conocimiento en una mala semana.',
  },
}

export default function SpottingBoardPage() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en'
    return window.localStorage.getItem(LANG_KEY) === 'es' ? 'es' : 'en'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANG_KEY, lang)
    }
  }, [lang])

  const t = COPY[lang]

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#f5f6f8] antialiased selection:bg-[#00d4aa]/30">
      {/* ── Top nav (sticky, hairline border, restrained) ─────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/spottingboard" className="flex items-center gap-3 text-white">
            <span className="relative block h-6 w-6 rounded-md bg-[linear-gradient(135deg,#00d4aa,#00a085)] shadow-[0_0_28px_rgba(0,212,170,0.22)] before:absolute before:inset-[6px] before:rounded-[2px] before:bg-[#0a0a0c]" aria-hidden="true" />
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">Spotting Board</span>
              <span className="block text-[11px] font-medium text-white/45">Plant brain workbench</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="rounded-full border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/60 transition hover:border-white/20 hover:text-white/85"
              aria-label={t.langToggleAria}
            >
              {lang === 'en' ? 'EN  /  ES' : 'EN  /  ES'}
            </button>
            <Link
              href="/auth/login?next=/spottingboard/setup&brand=spottingboard"
              className="rounded-full bg-[#00d4aa] px-4 py-1.5 text-[13px] font-medium tracking-tight text-white transition hover:bg-[#00a085]"
            >
              {t.navWizardCta}
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Single restrained radial accent — top-right corner only */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(700px_500px_at_85%_-20%,rgba(0,212,170,0.18),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-[1200px] px-6 pt-20 pb-28 sm:pt-28 sm:pb-36 lg:px-10 lg:pt-36 lg:pb-44">
          <div className="mb-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            <span className="h-1 w-1 rounded-full bg-[#00d4aa]" />
            {t.heroEyebrow}
          </div>
          <h1 className="max-w-[18ch] text-balance text-[44px] font-medium leading-[1.04] tracking-[-0.025em] text-white sm:text-[64px] lg:text-[88px]">
            <span className="block">{t.heroLine1}</span>
            <span className="block text-white/55">{t.heroLine2}</span>
          </h1>
          <p className="mt-10 max-w-[44ch] text-balance text-[18px] leading-[1.55] text-white/65 sm:text-[20px]">
            {t.heroSub}
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/auth/login?next=/spottingboard/setup&brand=spottingboard"
              className="group inline-flex items-center gap-2 rounded-full bg-[#00d4aa] px-7 py-3.5 text-[15px] font-medium tracking-tight text-white transition hover:bg-[#00a085]"
            >
              {t.heroPrimaryCta}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="#guide"
              className="group text-[15px] font-medium tracking-tight text-white/70 transition hover:text-white"
            >
              {t.heroSecondaryLink} <span className="opacity-60 transition-opacity group-hover:opacity-100">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── PAPER GUIDE PREVIEW (the visual showpiece) ──────────────── */}
      <section id="guide" className="relative border-t border-white/[0.05] bg-gradient-to-b from-transparent via-white/[0.015] to-transparent">
        <div className="mx-auto max-w-[1200px] px-6 py-24 sm:py-32 lg:px-10 lg:py-40">
          <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20">
            {/* Editorial copy on the left */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                <span className="h-1 w-1 rounded-full bg-[#00d4aa]" />
                {t.guideEyebrow}
              </div>
              <h2 className="text-balance text-[34px] font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[44px] lg:text-[52px]">
                {t.guideHeading}
              </h2>
              <p className="mt-8 max-w-[42ch] text-balance text-[17px] leading-[1.6] text-white/60">
                {t.guideSub}
              </p>
            </div>

            {/* Live guided example — the product in motion */}
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-x-8 -inset-y-12 rounded-[80px] bg-[radial-gradient(closest-side,rgba(0,212,170,0.14),transparent_70%)] blur-2xl"
              />
              <div className="relative">
                <LiveChatDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EDITORIAL STORY (anti-feature-grid) ─────────────────────── */}
      <section className="border-t border-white/[0.05]">
        <div className="mx-auto max-w-[920px] px-6 py-24 sm:py-32 lg:px-10 lg:py-40">
          <div className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            <span className="h-1 w-1 rounded-full bg-[#00d4aa]" />
            {t.storyEyebrow}
          </div>
          <h2 className="text-balance text-[34px] font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[44px] lg:text-[52px]">
            {t.storyHeadline}
          </h2>
          <p className="mt-10 max-w-[58ch] text-balance text-[18px] leading-[1.65] text-white/65 sm:text-[19px]">
            {t.storyParagraph}
          </p>
        </div>
      </section>

      {/* ── STATS ROW (Apple-style massive numerals) ────────────────── */}
      <section className="border-t border-white/[0.05]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 sm:py-24 lg:px-10 lg:py-28">
          <h2 className="mb-14 text-balance text-[20px] font-medium tracking-tight text-white/70 sm:text-[22px]">
            {t.statsHeading}
          </h2>
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {t.stats.map((s, i) => (
              <div key={i} className="border-l border-white/10 pl-6 lg:border-l-0 lg:pl-0">
                <div className="mb-2 font-mono text-[clamp(48px,7vw,80px)] font-medium leading-none tracking-[-0.04em] text-white">
                  {s.value}
                </div>
                <div className="max-w-[24ch] text-[14px] leading-[1.5] text-white/55">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA ─────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.05]">
        <div className="mx-auto max-w-[920px] px-6 py-24 text-center sm:py-32 lg:px-10 lg:py-40">
          <h2 className="text-balance text-[34px] font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[44px] lg:text-[52px]">
            {t.closingHeading}
          </h2>
          <p className="mt-8 max-w-[40ch] mx-auto text-balance text-[18px] leading-[1.55] text-white/60">
            {t.closingSub}
          </p>
          <div className="mt-12">
            <Link
              href="/auth/login?next=/spottingboard/setup&brand=spottingboard"
              className="group inline-flex items-center gap-2 rounded-full bg-[#00d4aa] px-8 py-4 text-[15px] font-medium tracking-tight text-white transition hover:bg-[#00a085]"
            >
              {t.closingCta}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05]">
        <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-10">
          <p className="text-balance text-[13px] leading-[1.6] text-white/40">{t.footerLine}</p>
        </div>
      </footer>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────

function PaperSection({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#00d4aa]">
        {label}
      </div>
      <p className="text-[14px] leading-[1.6] text-[#1a1a1a]/85">{body}</p>
    </div>
  )
}
