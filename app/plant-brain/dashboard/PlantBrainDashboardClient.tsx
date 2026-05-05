'use client'

// ============================================================================
// TASK-131 — Plant Brain Dashboard client
// ============================================================================
// Sticky retention surface — the operator's home after they invest in the wizard.
//
// Data sources tonight:
//   - localStorage `gonr.plant-brain.intake` (TASK-122.2 wizard payload)
//   - localStorage `gonr.plant-brain.lang` (EN/ES toggle, shared with landing/guide)
//
// Surfaces (per Atlas msg 11476 dashboard scope):
//   - Plant identity + wizard coverage ring
//   - 8-module coverage grid (live from wizard data)
//   - Quick actions row: View Guide / Continue Wizard / Print
//   - Coming-soon module stubs (chemistry / constraints / customer handoff /
//     staff training / plant-specific solves) — labeled honestly, not faked
//
// Empty state: no wizard yet → CTA into wizard.
// Bilingual: EN/ES toggle (shared persistence with landing).
// ============================================================================

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Lang = 'en' | 'es'

const LANG_KEY = 'gonr.plant-brain.lang'
const INTAKE_KEYS = [
  'gonr.plant-brain.intake',
  'plant-…e-v0', // current TASK-122.2 chat cockpit localStorage key
]

type ModuleId =
  | 'spotting'
  | 'fiber-surface'
  | 'chemicals'
  | 'escalation'
  | 'equipment'
  | 'customer-comm'
  | 'qc'
  | 'exceptions'

interface ModuleProfile {
  data: Record<string, unknown>
  coverage: number
}

interface WizardPayload {
  plantName?: string
  ownerEmail?: string
  profile?: Record<ModuleId, ModuleProfile>
  answeredQuestionIds?: string[]
  scenariosFromSeed?: Array<{ id: string; title?: string }>
}

const DEMO_WIZARD: WizardPayload = {
  plantName: 'Jerry’s Cleaners Demo Plant',
  profile: {
    spotting: { coverage: 92, data: { defaultFirstMove: 'Photograph, tag location, test dye stability, then route to board.' } },
    'fiber-surface': { coverage: 86, data: { highRiskFibers: ['silk', 'wool', 'cashmere', 'acetate'] } },
    chemicals: { coverage: 78, data: { coreShelf: ['NSD', 'POG', 'Protein Solution', 'Tannin Formula', '3% H₂O₂'] } },
    escalation: { coverage: 84, data: { stopSignals: ['color movement', 'water ring', 'luster shift'] } },
    equipment: { coverage: 74, data: { boards: 'Primary spotting board + vacuum nose' } },
    'customer-comm': { coverage: 81, data: { tone: 'Confident but honest' } },
    qc: { coverage: 69, data: { signoff: 'Dry inspection under bright light before heat or bagging.' } },
    exceptions: { coverage: 58, data: { knownProblems: ['vintage silk', 'red dye bleed', 'home peroxide attempts'] } },
  },
  answeredQuestionIds: Array.from({ length: 37 }, (_, i) => `demo-${i + 1}`),
  scenariosFromSeed: [
    { id: 'blood-silk', title: 'Blood on Silk' },
    { id: 'wine-cotton', title: 'Red Wine on Cotton' },
    { id: 'ink-polyester', title: 'Ink on Polyester' },
  ],
}

const MODULE_ORDER: ModuleId[] = [
  'spotting',
  'fiber-surface',
  'chemicals',
  'escalation',
  'equipment',
  'qc',
  'customer-comm',
  'exceptions',
]

