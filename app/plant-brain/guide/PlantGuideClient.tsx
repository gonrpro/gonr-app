'use client'

// ============================================================================
// TASK-131 — Plant Guide client (printable)
// ============================================================================
// Reads the operator's wizard answers from localStorage (key gonr.plant-brain.intake)
// and renders them as a print-ready document.
//
// If no wizard data is found, shows a clean "complete the wizard first" call-to-action.
//
// Bilingual EN/ES via the same toggle pattern as the landing page.
//
// Print CSS optimizes for letter paper, suppresses navigation, ensures contrast.
// ============================================================================

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Lang = 'en' | 'es'

const LANG_KEY = 'gonr.plant-brain.lang'
const INTAKE_KEYS = [
  'gonr.plant-brain.intake',
  'plant-…e-v0', // current TASK-122.2 chat cockpit localStorage key
]

// ─── Wizard payload shape (subset relevant for the guide) ──────────────────
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
  scenariosFromSeed?: Array<{ id: string; title?: string; protocol?: string }>
}

const DEMO_WIZARD: WizardPayload = {
  plantName: 'Jerry’s Cleaners Demo Plant',
  profile: {
    spotting: { coverage: 92, data: { defaultFirstMove: 'Photograph, tag location, test dye stability, then route to board.', seniorOperatorRule: 'Protein stays cold; tannin stays acid-side; unknown silk is specialist-only.' } },
    'fiber-surface': { coverage: 86, data: { highRiskFibers: ['silk', 'wool', 'cashmere', 'acetate'], dryCleanOnlyRule: 'No wet-side action before construction and dye test.' } },
    chemicals: { coverage: 78, data: { coreShelf: ['NSD', 'POG', 'Protein Solution', 'Tannin Formula', '3% H₂O₂'], bleachPolicy: 'Bleach requires manager approval and documented neutralization.' } },
    escalation: { coverage: 84, data: { stopSignals: ['color movement', 'water ring', 'luster shift', 'unknown prior home attempt'], customerCall: 'Call before aggressive chemistry or no-guarantee work.' } },
    equipment: { coverage: 74, data: { boards: 'Primary spotting board + vacuum nose', dwellDefaults: 'Short dwell, flush, inspect, repeat only if stable.' } },
    'customer-comm': { coverage: 81, data: { tone: 'Confident but honest', handoff: 'Explain risk, route, and expected outcome in English/Spanish.' } },
    qc: { coverage: 69, data: { signoff: 'Dry inspection under bright light before heat or bagging.', recleanRule: 'Re-clean tagged before customer pickup.' } },
    exceptions: { coverage: 58, data: { knownProblems: ['vintage silk', 'red dye bleed', 'home peroxide attempts'], houseRule: 'If story is unclear, slow down and document.' } },
  },
  answeredQuestionIds: Array.from({ length: 37 }, (_, i) => `demo-${i + 1}`),
  scenariosFromSeed: [
    { id: 'blood-silk', title: 'Blood on Silk', protocol: 'Blot only, keep cold, no enzyme; route to specialist workflow after dye/luster test.' },
    { id: 'wine-cotton', title: 'Red Wine on Cotton', protocol: 'Cool flush from back, tannin formula if stable, inspect before any heat.' },
    { id: 'ink-polyester', title: 'Ink on Polyester', protocol: 'No scrub; solvent test hidden seam; isolate ring migration before extraction.' },
  ],
}

