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
    heroEyebrow: 'SpottingBoard by GONR',
    heroLine1: 'Your plant should not stop running',
    heroLine2: 'because one person is out.',
    heroSub:
      'SpottingBoard turns twenty minutes with your senior operator into a bilingual, printable, searchable Plant Brain for your floor.',
    heroPrimaryCta: 'Build your Plant Brain',
    heroSecondaryLink: 'See a sample guide',
    guideEyebrow: 'The reward',
    guideHeading: 'Walk away with the guide your team will actually pin to the board.',
    guideSub:
      'Bilingual English and Spanish. Built from your operator’s answers in their own words. Printable. Updated automatically when your operators teach SpottingBoard new things.',
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
    paperFooter: 'SpottingBoard · Plant Brain generated from your answers',
    storyEyebrow: 'Why now',
    storyHeadline:
      'The knowledge that runs your plant lives in your operators’ heads.',
    storyParagraph:
      'When your senior spotter calls in sick. When the night shift inherits the morning escalation. When a new hire walks in on day one. When a forty-year veteran retires next year. Every one of those moments is the moment your plant stops running well — unless the knowledge has somewhere to live. SpottingBoard is where that knowledge becomes your Plant Brain.',
    statsHeading: 'Built on real protocol craft.',
    stats: [
      { value: '30', label: 'sharp questions, not 300 generic ones' },
      { value: '8', label: 'plant expertise modules' },
      { value: '251', label: 'baseline protocols GONR-tunes to your plant' },
      { value: 'EN · ES', label: 'bilingual from day one' },
    ],
    closingHeading: 'Twenty minutes. A living plant brain forever.',
    closingSub: 'Start with your senior operator. End with a guide for your whole floor.',
    closingCta: 'Build your Plant Brain',
    footerLine:
      'SpottingBoard by GONR · Built for plant operators.',
  },
  es: {
    navWizardCta: 'Empezar',
    langToggleAria: 'Cambiar idioma',
    heroEyebrow: 'SpottingBoard por GONR',
    heroLine1: 'Tu planta no debería detenerse',
    heroLine2: 'porque falta una persona.',
    heroSub:
      'SpottingBoard convierte veinte minutos con tu operador principal en un Plant Brain bilingüe, imprimible y buscable para tu piso.',
    heroPrimaryCta: 'Construye tu Plant Brain',
    heroSecondaryLink: 'Ver una guía de ejemplo',
    guideEyebrow: 'La recompensa',
    guideHeading: 'Llévate la guía que tu equipo de verdad pegará al tablero.',
    guideSub:
      'Bilingüe inglés y español. Construida desde las respuestas de tu operador en sus propias palabras. Imprimible. Se actualiza automáticamente cuando tus operadores le enseñan cosas nuevas a SpottingBoard.',
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
    paperFooter: 'SpottingBoard · Plant Brain generado desde tus respuestas',
    storyEyebrow: 'Por qué ahora',
    storyHeadline:
      'El conocimiento que mantiene viva tu planta vive en la cabeza de tus operadores.',
    storyParagraph:
      'Cuando tu manchador principal no viene. Cuando el turno de noche hereda la escalación de la mañana. Cuando un empleado nuevo entra el primer día. Cuando un veterano de cuarenta años se jubila el año que viene. Cada uno de esos momentos es el momento en que tu planta deja de funcionar bien — a menos que el conocimiento tenga dónde vivir. SpottingBoard convierte ese conocimiento en tu Plant Brain.',
    statsHeading: 'Construido sobre el oficio real del protocolo.',
    stats: [
      { value: '30', label: 'preguntas agudas, no 300 genéricas' },
      { value: '8', label: 'módulos de experiencia de planta' },
      { value: '251', label: 'protocolos base que GONR ajusta a tu planta' },
      { value: 'EN · ES', label: 'bilingüe desde el primer día' },
    ],
    closingHeading: 'Veinte minutos. Un cerebro de planta vivo para siempre.',
    closingSub: 'Empieza con tu operador principal. Termina con una guía para todo tu piso.',
    closingCta: 'Construye tu Plant Brain',
    footerLine:
      'SpottingBoard por GONR · Construido para operadores de planta.',
  },
}

