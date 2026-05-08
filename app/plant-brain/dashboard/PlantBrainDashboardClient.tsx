'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Lang = 'en' | 'es'

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
  data?: Record<string, unknown>
  coverage?: number
}

interface WizardPayload {
  plantName?: string
  ownerEmail?: string
  profile?: Partial<Record<ModuleId, ModuleProfile>>
  answeredQuestionIds?: string[]
  scenariosFromSeed?: Array<{ id: string; title?: string }>
}

interface LoadState {
  wizard: WizardPayload | null
  sourceKey: string | null
  corruptedKeys: string[]
}

const LANG_KEY = 'gonr.plant-brain.lang'
const INTAKE_KEYS = [
  'gonr.plant-brain.intake',
  'plant-…e-v0',
]

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

const MODULE_LABELS: Record<Lang, Record<ModuleId, string>> = {
  en: {
    spotting: 'Spotting defaults',
    'fiber-surface': 'Fiber & surface risk',
    chemicals: 'Chemistry stack',
    escalation: 'Escalation triggers',
    equipment: 'Equipment & boards',
    qc: 'Quality control',
    'customer-comm': 'Customer language',
    exceptions: 'Edge cases',
  },
  es: {
    spotting: 'Reglas de manchado',
    'fiber-surface': 'Riesgo de fibra',
    chemicals: 'Química',
    escalation: 'Escalaciones',
    equipment: 'Equipo y tableros',
    qc: 'Control de calidad',
    'customer-comm': 'Lenguaje al cliente',
    exceptions: 'Casos especiales',
  },
}

const NAV = [
  { href: '/spottingboard/dashboard', label: 'Dashboard', desc: 'Plant status' },
  { href: '/spottingboard/intake', label: 'Capture rule', desc: 'Add plant knowledge' },
  { href: '/spottingboard/library', label: 'Brain Library', desc: 'Review cards' },
  { href: '/spottingboard/chemistry', label: 'Chemistry Stack', desc: 'Shelf + agents' },
  { href: '/spottingboard/supervisor', label: 'Supervisor Review', desc: 'Approve or reject' },
  { href: '/spottingboard/export', label: 'Export Center', desc: 'Own the brain' },
  { href: '/spottingboard/profile', label: 'Plant Profile', desc: 'Boundaries' },
]

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

function loadWizard(): LoadState {
  if (typeof window === 'undefined') return { wizard: null, sourceKey: null, corruptedKeys: [] }
  if (new URLSearchParams(window.location.search).get('demo') === '1') {
    return { wizard: DEMO_WIZARD, sourceKey: 'demo', corruptedKeys: [] }
  }

  const corruptedKeys: string[] = []
  for (const key of INTAKE_KEYS) {
    const raw = window.localStorage.getItem(key)
    if (!raw) continue
    try {
      return { wizard: JSON.parse(raw) as WizardPayload, sourceKey: key, corruptedKeys }
    } catch {
      corruptedKeys.push(key)
    }
  }
  return { wizard: null, sourceKey: null, corruptedKeys }
}