// ─── Bilingual copy ─────────────────────────────────────────────────────────
const COPY: Record<Lang, {
  emptyTitle: string
  emptySub: string
  emptyCta: string
  badge: string
  guideTitle: (plant: string) => string
  generated: string
  printAction: string
  modulesHeading: string
  noDataInModule: string
  modules: Record<ModuleId, { name: string; intro: string }>
  scenariosHeading: string
  noScenarios: string
  footer: string
  langToggleAria: string
}> = {
  en: {
    emptyTitle: 'No wizard data yet.',
    emptySub: 'Your Plant Guide is generated from your operator’s answers. Complete the wizard once and it lives here forever.',
    emptyCta: 'Start the wizard',
    badge: 'Plant Guide',
    guideTitle: (p) => `${p} · Plant Guide`,
    generated: 'Generated from your wizard answers',
    printAction: 'Print this guide',
    modulesHeading: 'Your plant’s expertise, by module',
    noDataInModule: 'No answers captured yet — finish this module in the wizard.',
    modules: {
      spotting: { name: 'Spotting defaults', intro: 'How your plant approaches stains generically.' },
      'fiber-surface': { name: 'Fiber & surface', intro: 'How your plant handles different fabrics and substrates.' },
      chemicals: { name: 'Chemistry inventory', intro: 'What’s on your shelf and what each one is for.' },
      escalation: { name: 'Escalation triggers', intro: 'When and why a stain leaves the counter for the board.' },
      equipment: { name: 'Equipment & boards', intro: 'Your spotting setup and the dwell-time defaults you run.' },
      'customer-comm': { name: 'Customer comms', intro: 'How your plant explains risk and outcomes to customers.' },
      qc: { name: 'QC standards', intro: 'What clean looks like and where QC signs off.' },
      exceptions: { name: 'Edge cases', intro: 'The weird stains and weirder fabrics your plant has seen.' },
    },
    scenariosHeading: 'Scenarios captured',
    noScenarios: 'No scenarios confirmed yet — the wizard builds these as your operator answers.',
    footer: 'GONR Plant Brain · Print, pin to the spotting board, update as your operators teach Plant Brain new things.',
    langToggleAria: 'Toggle language',
  },
  es: {
    emptyTitle: 'Aún no hay datos del wizard.',
    emptySub: 'Tu Plant Guide se genera de las respuestas de tu operador. Completa el wizard una vez y vive aquí para siempre.',
    emptyCta: 'Empezar el wizard',
    badge: 'Plant Guide',
    guideTitle: (p) => `${p} · Plant Guide`,
    generated: 'Generado desde las respuestas de tu wizard',
    printAction: 'Imprimir esta guía',
    modulesHeading: 'La experiencia de tu planta, por módulo',
    noDataInModule: 'Sin respuestas capturadas aún — termina este módulo en el wizard.',
    modules: {
      spotting: { name: 'Manchado por defecto', intro: 'Cómo aborda tu planta las manchas en general.' },
      'fiber-surface': { name: 'Fibra y superficie', intro: 'Cómo maneja tu planta diferentes telas y sustratos.' },
      chemicals: { name: 'Inventario químico', intro: 'Lo que hay en tu estante y para qué sirve cada cosa.' },
      escalation: { name: 'Disparadores de escalación', intro: 'Cuándo y por qué una mancha pasa del mostrador al tablero.' },
      equipment: { name: 'Equipo y tableros', intro: 'Tu configuración de manchado y los tiempos por defecto.' },
      'customer-comm': { name: 'Comunicación con cliente', intro: 'Cómo explica tu planta el riesgo y los resultados.' },
      qc: { name: 'Estándares de calidad', intro: 'Qué significa limpio y dónde firma QC.' },
      exceptions: { name: 'Casos especiales', intro: 'Las manchas raras y las telas más raras que tu planta ha visto.' },
    },
    scenariosHeading: 'Escenarios capturados',
    noScenarios: 'Aún no hay escenarios confirmados — el wizard los construye al responder tu operador.',
    footer: 'GONR Plant Brain · Imprime, pega en el tablero, actualiza cuando tus operadores enseñen cosas nuevas.',
    langToggleAria: 'Cambiar idioma',
  },
}

// Order modules so the guide reads top-down sensibly (foundations first)
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

function loadWizardData(): WizardPayload | null {
  if (typeof window === 'undefined') return null
  if (new URLSearchParams(window.location.search).get('demo') === '1') return DEMO_WIZARD
  for (const key of INTAKE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as WizardPayload
      if (!parsed || typeof parsed !== 'object') continue
      return parsed
    } catch {}
  }
  return null
}

function formatModuleData(data: Record<string, unknown> | undefined): { key: string; value: string }[] {
  if (!data) return []
  const out: { key: string; value: string }[] = []
  for (const [k, v] of Object.entries(data)) {
    if (v == null || v === '') continue
    if (Array.isArray(v)) {
      out.push({ key: humanizeKey(k), value: v.map(String).join(' · ') })
    } else if (typeof v === 'object') {
      out.push({ key: humanizeKey(k), value: JSON.stringify(v) })
    } else {
      out.push({ key: humanizeKey(k), value: String(v) })
    }
  }
  return out
}

function humanizeKey(k: string): string {
  return k
    .replace(/[._-]+/g, ' ')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
}