const COPY: Record<Lang, {
  emptyTitle: string
  emptySub: string
  emptyCta: string
  badge: string
  hello: (plant: string) => string
  helloSub: string
  ringLabel: string
  ringSub: string
  modulesHeading: string
  modules: Record<ModuleId, string>
  moduleCoverage: string
  quickActionsHeading: string
  actionGuide: string
  actionGuideDesc: string
  actionWizard: string
  actionWizardDesc: string
  actionPrint: string
  actionPrintDesc: string
  upcomingHeading: string
  upcoming: { id: string; name: string; desc: string }[]
  upcomingNote: string
  langToggleAria: string
}> = {
  en: {
    emptyTitle: 'Your Plant Brain isn’t built yet.',
    emptySub: 'The dashboard becomes your home once your operator finishes the wizard. Twenty minutes from your senior operator, a living plant brain forever.',
    emptyCta: 'Start the wizard',
    badge: 'Plant Brain',
    hello: (p) => `${p} · Plant Brain`,
    helloSub: 'Your plant’s living knowledge — captured, searchable, ready when the next shift walks in.',
    ringLabel: 'Coverage',
    ringSub: 'across 8 modules',
    modulesHeading: 'Module coverage',
    modules: {
      spotting: 'Spotting defaults',
      'fiber-surface': 'Fiber & surface',
      chemicals: 'Chemistry inventory',
      escalation: 'Escalation triggers',
      equipment: 'Equipment & boards',
      qc: 'QC standards',
      'customer-comm': 'Customer comms',
      exceptions: 'Edge cases',
    },
    moduleCoverage: 'covered',
    quickActionsHeading: 'Quick actions',
    actionGuide: 'View Plant Guide',
    actionGuideDesc: 'Printable, bilingual, shift-ready.',
    actionWizard: 'Continue wizard',
    actionWizardDesc: 'Add what your operator hasn’t taught Plant Brain yet.',
    actionPrint: 'Print guide',
    actionPrintDesc: 'For the spotting board, today.',
    upcomingHeading: 'Coming next',
    upcoming: [
      { id: 'chemistry', name: 'Chemistry inventory', desc: 'What’s on your shelf, with brand, strength, and purpose. Editable per shift.' },
      { id: 'constraints', name: 'Plant constraints', desc: 'Bleach allowed? Solvent profile? Skill ceiling? Locked in once, applied to every solve.' },
      { id: 'handoff', name: 'Customer handoff scripts', desc: 'How your plant explains risk and outcome to a customer — without scaring them off.' },
      { id: 'training', name: 'Staff training tracks', desc: 'Day-one orientation through advanced spotter prep, anchored to your plant’s SOPs.' },
      { id: 'solves', name: 'Plant-tuned solves', desc: 'Every stain solve, anchored to your chemistry, your equipment, your house rules.' },
    ],
    upcomingNote: 'These modules are in build — your wizard answers feed them when they ship.',
    langToggleAria: 'Toggle language',
  },
  es: {
    emptyTitle: 'Tu Plant Brain aún no está construido.',
    emptySub: 'El dashboard se vuelve tu hogar una vez que tu operador termine el wizard. Veinte minutos de tu operador principal, un cerebro de planta vivo para siempre.',
    emptyCta: 'Empezar el wizard',
    badge: 'Plant Brain',
    hello: (p) => `${p} · Plant Brain`,
    helloSub: 'El conocimiento vivo de tu planta — capturado, buscable, listo cuando llega el siguiente turno.',
    ringLabel: 'Cobertura',
    ringSub: 'a través de 8 módulos',
    modulesHeading: 'Cobertura por módulo',
    modules: {
      spotting: 'Manchado por defecto',
      'fiber-surface': 'Fibra y superficie',
      chemicals: 'Inventario químico',
      escalation: 'Disparadores de escalación',
      equipment: 'Equipo y tableros',
      qc: 'Estándares de calidad',
      'customer-comm': 'Comunicación con cliente',
      exceptions: 'Casos especiales',
    },
    moduleCoverage: 'cubierto',
    quickActionsHeading: 'Acciones rápidas',
    actionGuide: 'Ver Plant Guide',
    actionGuideDesc: 'Imprimible, bilingüe, listo para el turno.',
    actionWizard: 'Continuar wizard',
    actionWizardDesc: 'Agrega lo que tu operador aún no le ha enseñado.',
    actionPrint: 'Imprimir guía',
    actionPrintDesc: 'Para el tablero de manchado, hoy.',
    upcomingHeading: 'Próximos módulos',
    upcoming: [
      { id: 'chemistry', name: 'Inventario químico', desc: 'Lo que hay en tu estante, con marca, concentración y propósito. Editable por turno.' },
      { id: 'constraints', name: 'Restricciones de planta', desc: '¿Cloro permitido? ¿Perfil de solvente? ¿Nivel de habilidad? Se fija una vez, se aplica a cada solve.' },
      { id: 'handoff', name: 'Guiones de comunicación con cliente', desc: 'Cómo tu planta explica el riesgo y el resultado — sin asustar al cliente.' },
      { id: 'training', name: 'Pistas de entrenamiento', desc: 'Orientación del primer día hasta preparación avanzada de manchador, ancladas a los SOPs de tu planta.' },
      { id: 'solves', name: 'Solves ajustados a tu planta', desc: 'Cada solve de mancha, anclado a tu química, tu equipo, tus reglas.' },
    ],
    upcomingNote: 'Estos módulos están en construcción — las respuestas de tu wizard los alimentan cuando se lancen.',
    langToggleAria: 'Cambiar idioma',
  },
}