function clampCoverage(value: unknown) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export default function PlantBrainDashboardClient() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en'
    return window.localStorage.getItem(LANG_KEY) === 'es' ? 'es' : 'en'
  })
  const [loadState, setLoadState] = useState<LoadState>(() => loadWizard())

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(LANG_KEY, lang)
  }, [lang])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const refresh = () => setLoadState(loadWizard())
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const wizard = loadState.wizard
  const labels = MODULE_LABELS[lang]
  const plantName = wizard?.plantName?.trim() || (lang === 'en' ? 'Your plant' : 'Tu planta')
  const moduleRows = useMemo(() => MODULE_ORDER.map((id) => {
    const coverage = clampCoverage(wizard?.profile?.[id]?.coverage)
    return { id, label: labels[id], coverage }
  }), [labels, wizard])
  const totalCoverage = useMemo(() => {
    const active = moduleRows.filter((m) => m.coverage > 0)
    if (!active.length) return 0
    return Math.round(active.reduce((sum, m) => sum + m.coverage, 0) / active.length)
  }, [moduleRows])
  const weakModules = moduleRows.filter((m) => m.coverage < 70)
  const answeredCount = wizard?.answeredQuestionIds?.length ?? 0
  const scenarioCount = wizard?.scenariosFromSeed?.length ?? 0

  return (
    <div className="min-h-screen bg-[#0b0c10] text-neutral-100 antialiased">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0b0c10]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/spottingboard/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="h-3 w-3 rounded-sm bg-[#00a085]" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight">Spotting Board</span>
              <span className="block truncate text-[11px] text-neutral-500">Plant brain command center</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-neutral-300 hover:border-white/20"
            >
              {lang === 'en' ? 'EN' : 'ES'}
            </button>
            <Link href="/spottingboard/intake" className="rounded-md bg-[#00a085] px-3 py-2 text-xs font-semibold text-white hover:bg-[#00b894]">
              Capture rule
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/8 px-4 py-5 lg:block">
          <nav className="space-y-1" aria-label="Spotting Board dashboard navigation">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg border px-3 py-3 transition ${item.href.endsWith('/dashboard') ? 'border-[#00a085]/35 bg-[#00a085]/10' : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'}`}
              >
                <span className="block text-sm font-semibold text-neutral-100">{item.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-neutral-500">{item.desc}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {loadState.corruptedKeys.length > 0 ? (
            <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              Some saved intake data could not be read. The dashboard is using the newest valid plant brain data it found.
            </div>
          ) : null}

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-xl border border-white/10 bg-[#111722] p-5 sm:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00a085]">Plant status</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{plantName}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                    {wizard?.profile
                      ? 'Your plant brain is usable. Keep capturing the rules that usually live in one operator’s head.'
                      : 'No plant brain found on this device yet. Start with intake, or load the demo to see the operating dashboard.'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 md:min-w-[300px]">
                  <Stat label="Coverage" value={`${totalCoverage}%`} tone={totalCoverage >= 75 ? 'good' : totalCoverage >= 45 ? 'warn' : 'risk'} />
                  <Stat label="Answers" value={String(answeredCount)} />
                  <Stat label="Scenarios" value={String(scenarioCount)} />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Action href="/spottingboard/intake" title="Capture a plant rule" desc="Fastest path to make the brain smarter." primary />
                <Action href="/spottingboard/library" title="Review brain library" desc="See protocol cards and provenance." />
                <Action href="/spottingboard/supervisor" title="Supervisor review" desc="Approve, reject, or escalate risky items." />
                <Action href="/spottingboard/export" title="Export / print" desc="Own the guide outside the app." />
              </div>
            </div>

            <aside className="rounded-xl border border-white/10 bg-[#111722] p-5">
              <h2 className="text-base font-semibold text-white">Today’s next move</h2>
              {wizard?.profile ? (
                <div className="mt-4 space-y-3">
                  {weakModules.slice(0, 3).map((m) => (
                    <Link key={m.id} href="/spottingboard/intake" className="block rounded-lg border border-white/8 bg-black/20 p-3 hover:border-[#00a085]/40">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-neutral-100">Improve {m.label}</span>
                        <span className="text-xs text-neutral-500">{m.coverage}%</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">Capture one SOP, exception, or stop-signal for this area.</p>
                    </Link>
                  ))}
                  {weakModules.length === 0 ? (
                    <Link href="/spottingboard/supervisor" className="block rounded-lg border border-[#00a085]/30 bg-[#00a085]/10 p-3 text-sm font-medium text-white">
                      Coverage is strong. Review items waiting for supervisor approval.
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <Link href="/spottingboard/intake" className="block rounded-lg border border-[#00a085]/35 bg-[#00a085]/10 p-3 text-sm font-medium text-white">Start intake</Link>
                  <Link href="/spottingboard/dashboard?demo=1" className="block rounded-lg border border-white/10 p-3 text-sm font-medium text-neutral-300 hover:border-white/20">View demo dashboard</Link>
                </div>
              )}
            </aside>
          </section>

          <section className="mt-5 rounded-xl border border-white/10 bg-[#111722] p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white">Module coverage</h2>
                <p className="mt-1 text-sm text-neutral-500">Plain status by work area. Low coverage means the product needs more plant-specific knowledge.</p>
              </div>
              <span className="text-xs text-neutral-600">Source: {loadState.sourceKey ?? 'none'}</span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {moduleRows.map((m) => (
                <ModuleCard key={m.id} label={m.label} coverage={m.coverage} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' | 'risk' }) {
  const toneClass = {
    neutral: 'text-white',
    good: 'text-[#6ee7b7]',
    warn: 'text-amber-300',
    risk: 'text-red-300',
  }[tone]
  return (
    <div className="rounded-lg border border-white/8 bg-black/18 p-3">
      <div className={`text-xl font-semibold tracking-tight ${toneClass}`}>{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-neutral-500">{label}</div>
    </div>
  )
}

function Action({ href, title, desc, primary = false }: { href: string; title: string; desc: string; primary?: boolean }) {
  return (
    <Link href={href} className={`rounded-lg border p-4 transition ${primary ? 'border-[#00a085]/40 bg-[#00a085]/10 hover:border-[#00a085]/70' : 'border-white/8 bg-black/18 hover:border-white/18'}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-neutral-500">→</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-neutral-500">{desc}</p>
    </Link>
  )
}

function ModuleCard({ label, coverage }: { label: string; coverage: number }) {
  const status = coverage >= 80 ? 'Strong' : coverage >= 55 ? 'Needs detail' : coverage > 0 ? 'Thin' : 'Empty'
  const bar = coverage >= 80 ? 'bg-[#00a085]' : coverage >= 55 ? 'bg-amber-400' : coverage > 0 ? 'bg-orange-400' : 'bg-neutral-700'
  return (
    <div className="rounded-lg border border-white/8 bg-black/18 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-5 text-white">{label}</h3>
        <span className="rounded-md border border-white/8 px-2 py-1 text-xs text-neutral-400">{coverage}%</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6">
        <div className={`h-full ${bar}`} style={{ width: `${coverage}%` }} />
      </div>
      <p className="mt-3 text-xs text-neutral-500">{status}</p>
    </div>
  )
}
