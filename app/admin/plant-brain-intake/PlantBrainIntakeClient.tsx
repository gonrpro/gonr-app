'use client'

// TASK-122 — Plant Brain Intake v0
// Private owner/admin intake surface. Owner-only by design.
// Deploy at: app/admin/plant-brain-intake/page.tsx (gated by existing /admin auth).
//
// v0 SCOPE (Atlas msg 11327 + 11328):
//   - 10 seeded scenarios (editable in-place + add custom)
//   - Stock GONR default shown (text field, owner can edit)
//   - Same / Different / Refuse buttons
//   - 5-axis selectors (visible when "Different")
//   - Delta vs stock (auto-derived)
//   - Why note (text)
//   - Recognition signal (3-way: quick / scratch / disagree)
//   - Safety conflict signal (3-way: none / possible / hard)
//   - Status (draft / needs_clarification / blocked_safety / approved)
//   - Time-on-card timer
//   - localStorage persistence (zero backend, zero DDL)
//   - JSON export (CSV + MD also included — cheap)
//   - Reset session with confirm
//
// NON-GOALS (do NOT add):
//   - No deterministic rules engine
//   - No Stain Brain runtime override
//   - No staff app
//   - No Supabase calls / no production DDL
//   - No outreach
//   - No voice recording (text-only why note in v0)

import { useEffect, useState } from 'react'
import {
  SEED_SCENARIOS,
  AXIS_OPTIONS,
  AXIS_LABELS,
  type SeedScenario,
  type StockAxes,
} from './scenarios'

type Decision = 'same' | 'different' | 'refuse' | null
type Recognition = 'quick' | 'scratch' | 'disagree' | null
type SafetyConflict = 'none' | 'possible' | 'hard' | null
type Status = 'draft' | 'needs_clarification' | 'blocked_safety' | 'approved'

type Response = {
  scenarioId: string
  decision: Decision
  axes: StockAxes
  whyNote: string
  recognition: Recognition
  safetyConflict: SafetyConflict
  status: Status
  timeOnCardMs: number
  startedAt: string | null
  lastEditedAt: string | null
}

type SessionState = {
  sessionId: string
  startedAt: string
  scenarios: SeedScenario[]
  responses: Record<string, Response>
  currentIndex: number
}

const LS_KEY = 'plant-brain-intake-v0'

function newSessionId() {
  return `pb-intake-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`
}

function makeEmptyResponse(scenarioId: string, stockAxes: StockAxes): Response {
  return {
    scenarioId,
    decision: null,
    axes: { ...stockAxes },
    whyNote: '',
    recognition: null,
    safetyConflict: null,
    status: 'draft',
    timeOnCardMs: 0,
    startedAt: null,
    lastEditedAt: null,
  }
}

function deriveDelta(scenario: SeedScenario, response: Response): string[] {
  if (response.decision === 'same' || response.decision === null) return []
  const deltas: string[] = []
  for (const key of Object.keys(scenario.stockAxes) as (keyof StockAxes)[]) {
    if (scenario.stockAxes[key] !== response.axes[key]) {
      deltas.push(`${AXIS_LABELS[key]}: ${scenario.stockAxes[key]} → ${response.axes[key]}`)
    }
  }
  return deltas
}

function loadSession(): SessionState {
  if (typeof window === 'undefined') return freshSession()
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return freshSession()
    const parsed = JSON.parse(raw) as SessionState
    if (!parsed.scenarios || !parsed.responses) return freshSession()
    return parsed
  } catch {
    return freshSession()
  }
}

function freshSession(): SessionState {
  const scenarios = JSON.parse(JSON.stringify(SEED_SCENARIOS)) as SeedScenario[]
  const responses: Record<string, Response> = {}
  for (const s of scenarios) {
    responses[s.id] = makeEmptyResponse(s.id, s.stockAxes)
  }
  return {
    sessionId: newSessionId(),
    startedAt: new Date().toISOString(),
    scenarios,
    responses,
    currentIndex: 0,
  }
}