function loadWizard(): WizardPayload | null {
  if (typeof window === 'undefined') return null
  if (new URLSearchParams(window.location.search).get('demo') === '1') return DEMO_WIZARD
  for (const key of INTAKE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      return JSON.parse(raw) as WizardPayload
    } catch {}
  }
  return null
}

export default function PlantBrainDashboardClient() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en'
    return window.localStorage.getItem(LANG_KEY) === 'es' ? 'es' : 'en'
  })
  const [wizard, setWizard] = useState<WizardPayload | null>(() => loadWizard())

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANG_KEY, lang)
    }
  }, [lang])

  // Refresh on focus so completing the wizard in another tab updates the dashboard.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onFocus = () => setWizard(loadWizard())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const t = COPY[lang]

  const totalCoverage = useMemo(() => {
    if (!wizard?.profile) return 0
    const vals = Object.values(wizard.profile).map((m) => m?.coverage ?? 0)
    if (!vals.length) return 0
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }, [wizard])

  const answeredCount = wizard?.answeredQuestionIds?.length ?? 0

  // ── EMPTY STATE ──────────────────────────────────────
  if (!wizard || !wizard.profile) {
    return (
      <div className="min-h-screen bg-[#0b0c10] text-neutral-100 antialiased">
        <DashboardHeader lang={lang} setLang={setLang} t={t} />
        <main className="mx-auto max-w-2xl px-6 py-32 text-center">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t.emptyTitle}</h1>
          <p className="mt-6 text-balance text-base leading-relaxed text-neutral-300">{t.emptySub}</p>
          <Link
            href="/plant-brain-builder"
            className="mt-10 inline-block rounded-lg bg-[#c75c2e] px-7 py-3 text-sm font-semibold tracking-wide text-white hover:bg-[#d56935]"
          >
            {t.emptyCta}
          </Link>
        </main>
      </div>
    )
  }

  const plantName = wizard.plantName?.trim() || (lang === 'en' ? 'Your Plant' : 'Tu Planta')

  return (
    <div className="min-h-screen bg-[#0b0c10] text-neutral-100 antialiased">
      <DashboardHeader lang={lang} setLang={setLang} t={t} />

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(800px_400px_at_75%_-10%,rgba(199,92,46,0.14),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-12 sm:pt-20">
          <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium tracking-wide text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c75c2e]" />
                {t.badge}
              </div>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {t.hello(plantName)}
              </h1>
              <p className="mt-4 max-w-2xl text-balance text-base leading-relaxed text-neutral-300">
                {t.helloSub}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs tracking-widest text-neutral-500">
                <span>{answeredCount} ANSWERS</span>
                <span>{Object.keys(wizard.profile).length} MODULES</span>
                <span>{wizard.scenariosFromSeed?.length ?? 0} SCENARIOS</span>
              </div>
            </div>

            <CoverageRing percent={totalCoverage} label={t.ringLabel} sub={t.ringSub} />
          </div>
        </div>
      </section>

      {/* ── MODULE COVERAGE GRID ─────────────────────── */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-10 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{t.modulesHeading}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MODULE_ORDER.map((modId) => {
              const cov = wizard.profile?.[modId]?.coverage ?? 0
              return (
                <div
                  key={modId}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-5 transition hover:border-white/10 hover:bg-white/[0.035]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold tracking-wide text-white">{t.modules[modId]}</span>
                    <span className="font-mono text-[11px] text-neutral-500">{cov}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-[#c75c2e] transition-all"
                      style={{ width: `${cov}%` }}
                    />
                  </div>
                  <div className="mt-3 text-[11px] uppercase tracking-widest text-neutral-500">{t.moduleCoverage}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── QUICK ACTIONS ────────────────────────────── */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-8 text-balance text-2xl font-semibold tracking-tight">{t.quickActionsHeading}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <ActionCard
              href="/plant-brain/guide"
              title={t.actionGuide}
              desc={t.actionGuideDesc}
              accent
            />
            <ActionCard
              href="/plant-brain-builder"
              title={t.actionWizard}
              desc={t.actionWizardDesc}
            />
            <ActionCard
              href="/plant-brain/guide#print"
              title={t.actionPrint}
              desc={t.actionPrintDesc}
            />
          </div>
        </div>
      </section>

      {/* ── COMING NEXT ─────────────────────────────── */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-3 text-balance text-2xl font-semibold tracking-tight">{t.upcomingHeading}</h2>
          <p className="mb-10 text-sm text-neutral-500">{t.upcomingNote}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {t.upcoming.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-5"
              >
                <h3 className="mb-2 text-sm font-semibold tracking-wide text-neutral-200">{m.name}</h3>
                <p className="text-sm leading-relaxed text-neutral-400">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10">
        <p className="font-mono text-[11px] tracking-widest text-neutral-500">GONR PLANT BRAIN · DASHBOARD</p>
      </footer>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

function DashboardHeader({
  lang, setLang, t,
}: {
  lang: Lang
  setLang: (l: Lang) => void
  t: (typeof COPY)[Lang]
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0b0c10]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/plant-brain" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">GONR</span>
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium tracking-wide text-neutral-300">
            {t.badge}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium tracking-wide text-neutral-300 hover:bg-white/[0.06]"
            aria-label={t.langToggleAria}
          >
            {lang === 'en' ? 'EN · ··' : '·· · ES'}
          </button>
        </div>
      </div>
    </header>
  )
}

function CoverageRing({ percent, label, sub }: { percent: number; label: string; sub: string }) {
  const size = 160
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (percent / 100) * c
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#c75c2e"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      </svg>
      <div>
        <div className="font-mono text-4xl font-semibold tracking-tight text-white">{percent}%</div>
        <div className="text-sm text-neutral-300">{label}</div>
        <div className="mt-0.5 text-xs text-neutral-500">{sub}</div>
      </div>
    </div>
  )
}

function ActionCard({
  href, title, desc, accent = false,
}: { href: string; title: string; desc: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`group rounded-xl border p-6 transition ${
        accent
          ? 'border-[#c75c2e]/40 bg-gradient-to-b from-[#c75c2e]/10 to-transparent hover:border-[#c75c2e]/60'
          : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-semibold tracking-tight text-white">{title}</h3>
        <span className="text-neutral-500 transition group-hover:translate-x-0.5 group-hover:text-neutral-300">→</span>
      </div>
      <p className="text-sm leading-relaxed text-neutral-400">{desc}</p>
    </Link>
  )
}