export default function PlantBrainLandingClient() {
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
    <div className="min-h-screen bg-[#0a0a0c] text-[#f5f6f8] antialiased selection:bg-[#c8442a]/30">
      {/* ── Top nav (sticky, hairline border, restrained) ─────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/spottingboard" className="text-[15px] font-medium tracking-tight text-white">
            SpottingBoard <span className="text-white/50">·</span> <span className="font-normal text-white/70">by GONR</span>
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
              href="/spottingboard/builder"
              className="rounded-full bg-[#c8442a] px-4 py-1.5 text-[13px] font-medium tracking-tight text-white transition hover:bg-[#d85432]"
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
          className="pointer-events-none absolute inset-0 [background:radial-gradient(700px_500px_at_85%_-20%,rgba(200,68,42,0.18),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-[1200px] px-6 pt-20 pb-28 sm:pt-28 sm:pb-36 lg:px-10 lg:pt-36 lg:pb-44">
          <div className="mb-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            <span className="h-1 w-1 rounded-full bg-[#c8442a]" />
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
              href="/spottingboard/builder"
              className="group inline-flex items-center gap-2 rounded-full bg-[#c8442a] px-7 py-3.5 text-[15px] font-medium tracking-tight text-white transition hover:bg-[#d85432]"
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
                <span className="h-1 w-1 rounded-full bg-[#c8442a]" />
                {t.guideEyebrow}
              </div>
              <h2 className="text-balance text-[34px] font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-[44px] lg:text-[52px]">
                {t.guideHeading}
              </h2>
              <p className="mt-8 max-w-[42ch] text-balance text-[17px] leading-[1.6] text-white/60">
                {t.guideSub}
              </p>
            </div>

            {/* Paper preview on the right — looks like an actual printed page */}
            <div className="relative">
              {/* Soft glow under the paper */}
              <div
                aria-hidden
                className="absolute -inset-x-8 -inset-y-12 rounded-[80px] bg-[radial-gradient(closest-side,rgba(200,68,42,0.10),transparent_70%)] blur-2xl"
              />
              {/* The "page" itself — slight tilt, paper-warm white, drop shadow */}
              <div className="relative -rotate-[1.5deg] rounded-[6px] bg-[#faf8f3] p-10 text-[#1a1a1a] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.65),0_30px_60px_-15px_rgba(0,0,0,0.4)] sm:p-14">
                {/* Cover header */}
                <div className="mb-10 border-b border-[#1a1a1a]/15 pb-6">
                  <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#c8442a]">
                    {t.paperBadge}
                  </div>
                  <div className="mb-2 text-balance text-[28px] font-semibold leading-[1.1] tracking-tight text-[#0a0a0a] sm:text-[32px]">
                    {t.paperPlantTitle}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#1a1a1a]/55">
                    {t.paperVersion}
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-8">
                  <PaperSection label={t.paperSection1Label} body={t.paperSection1Body} />
                  <PaperSection label={t.paperSection2Label} body={t.paperSection2Body} />
                  <PaperSection label={t.paperSection3Label} body={t.paperSection3Body} />
                </div>

                {/* Footer */}
                <div className="mt-10 border-t border-[#1a1a1a]/15 pt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#1a1a1a]/45">
                  {t.paperFooter}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EDITORIAL STORY (anti-feature-grid) ─────────────────────── */}
      <section className="border-t border-white/[0.05]">
        <div className="mx-auto max-w-[920px] px-6 py-24 sm:py-32 lg:px-10 lg:py-40">
          <div className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            <span className="h-1 w-1 rounded-full bg-[#c8442a]" />
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
              href="/plant-brain-builder"
              className="group inline-flex items-center gap-2 rounded-full bg-[#c8442a] px-8 py-4 text-[15px] font-medium tracking-tight text-white transition hover:bg-[#d85432]"
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
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#c8442a]">
        {label}
      </div>
      <p className="text-[14px] leading-[1.6] text-[#1a1a1a]/85">{body}</p>
    </div>
  )
}