function saveSession(state: SessionState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LS_KEY, JSON.stringify(state))
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportJSON(state: SessionState) {
  const enriched = {
    ...state,
    exportedAt: new Date().toISOString(),
    deltas: state.scenarios.map((s) => ({
      scenarioId: s.id,
      delta: deriveDelta(s, state.responses[s.id] || makeEmptyResponse(s.id, s.stockAxes)),
    })),
  }
  downloadFile(
    `${state.sessionId}.json`,
    JSON.stringify(enriched, null, 2),
    'application/json',
  )
}

function exportCSV(state: SessionState) {
  const rows: string[] = []
  rows.push(
    [
      'scenario_id',
      'description',
      'decision',
      'pre_treatment',
      'solvent_routing',
      'risk_level',
      'time_charge',
      'team_escalation',
      'delta',
      'why_note',
      'recognition',
      'safety_conflict',
      'status',
      'time_on_card_ms',
    ]
      .map(csvCell)
      .join(','),
  )
  for (const s of state.scenarios) {
    const r = state.responses[s.id] || makeEmptyResponse(s.id, s.stockAxes)
    const delta = deriveDelta(s, r).join(' | ')
    rows.push(
      [
        s.id,
        s.description,
        r.decision || '',
        r.axes.preTreatment,
        r.axes.solventRouting,
        r.axes.riskLevel,
        r.axes.timeCharge,
        r.axes.teamEscalation,
        delta,
        r.whyNote,
        r.recognition || '',
        r.safetyConflict || '',
        r.status,
        String(r.timeOnCardMs),
      ]
        .map(csvCell)
        .join(','),
    )
  }
  downloadFile(`${state.sessionId}.csv`, rows.join('\n'), 'text/csv')
}

function csvCell(v: string): string {
  return `"${(v || '').replace(/"/g, '""')}"`
}