export default function PlantGuideClient() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en'
    return window.localStorage.getItem(LANG_KEY) === 'es' ? 'es' : 'en'
  })
  const [wizard, setWizard] = useState<WizardPayload | null>(() => loadWizardData())

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANG_KEY, lang)
    }
  }, [lang])

  // Refresh wizard data on focus (operator may have just finished the wizard in another tab)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onFocus = () => setWizard(loadWizardData())
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

  // Empty state — no wizard data captured
  if (!wizard || !wizard.profile) {
    return (
      <div className="min-h-screen bg-[#0b0c10] text-neutral-100 antialiased">
        <header className="border-b border-white/5">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/plant-brain" className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight">GONR</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] tracking-wide text-neutral-300">
                {t.badge}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.06]"
              aria-label={t.langToggleAria}
            >
              {lang === 'en' ? 'EN · ··' : '·· · ES'}
            </button>
          </div>
        </header>
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

  const plantName = wizard.plantName?.trim() || 'Your Plant'

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* Print-only style block */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 0.6in; }
          body { background: white; color: black; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          h1, h2, h3 { page-break-after: avoid; }
          .module-section { page-break-inside: avoid; }
        }
      `}</style>

      {/* ── Screen-only top bar ────────────────────────── */}
      <header className="no-print border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/plant-brain" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight text-neutral-900">GONR</span>
            <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] tracking-wide text-neutral-700">
              {t.badge}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              aria-label={t.langToggleAria}
            >
              {lang === 'en' ? 'EN · ··' : '·· · ES'}
            </button>
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="rounded-md bg-[#c75c2e] px-4 py-1.5 text-xs font-semibold tracking-wide text-white hover:bg-[#d56935]"
            >
              {t.printAction}
            </button>
          </div>
        </div>
      </header>

      {/* ── Guide body (print-optimized) ──────────────── */}
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        {/* Cover */}
        <header className="mb-12 border-b border-neutral-200 pb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-medium tracking-wide text-neutral-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c75c2e]" />
            {t.badge}
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            {t.guideTitle(plantName)}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-600">
            <span className="font-mono text-xs tracking-wider">{t.generated}</span>
            <span className="font-mono text-xs tracking-wider">
              {totalCoverage}% · {Object.keys(wizard.profile).length} modules
            </span>
            <span className="font-mono text-xs tracking-wider">
              {wizard.answeredQuestionIds?.length ?? 0} answers captured
            </span>
          </div>
        </header>

        {/* Modules */}
        <section className="mb-12">
          <h2 className="mb-8 text-balance text-2xl font-semibold tracking-tight text-neutral-900">
            {t.modulesHeading}
          </h2>
          <div className="space-y-10">
            {MODULE_ORDER.map((modId) => {
              const profile = wizard.profile?.[modId]
              const meta = t.modules[modId]
              const data = formatModuleData(profile?.data)
              return (
                <div key={modId} className="module-section border-l-2 border-[#c75c2e]/30 pl-6">
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="text-lg font-semibold tracking-tight text-neutral-900">{meta.name}</h3>
                    <span className="font-mono text-xs tracking-wider text-neutral-500">
                      {profile?.coverage ?? 0}%
                    </span>
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-neutral-600">{meta.intro}</p>
                  {data.length === 0 ? (
                    <p className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
                      {t.noDataInModule}
                    </p>
                  ) : (
                    <dl className="grid gap-2 sm:grid-cols-[max-content_1fr] sm:gap-x-6">
                      {data.map((entry, i) => (
                        <div key={i} className="contents">
                          <dt className="text-sm font-medium text-neutral-700">{entry.key}</dt>
                          <dd className="text-sm leading-relaxed text-neutral-900">{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Scenarios */}
        <section className="mb-12">
          <h2 className="mb-6 text-balance text-2xl font-semibold tracking-tight text-neutral-900">
            {t.scenariosHeading}
          </h2>
          {!wizard.scenariosFromSeed?.length ? (
            <p className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              {t.noScenarios}
            </p>
          ) : (
            <ol className="space-y-4">
              {wizard.scenariosFromSeed.map((s, i) => (
                <li key={s.id} className="rounded-md border border-neutral-200 p-4">
                  <div className="mb-2 flex items-baseline gap-3">
                    <span className="font-mono text-xs tracking-widest text-neutral-500">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-base font-semibold tracking-tight text-neutral-900">
                      {s.title ?? s.id}
                    </h3>
                  </div>
                  {s.protocol && (
                    <p className="text-sm leading-relaxed text-neutral-700">{s.protocol}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-neutral-200 pt-6">
          <p className="text-balance text-xs leading-relaxed text-neutral-500">{t.footer}</p>
        </footer>
      </main>
    </div>
  )
}