function exportMarkdown(state: SessionState) {
  const lines: string[] = []
  lines.push(`# Plant Brain Intake — ${state.sessionId}`)
  lines.push('')
  lines.push(`Started: ${state.startedAt}`)
  lines.push(`Exported: ${new Date().toISOString()}`)
  lines.push(`Scenarios: ${state.scenarios.length}`)
  lines.push('')
  for (const s of state.scenarios) {
    const r = state.responses[s.id] || makeEmptyResponse(s.id, s.stockAxes)
    const delta = deriveDelta(s, r)
    lines.push(`## ${s.id}`)
    lines.push('')
    lines.push(`**Scenario:** ${s.description}`)
    lines.push('')
    lines.push(`**Stock GONR default:** ${s.stockDefault}`)
    lines.push('')
    lines.push(`**Decision:** ${r.decision || '(unanswered)'}`)
    lines.push(`**Status:** ${r.status}`)
    lines.push(`**Recognition:** ${r.recognition || '(unmarked)'}`)
    lines.push(`**Safety conflict:** ${r.safetyConflict || '(unmarked)'}`)
    lines.push(`**Time on card:** ${(r.timeOnCardMs / 1000).toFixed(1)}s`)
    lines.push('')
    lines.push('**5-axis values:**')
    lines.push(`- Pre-treatment: ${r.axes.preTreatment}${s.stockAxes.preTreatment !== r.axes.preTreatment ? ` _(was: ${s.stockAxes.preTreatment})_` : ''}`)
    lines.push(`- Solvent routing: ${r.axes.solventRouting}${s.stockAxes.solventRouting !== r.axes.solventRouting ? ` _(was: ${s.stockAxes.solventRouting})_` : ''}`)
    lines.push(`- Risk level: ${r.axes.riskLevel}${s.stockAxes.riskLevel !== r.axes.riskLevel ? ` _(was: ${s.stockAxes.riskLevel})_` : ''}`)
    lines.push(`- Time & charge: ${r.axes.timeCharge}${s.stockAxes.timeCharge !== r.axes.timeCharge ? ` _(was: ${s.stockAxes.timeCharge})_` : ''}`)
    lines.push(`- Team escalation: ${r.axes.teamEscalation}${s.stockAxes.teamEscalation !== r.axes.teamEscalation ? ` _(was: ${s.stockAxes.teamEscalation})_` : ''}`)
    lines.push('')
    if (delta.length > 0) {
      lines.push('**Delta vs stock:**')
      for (const d of delta) lines.push(`- ${d}`)
      lines.push('')
    }
    if (r.whyNote) {
      lines.push(`**Why:** ${r.whyNote}`)
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  }
  downloadFile(`${state.sessionId}.md`, lines.join('\n'), 'text/markdown')
}

export default function PlantBrainIntakePage() {
  const [state, setState] = useState<SessionState>(() => loadSession())
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showAddScenario, setShowAddScenario] = useState(false)

  const scenario = state.scenarios[state.currentIndex]

  // Persist on change
  useEffect(() => {
    saveSession(state)
  }, [state])

  // Card timer
  useEffect(() => {
    if (!scenario) return
    const scenarioId = scenario.id
    const startTimer = window.setTimeout(() => {
      setState((prev) => {
        const r = prev.responses[scenarioId]
        if (!r || r.startedAt) return prev
        const next = { ...prev, responses: { ...prev.responses } }
        next.responses[scenarioId] = { ...r, startedAt: new Date().toISOString() }
        return next
      })
    }, 0)
    const interval = window.setInterval(() => {
      setState((prev) => {
        const r = prev.responses[scenarioId]
        if (!r || !r.startedAt) return prev
        const elapsed = Date.now() - new Date(r.startedAt).getTime()
        if (elapsed === r.timeOnCardMs) return prev
        const next = { ...prev, responses: { ...prev.responses } }
        next.responses[scenarioId] = { ...r, timeOnCardMs: elapsed }
        return next
      })
    }, 1000)
    return () => {
      window.clearTimeout(startTimer)
      window.clearInterval(interval)
    }
  }, [scenario])

  if (!scenario) {
    return <div className="p-8 text-center">No scenarios. Reset session.</div>
  }
  const response = state.responses[scenario.id] || makeEmptyResponse(scenario.id, scenario.stockAxes)
  const delta = deriveDelta(scenario, response)

  function updateResponse(patch: Partial<Response>) {
    setState((prev) => {
      if (!prev) return prev
      const r = prev.responses[scenario.id]
      const next = { ...prev, responses: { ...prev.responses } }
      next.responses[scenario.id] = { ...r, ...patch, lastEditedAt: new Date().toISOString() }
      return next
    })
  }

  function updateScenarioField(field: 'description' | 'stockDefault', value: string) {
    setState((prev) => {
      if (!prev) return prev
      const next = {
        ...prev,
        scenarios: prev.scenarios.map((s, i) =>
          i === prev.currentIndex ? { ...s, [field]: value } : s,
        ),
      }
      return next
    })
  }

  function setAxis(key: keyof StockAxes, value: string) {
    updateResponse({ axes: { ...response.axes, [key]: value as never } })
  }

  function setDecision(decision: Decision) {
    if (decision === 'same') {
      updateResponse({ decision, axes: { ...scenario.stockAxes } })
    } else if (decision === 'refuse') {
      updateResponse({
        decision,
        axes: { ...response.axes, riskLevel: 'no go', solventRouting: 'refuse' },
      })
    } else {
      updateResponse({ decision })
    }
  }

  function nav(delta: number) {
    setState((prev) => {
      if (!prev) return prev
      const newIndex = Math.max(0, Math.min(prev.scenarios.length - 1, prev.currentIndex + delta))
      return { ...prev, currentIndex: newIndex }
    })
  }

  function resetSession() {
    if (typeof window !== 'undefined') window.localStorage.removeItem(LS_KEY)
    setState(freshSession())
    setShowResetConfirm(false)
  }

  function addCustomScenario(description: string, garment: string, stain: string, stockDefault: string) {
    const id = `custom-${Date.now()}`
    const newScenario: SeedScenario = {
      id,
      description,
      garment,
      stain,
      stockDefault,
      stockAxes: {
        preTreatment: 'pre-test inconspicuous',
        solventRouting: 'wet clean',
        riskLevel: 'flag for owner',
        timeCharge: 'standard',
        teamEscalation: 'any spotter',
      },
    }
    setState((prev) => {
      if (!prev) return prev
      const next = {
        ...prev,
        scenarios: [...prev.scenarios, newScenario],
        responses: { ...prev.responses, [id]: makeEmptyResponse(id, newScenario.stockAxes) },
      }
      return next
    })
    setShowAddScenario(false)
  }

  const completedCount = state.scenarios.filter((s) => state.responses[s.id]?.status === 'approved').length

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Plant Brain Intake <span className="text-slate-500 text-sm font-normal">v0 · TASK-122</span></h1>
            <p className="text-sm text-slate-400">Owner/admin only — no staff visibility, no production data.</p>
          </div>
          <div className="text-right text-sm">
            <div>Scenario {state.currentIndex + 1} of {state.scenarios.length}</div>
            <div className="text-slate-500">{completedCount} approved</div>
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${(completedCount / state.scenarios.length) * 100}%` }}
          />
        </div>

        {/* Scenario card */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-5">
          {/* Status pill + timer + ID */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-mono">{scenario.id}</span>
            <span
              className={
                'px-2 py-1 rounded-full font-medium ' +
                {
                  draft: 'bg-slate-700 text-slate-300',
                  needs_clarification: 'bg-amber-700/40 text-amber-200',
                  blocked_safety: 'bg-rose-700/40 text-rose-200',
                  approved: 'bg-emerald-700/40 text-emerald-200',
                }[response.status]
              }
            >
              {response.status.replace('_', ' ')}
            </span>
            <span className="text-slate-500 font-mono">{(response.timeOnCardMs / 1000).toFixed(0)}s</span>
          </div>

          {/* Scenario text (editable) */}
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1">Scenario</label>
            <textarea
              value={scenario.description}
              onChange={(e) => updateScenarioField('description', e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-base"
            />
          </div>

          {/* Stock GONR default (editable) */}
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1">Stock GONR default</label>
            <textarea
              value={scenario.stockDefault}
              onChange={(e) => updateScenarioField('stockDefault', e.target.value)}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono leading-relaxed"
            />
          </div>

          {/* Decision buttons */}
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 block mb-2">How does YOUR plant handle this?</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['same', 'Same as us', 'bg-emerald-700 hover:bg-emerald-600'],
                ['different', 'We do it differently', 'bg-amber-700 hover:bg-amber-600'],
                ['refuse', 'We refuse this', 'bg-rose-700 hover:bg-rose-600'],
              ] as const).map(([value, label, color]) => (
                <button
                  key={value}
                  onClick={() => setDecision(value)}
                  className={`px-3 py-3 rounded-lg font-medium text-sm md:text-base transition ${
                    response.decision === value
                      ? `${color} text-white`
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 5-axis selectors (visible if decision is set) */}
          {response.decision && response.decision !== 'same' && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="text-xs uppercase tracking-wide text-slate-500">5-axis taxonomy</div>
              {(Object.keys(AXIS_OPTIONS) as (keyof StockAxes)[]).map((key) => (
                <div key={key} className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2 items-center">
                  <label className="text-sm text-slate-400">{AXIS_LABELS[key]}</label>
                  <select
                    value={response.axes[key]}
                    onChange={(e) => setAxis(key, e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm"
                  >
                    {AXIS_OPTIONS[key].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                        {scenario.stockAxes[key] === opt ? '  (stock)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Delta */}
          {delta.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-amber-400 mb-1">Delta vs stock</div>
              <ul className="text-sm space-y-1">
                {delta.map((d) => (
                  <li key={d} className="font-mono text-amber-100">{d}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Why note */}
          {response.decision && response.decision !== 'same' && (
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1">
                Why does your plant do it this way?
              </label>
              <textarea
                value={response.whyNote}
                onChange={(e) => updateResponse({ whyNote: e.target.value })}
                rows={3}
                placeholder="The reason you handle this scenario differently. Customer history? Equipment limit? Safety call? Cost trade-off?"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm"
              />
            </div>
          )}

          {/* Recognition signal */}
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 block mb-2">
              How did you respond to the stock default?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['quick', 'Recognized quickly'],
                ['scratch', 'Had to think from scratch'],
                ['disagree', 'Disagreed immediately'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => updateResponse({ recognition: value })}
                  className={`px-3 py-2 rounded-lg text-xs md:text-sm transition ${
                    response.recognition === value
                      ? 'bg-sky-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Safety conflict signal */}
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 block mb-2">
              Does your plant&rsquo;s answer conflict with safety guidance?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['none', 'No conflict'],
                ['possible', 'Possible conflict'],
                ['hard', 'Hard safety conflict'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => updateResponse({ safetyConflict: value })}
                  className={`px-3 py-2 rounded-lg text-xs md:text-sm transition ${
                    response.safetyConflict === value
                      ? value === 'hard'
                        ? 'bg-rose-700 text-white'
                        : value === 'possible'
                        ? 'bg-amber-700 text-white'
                        : 'bg-emerald-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Status selector */}
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 block mb-2">Mark this scenario</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['draft', 'needs_clarification', 'blocked_safety', 'approved'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateResponse({ status: s })}
                  className={`px-3 py-2 rounded-lg text-xs md:text-sm transition capitalize ${
                    response.status === s
                      ? {
                          draft: 'bg-slate-600 text-white',
                          needs_clarification: 'bg-amber-700 text-white',
                          blocked_safety: 'bg-rose-700 text-white',
                          approved: 'bg-emerald-700 text-white',
                        }[s]
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => nav(-1)}
              disabled={state.currentIndex === 0}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-500">
              {state.currentIndex + 1} / {state.scenarios.length}
            </span>
            <button
              onClick={() => nav(1)}
              disabled={state.currentIndex >= state.scenarios.length - 1}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </section>

        {/* Bottom toolbar */}
        <footer className="mt-6 flex flex-wrap items-center gap-2 justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportJSON(state)}
              className="px-3 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-sm font-medium"
            >
              Export JSON
            </button>
            <button
              onClick={() => exportCSV(state)}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
            >
              Export CSV
            </button>
            <button
              onClick={() => exportMarkdown(state)}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
            >
              Export Markdown
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddScenario(true)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
            >
              + Add custom scenario
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-2 rounded-lg bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 text-sm"
            >
              Reset session
            </button>
          </div>
        </footer>

        <p className="mt-6 text-xs text-slate-600 text-center">
          Local-only · localStorage · no backend · no production data · TASK-122
        </p>
      </div>

      {/* Reset confirm modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md">
            <h2 className="text-lg font-bold mb-2">Reset session?</h2>
            <p className="text-sm text-slate-400 mb-4">
              This clears all your captured rules, status, and timing. Cannot be undone. Export first if you want a copy.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={resetSession}
                className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-sm font-medium"
              >
                Reset everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add custom scenario modal */}
      {showAddScenario && <AddScenarioModal onCancel={() => setShowAddScenario(false)} onSave={addCustomScenario} />}
    </div>
  )
}

function AddScenarioModal({
  onCancel,
  onSave,
}: {
  onCancel: () => void
  onSave: (description: string, garment: string, stain: string, stockDefault: string) => void
}) {
  const [description, setDescription] = useState('')
  const [garment, setGarment] = useState('')
  const [stain, setStain] = useState('')
  const [stockDefault, setStockDefault] = useState('')

  const valid = description.trim().length > 0

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Add a custom scenario</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1">Scenario description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm"
              placeholder="e.g., Customer brings in a satin tablecloth with red wine + candle wax overlap"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1">Garment</label>
              <input
                value={garment}
                onChange={(e) => setGarment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm"
                placeholder="silk satin tablecloth"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1">Stain</label>
              <input
                value={stain}
                onChange={(e) => setStain(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm"
                placeholder="red wine + candle wax, mixed"
              />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1">Stock GONR default (optional)</label>
            <textarea
              value={stockDefault}
              onChange={(e) => setStockDefault(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm"
              placeholder="What you think the stock GONR answer would be. Leave blank if you want to fill in later."
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(description, garment, stain, stockDefault)}
            disabled={!valid}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Add scenario
          </button>
        </div>
      </div>
    </div>
  )
}
