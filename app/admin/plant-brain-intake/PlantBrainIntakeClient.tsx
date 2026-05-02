'use client'

// TASK-122.1 — Plant Brain Builder, 2026 UI pass
// Drop-in replacement for v0 PlantBrainIntakeClient.tsx.
// Same data shape, same localStorage key, same export interfaces — only the UI is rebuilt.
//
// Design language sourced from the GONR Plant Brain landing page Tyler shared (2026-05-02):
//   - Cream background (#f4efe6) with paper-grain texture overlay
//   - Fraunces serif for headlines (premium, editorial)
//   - Inter for body
//   - JetBrains Mono for eyebrow labels, axis names, status pills
//   - Rust accent (#c8442a) for primary actions
//   - Ochre (#d4a544) for secondary states
//   - Hard ink line dividers (#1a1a1a) for editorial feel
//
// UX principles per Atlas msg 11381 + vault doc:
//   1. One decision at a time — progressive disclosure of axes/why/signals
//   2. Conversational framing — "Here's how GONR would handle this. Is that how your plant does it?"
//   3. Tap-first, type-last — buttons before textareas
//   4. Big pillar Same/Different/Refuse buttons
//   5. "Your Plant Brain is forming" progress (not generic green bar)
//   6. Bottom action bar fixed on mobile, integrated on desktop
//   7. Mobile-first

import { useEffect, useState } from 'react'
import {
  SEED_SCENARIOS,
  AXIS_OPTIONS,
  AXIS_LABELS,
  type SeedScenario,
  type StockAxes,
} from './scenarios'

// ---------------------------------------------------------------------------
// Types — UNCHANGED from v0 to preserve drop-in compatibility
// ---------------------------------------------------------------------------
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

const LS_KEY = 'plant-brain-intake-v0' // unchanged so any in-flight Tyler data persists across the redesign

// ---------------------------------------------------------------------------
// Persistence + helpers — unchanged from v0
// ---------------------------------------------------------------------------
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

function freshSession(): SessionState {
  const scenarios = JSON.parse(JSON.stringify(SEED_SCENARIOS)) as SeedScenario[]
  const responses: Record<string, Response> = {}
  for (const s of scenarios) responses[s.id] = makeEmptyResponse(s.id, s.stockAxes)
  return {
    sessionId: newSessionId(),
    startedAt: new Date().toISOString(),
    scenarios,
    responses,
    currentIndex: 0,
  }
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

// ---------------------------------------------------------------------------
// Export functions — JSON + CSV unchanged from v0; Markdown polished into ops-plan format
// ---------------------------------------------------------------------------
function exportJSON(state: SessionState) {
  const enriched = {
    ...state,
    exportedAt: new Date().toISOString(),
    deltas: state.scenarios.map((s) => ({
      scenarioId: s.id,
      delta: deriveDelta(s, state.responses[s.id] || makeEmptyResponse(s.id, s.stockAxes)),
    })),
  }
  downloadFile(`${state.sessionId}.json`, JSON.stringify(enriched, null, 2), 'application/json')
}

function exportCSV(state: SessionState) {
  const csvCell = (v: string) => `"${(v || '').replace(/"/g, '""')}"`
  const rows: string[] = []
  rows.push(
    [
      'scenario_id', 'description', 'decision',
      'pre_treatment', 'solvent_routing', 'risk_level', 'time_charge', 'team_escalation',
      'delta', 'why_note', 'recognition', 'safety_conflict', 'status', 'time_on_card_ms',
    ].map(csvCell).join(','),
  )
  for (const s of state.scenarios) {
    const r = state.responses[s.id] || makeEmptyResponse(s.id, s.stockAxes)
    const delta = deriveDelta(s, r).join(' | ')
    rows.push(
      [
        s.id, s.description, r.decision || '',
        r.axes.preTreatment, r.axes.solventRouting, r.axes.riskLevel, r.axes.timeCharge, r.axes.teamEscalation,
        delta, r.whyNote, r.recognition || '', r.safetyConflict || '', r.status, String(r.timeOnCardMs),
      ].map(csvCell).join(','),
    )
  }
  downloadFile(`${state.sessionId}.csv`, rows.join('\n'), 'text/csv')
}

// Polished ops-plan Markdown export — reads like something an owner could print and post in the plant
function exportOpsPlan(state: SessionState) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const approved = state.scenarios.filter((s) => state.responses[s.id]?.status === 'approved')
  const lines: string[] = []

  lines.push(`# Your Plant Brain — Ops Plan`)
  lines.push(``)
  lines.push(`*Captured ${date} · Session ${state.sessionId}*`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  lines.push(`## What this is`)
  lines.push(``)
  lines.push(`This is your plant's protocol guidance, captured from how you actually run the spotting board. It reflects the decisions you've approved as your plant's standard. Print this and post it. Hand it to a new hire on day one. Use it as the reference your team works from.`)
  lines.push(``)
  lines.push(`**${approved.length} of ${state.scenarios.length} scenarios approved.** The remaining scenarios are still in draft or need clarification — keep building.`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  lines.push(`## Table of contents`)
  lines.push(``)
  for (const s of state.scenarios) {
    const r = state.responses[s.id] || makeEmptyResponse(s.id, s.stockAxes)
    const tag = r.status === 'approved' ? '✓' : r.status === 'blocked_safety' ? '⚠' : '·'
    lines.push(`- ${tag} [${s.id}](#${s.id}) — ${s.garment} · ${s.stain}`)
  }
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  lines.push(`## Scenarios`)
  lines.push(``)

  for (const s of state.scenarios) {
    const r = state.responses[s.id] || makeEmptyResponse(s.id, s.stockAxes)
    const delta = deriveDelta(s, r)
    lines.push(`### <a id="${s.id}"></a>${s.garment} · ${s.stain}`)
    lines.push(``)
    lines.push(`**Status:** ${r.status.replace('_', ' ')}`)
    if (r.decision) lines.push(`**Plant decision:** ${{ same: 'Same as GONR baseline', different: 'We do this differently', refuse: 'We refuse this job' }[r.decision]}`)
    lines.push(``)
    lines.push(`#### Scenario`)
    lines.push(``)
    lines.push(s.description)
    lines.push(``)
    if (r.decision === 'same' || !r.decision) {
      lines.push(`#### Protocol (industry baseline)`)
      lines.push(``)
      lines.push(s.stockDefault)
      lines.push(``)
    } else if (r.decision === 'refuse') {
      lines.push(`#### Protocol`)
      lines.push(``)
      lines.push(`**This plant does not accept this job.** Refer customer to specialist or recommend alternative.`)
      lines.push(``)
      if (r.whyNote) {
        lines.push(`**Reason:** ${r.whyNote}`)
        lines.push(``)
      }
    } else {
      lines.push(`#### Protocol (your plant's approach)`)
      lines.push(``)
      lines.push(`| Step | Choice |`)
      lines.push(`|---|---|`)
      lines.push(`| Pre-treatment | ${r.axes.preTreatment}${s.stockAxes.preTreatment !== r.axes.preTreatment ? ` _(differs from baseline: ${s.stockAxes.preTreatment})_` : ''} |`)
      lines.push(`| Solvent routing | ${r.axes.solventRouting}${s.stockAxes.solventRouting !== r.axes.solventRouting ? ` _(differs from baseline: ${s.stockAxes.solventRouting})_` : ''} |`)
      lines.push(`| Risk level | ${r.axes.riskLevel}${s.stockAxes.riskLevel !== r.axes.riskLevel ? ` _(differs from baseline: ${s.stockAxes.riskLevel})_` : ''} |`)
      lines.push(`| Time & charge | ${r.axes.timeCharge}${s.stockAxes.timeCharge !== r.axes.timeCharge ? ` _(differs from baseline: ${s.stockAxes.timeCharge})_` : ''} |`)
      lines.push(`| Team escalation | ${r.axes.teamEscalation}${s.stockAxes.teamEscalation !== r.axes.teamEscalation ? ` _(differs from baseline: ${s.stockAxes.teamEscalation})_` : ''} |`)
      lines.push(``)
      if (delta.length > 0) {
        lines.push(`**Where this differs from the GONR baseline:**`)
        for (const d of delta) lines.push(`- ${d}`)
        lines.push(``)
      }
      if (r.whyNote) {
        lines.push(`**Why this plant does it this way:** ${r.whyNote}`)
        lines.push(``)
      }
      lines.push(`#### GONR baseline (for reference)`)
      lines.push(``)
      lines.push(`> ${s.stockDefault.split('\n').join('\n> ')}`)
      lines.push(``)
    }
    if (r.safetyConflict === 'hard' || r.safetyConflict === 'possible') {
      lines.push(`> ⚠️ **Safety conflict noted:** ${r.safetyConflict === 'hard' ? 'hard conflict with safety guidance' : 'possible conflict with safety guidance'}. Owner review required before this protocol becomes staff-facing.`)
      lines.push(``)
    }
    lines.push(`---`)
    lines.push(``)
  }

  lines.push(`## About this plan`)
  lines.push(``)
  lines.push(`Built with **GONR Plant Brain** — your plant's knowledge, captured. This plan reflects approved scenarios as of ${date}. Continue adding scenarios as your team teaches the brain more about how your plant operates.`)
  lines.push(``)
  lines.push(`*Generated from session ${state.sessionId}.*`)

  downloadFile(`plant-brain-ops-plan-${state.sessionId}.md`, lines.join('\n'), 'text/markdown')
}

// ---------------------------------------------------------------------------
// Design tokens — sourced from landing page (Tyler 2026-05-02)
// ---------------------------------------------------------------------------
const TOKENS = {
  cream: '#f4efe6',
  creamDeep: '#ebe3d4',
  ink: '#1a1a1a',
  inkSoft: '#2a2a2a',
  rust: '#c8442a',
  rustDeep: '#a8341e',
  ochre: '#d4a544',
  muted: '#6b6357',
  line: '#1a1a1a',
  paperGrain:
    'radial-gradient(circle at 25% 35%, rgba(26,26,26,0.025) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(26,26,26,0.02) 1px, transparent 1px)',
  paperGrainSize: '3px 3px, 5px 5px',
  fontSerif: '"Fraunces", Georgia, serif',
  fontSans: '"Inter", system-ui, -apple-system, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, monospace',
}

// Inject Google Fonts once on mount
function useGoogleFonts() {
  useEffect(() => {
    if (document.getElementById('plant-brain-fonts')) return
    const link = document.createElement('link')
    link.id = 'plant-brain-fonts'
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,800;1,9..144,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap'
    document.head.appendChild(link)
  }, [])
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function PlantBrainIntakeClient() {
  useGoogleFonts()
  const [state, setState] = useState<SessionState>(() => loadSession())
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showAddScenario, setShowAddScenario] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const scenario = state.scenarios[state.currentIndex]

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
    return (
      <div style={{ background: TOKENS.cream }} className="min-h-screen flex items-center justify-center p-8">
        <p style={{ fontFamily: TOKENS.fontSerif }} className="text-2xl">No scenarios. Reset session.</p>
      </div>
    )
  }
  const response = state.responses[scenario.id] || makeEmptyResponse(scenario.id, scenario.stockAxes)
  const delta = deriveDelta(scenario, response)
  const approvedCount = state.scenarios.filter((s) => state.responses[s.id]?.status === 'approved').length

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
        scenarios: prev.scenarios.map((s, i) => (i === prev.currentIndex ? { ...s, [field]: value } : s)),
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
      updateResponse({ decision, axes: { ...response.axes, riskLevel: 'no go', solventRouting: 'refuse' } })
    } else {
      updateResponse({ decision })
    }
  }

  function nav(deltaIdx: number) {
    setState((prev) => {
      if (!prev) return prev
      const newIndex = Math.max(0, Math.min(prev.scenarios.length - 1, prev.currentIndex + deltaIdx))
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

  // Decision-derived view state
  const showAxes = response.decision === 'different'
  const showWhy = response.decision === 'different' || response.decision === 'refuse'
  const showSignals = response.decision !== null
  const showStatus = response.decision !== null

  const progressPct = (approvedCount / state.scenarios.length) * 100

  return (
    <div
      style={{
        background: TOKENS.cream,
        color: TOKENS.ink,
        fontFamily: TOKENS.fontSans,
        minHeight: '100vh',
      }}
    >
      {/* Paper grain overlay */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: TOKENS.paperGrain,
          backgroundSize: TOKENS.paperGrainSize,
          opacity: 0.7,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Top header — logo + progress */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          borderBottom: `1px solid ${TOKENS.line}`,
          padding: '20px 24px',
        }}
        className="bg-[var(--cream,#f4efe6)]"
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-baseline gap-3">
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                background: TOKENS.rust,
                borderRadius: '50%',
                transform: 'translateY(2px)',
              }}
            />
            <span style={{ fontFamily: TOKENS.fontSerif, fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
              Plant Brain
            </span>
            <span
              style={{
                fontFamily: TOKENS.fontMono,
                fontSize: 10,
                letterSpacing: '0.12em',
                color: TOKENS.muted,
                textTransform: 'uppercase',
              }}
            >
              Builder
            </span>
          </div>
          <div className="text-right">
            <div
              style={{
                fontFamily: TOKENS.fontMono,
                fontSize: 10,
                letterSpacing: '0.15em',
                color: TOKENS.muted,
                textTransform: 'uppercase',
              }}
            >
              Your Plant Brain is forming
            </div>
            <div style={{ fontFamily: TOKENS.fontSerif, fontSize: 18, lineHeight: 1.1 }}>
              {approvedCount}<span style={{ color: TOKENS.muted, fontWeight: 300 }}> / {state.scenarios.length} captured</span>
            </div>
          </div>
        </div>
        {/* Hairline progress */}
        <div className="max-w-3xl mx-auto mt-3" style={{ height: 2, background: TOKENS.creamDeep, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${progressPct}%`,
              background: TOKENS.rust,
              transition: 'width 240ms ease-out',
            }}
          />
        </div>
      </header>

      {/* Main scroll area */}
      <main style={{ position: 'relative', zIndex: 2 }} className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14 pb-32">
        {/* Eyebrow + scenario position */}
        <div
          style={{
            fontFamily: TOKENS.fontMono,
            fontSize: 10,
            letterSpacing: '0.18em',
            color: TOKENS.rust,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <span style={{ width: 36, height: 1, background: TOKENS.rust }} />
          Scenario {state.currentIndex + 1} of {state.scenarios.length} · {scenario.id}
        </div>

        {/* Scenario heading — Fraunces serif, large */}
        <h1
          style={{
            fontFamily: TOKENS.fontSerif,
            fontWeight: 400,
            fontSize: 'clamp(28px, 5vw, 44px)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          {scenario.garment}
          <span style={{ color: TOKENS.rust, fontStyle: 'italic', fontWeight: 300 }}> · </span>
          <span style={{ fontWeight: 300, fontStyle: 'italic' }}>{scenario.stain}</span>
        </h1>

        {/* Editable scenario description (subtle, click-to-edit feel) */}
        <textarea
          value={scenario.description}
          onChange={(e) => updateScenarioField('description', e.target.value)}
          rows={2}
          style={{
            fontFamily: TOKENS.fontSerif,
            fontSize: 18,
            fontWeight: 300,
            lineHeight: 1.5,
            color: TOKENS.inkSoft,
            background: 'transparent',
            border: 'none',
            width: '100%',
            resize: 'vertical',
            outline: 'none',
            padding: '8px 0',
            marginBottom: 32,
          }}
          aria-label="Scenario description (editable)"
        />

        {/* Card 1 — Stock GONR default */}
        <Section eyebrow="Industry baseline (GONR's default)">
          <textarea
            value={scenario.stockDefault}
            onChange={(e) => updateScenarioField('stockDefault', e.target.value)}
            rows={6}
            style={{
              fontFamily: TOKENS.fontSans,
              fontSize: 15,
              lineHeight: 1.6,
              color: TOKENS.ink,
              background: TOKENS.creamDeep,
              border: `1px solid ${TOKENS.line}`,
              width: '100%',
              padding: '16px 18px',
              resize: 'vertical',
              outline: 'none',
            }}
            aria-label="Stock GONR default protocol (editable)"
          />
        </Section>

        {/* Card 2 — Decision */}
        <Section eyebrow="How does YOUR plant handle this?">
          <p style={{ fontFamily: TOKENS.fontSerif, fontSize: 19, fontStyle: 'italic', fontWeight: 300, color: TOKENS.inkSoft, marginBottom: 20 }}>
            Here&rsquo;s how GONR would handle this. Is that how your plant does it?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {([
              ['same', 'Same as us', TOKENS.ink, TOKENS.cream],
              ['different', 'We do it differently', TOKENS.ochre, TOKENS.ink],
              ['refuse', 'We refuse this', TOKENS.rust, TOKENS.cream],
            ] as const).map(([value, label, bg, fg]) => {
              const active = response.decision === value
              return (
                <button
                  key={value}
                  onClick={() => setDecision(value)}
                  style={{
                    fontFamily: TOKENS.fontSans,
                    fontSize: 16,
                    fontWeight: 600,
                    padding: '20px 16px',
                    background: active ? bg : 'transparent',
                    color: active ? fg : TOKENS.ink,
                    border: `1.5px solid ${TOKENS.line}`,
                    cursor: 'pointer',
                    transition: 'all 120ms ease-out',
                    letterSpacing: '-0.01em',
                  }}
                  className="hover:bg-stone-200 active:scale-[0.98]"
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Section>

        {/* Card 3 — Axes (only if Different) */}
        {showAxes && (
          <Section eyebrow="Your plant&rsquo;s protocol — five decisions">
            <p style={{ fontFamily: TOKENS.fontSerif, fontSize: 17, fontStyle: 'italic', fontWeight: 300, color: TOKENS.muted, marginBottom: 20 }}>
              Tap the chip for each axis. Industry baseline is highlighted.
            </p>
            <div className="space-y-6">
              {(Object.keys(AXIS_OPTIONS) as (keyof StockAxes)[]).map((axisKey) => (
                <AxisRow
                  key={axisKey}
                  label={AXIS_LABELS[axisKey]}
                  options={AXIS_OPTIONS[axisKey] as readonly string[]}
                  value={response.axes[axisKey]}
                  stockValue={scenario.stockAxes[axisKey]}
                  onChange={(v) => setAxis(axisKey, v)}
                />
              ))}
            </div>
            {delta.length > 0 && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  background: TOKENS.creamDeep,
                  border: `1px dashed ${TOKENS.ochre}`,
                }}
              >
                <div
                  style={{
                    fontFamily: TOKENS.fontMono,
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    color: TOKENS.rust,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Differs from baseline
                </div>
                <ul style={{ fontSize: 14, lineHeight: 1.6 }}>
                  {delta.map((d) => (
                    <li key={d} style={{ fontFamily: TOKENS.fontMono, color: TOKENS.inkSoft }}>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* Card 4 — Why (Different or Refuse) */}
        {showWhy && (
          <Section eyebrow="Why does your plant do it this way?">
            <textarea
              value={response.whyNote}
              onChange={(e) => updateResponse({ whyNote: e.target.value })}
              rows={3}
              placeholder="Customer history? Equipment limit? Safety call? Cost trade-off? Tell the story in your own words."
              style={{
                fontFamily: TOKENS.fontSerif,
                fontSize: 17,
                fontWeight: 300,
                lineHeight: 1.5,
                color: TOKENS.ink,
                background: TOKENS.creamDeep,
                border: `1px solid ${TOKENS.line}`,
                width: '100%',
                padding: '16px 18px',
                resize: 'vertical',
                outline: 'none',
              }}
              aria-label="Why your plant does it this way"
            />
          </Section>
        )}

        {/* Card 5 — Signals (recognition + safety) */}
        {showSignals && (
          <Section eyebrow="A couple of quick signals">
            <div className="space-y-5">
              <SignalRow
                question="How did the GONR baseline land for you?"
                value={response.recognition}
                options={[
                  { value: 'quick', label: 'Recognized it quickly' },
                  { value: 'scratch', label: 'Had to think from scratch' },
                  { value: 'disagree', label: 'Disagreed immediately' },
                ]}
                onChange={(v) => updateResponse({ recognition: v as Recognition })}
                activeColor={TOKENS.ink}
              />
              <SignalRow
                question="Does your plant&rsquo;s answer conflict with safety guidance?"
                value={response.safetyConflict}
                options={[
                  { value: 'none', label: 'No conflict' },
                  { value: 'possible', label: 'Possible conflict' },
                  { value: 'hard', label: 'Hard safety conflict' },
                ]}
                onChange={(v) => updateResponse({ safetyConflict: v as SafetyConflict })}
                activeColor={TOKENS.rust}
              />
            </div>
          </Section>
        )}

        {/* Card 6 — Status */}
        {showStatus && (
          <Section eyebrow="Mark this scenario">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(
                [
                  { value: 'draft', label: 'Draft' },
                  { value: 'needs_clarification', label: 'Needs clarification' },
                  { value: 'blocked_safety', label: 'Blocked: safety' },
                  { value: 'approved', label: 'Approved for staff' },
                ] as const
              ).map(({ value, label }) => {
                const active = response.status === value
                const colorMap: Record<string, string> = {
                  draft: TOKENS.muted,
                  needs_clarification: TOKENS.ochre,
                  blocked_safety: TOKENS.rust,
                  approved: TOKENS.ink,
                }
                return (
                  <button
                    key={value}
                    onClick={() => updateResponse({ status: value as Status })}
                    style={{
                      fontFamily: TOKENS.fontMono,
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '14px 12px',
                      background: active ? colorMap[value] : 'transparent',
                      color: active ? TOKENS.cream : TOKENS.ink,
                      border: `1.5px solid ${TOKENS.line}`,
                      cursor: 'pointer',
                      transition: 'all 120ms ease-out',
                    }}
                    className="hover:bg-stone-200 active:scale-[0.98]"
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </Section>
        )}

        {/* Time + ID footer (small) */}
        <div
          style={{
            fontFamily: TOKENS.fontMono,
            fontSize: 10,
            letterSpacing: '0.15em',
            color: TOKENS.muted,
            textTransform: 'uppercase',
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 32,
            paddingTop: 16,
            borderTop: `1px solid ${TOKENS.creamDeep}`,
          }}
        >
          <span>{(response.timeOnCardMs / 1000).toFixed(0)}s on this card</span>
          <span>localStorage · no backend</span>
        </div>
      </main>

      {/* Bottom action bar — fixed on mobile, integrated on desktop */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: TOKENS.cream,
          borderTop: `1px solid ${TOKENS.line}`,
          padding: '12px 16px',
          zIndex: 20,
          boxShadow: '0 -2px 0 rgba(0,0,0,0.02)',
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <button
            onClick={() => nav(-1)}
            disabled={state.currentIndex === 0}
            style={{
              fontFamily: TOKENS.fontSans,
              fontSize: 14,
              fontWeight: 500,
              padding: '12px 16px',
              background: 'transparent',
              color: TOKENS.ink,
              border: `1px solid ${TOKENS.line}`,
              cursor: 'pointer',
              opacity: state.currentIndex === 0 ? 0.3 : 1,
              transition: 'opacity 120ms',
            }}
          >
            ← Prev
          </button>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            style={{
              fontFamily: TOKENS.fontMono,
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '12px 14px',
              background: 'transparent',
              color: TOKENS.ink,
              border: `1px solid ${TOKENS.line}`,
              cursor: 'pointer',
            }}
            aria-haspopup="menu"
          >
            Export
          </button>
          <div className="flex-1" />
          <button
            onClick={() => nav(1)}
            disabled={state.currentIndex >= state.scenarios.length - 1}
            style={{
              fontFamily: TOKENS.fontSans,
              fontSize: 15,
              fontWeight: 600,
              padding: '12px 24px',
              background: TOKENS.ink,
              color: TOKENS.cream,
              border: `1px solid ${TOKENS.ink}`,
              cursor: 'pointer',
              opacity: state.currentIndex >= state.scenarios.length - 1 ? 0.3 : 1,
              transition: 'all 120ms',
            }}
            className="hover:bg-[var(--rust)]"
          >
            Save & Next →
          </button>
        </div>
        {/* Export menu */}
        {showExportMenu && (
          <div
            className="max-w-3xl mx-auto mt-2 grid grid-cols-2 md:grid-cols-5 gap-2"
            style={{ paddingTop: 8, borderTop: `1px solid ${TOKENS.creamDeep}` }}
          >
            <ExportBtn label="Ops Plan (Markdown)" onClick={() => { exportOpsPlan(state); setShowExportMenu(false) }} primary />
            <ExportBtn label="JSON (raw)" onClick={() => { exportJSON(state); setShowExportMenu(false) }} />
            <ExportBtn label="CSV" onClick={() => { exportCSV(state); setShowExportMenu(false) }} />
            <ExportBtn label="+ Add custom scenario" onClick={() => { setShowAddScenario(true); setShowExportMenu(false) }} />
            <ExportBtn label="Reset session" onClick={() => { setShowResetConfirm(true); setShowExportMenu(false) }} danger />
          </div>
        )}
      </nav>

      {/* Reset modal */}
      {showResetConfirm && (
        <Modal onCancel={() => setShowResetConfirm(false)}>
          <h2 style={{ fontFamily: TOKENS.fontSerif, fontSize: 28, fontWeight: 400, marginBottom: 12, letterSpacing: '-0.02em' }}>
            Reset this session?
          </h2>
          <p style={{ fontFamily: TOKENS.fontSerif, fontWeight: 300, fontSize: 17, color: TOKENS.inkSoft, marginBottom: 24, lineHeight: 1.5 }}>
            This clears all your captured rules, status, and timing. It cannot be undone. Export your Ops Plan first if you want a copy.
          </p>
          <div className="flex gap-2 justify-end">
            <ExportBtn label="Cancel" onClick={() => setShowResetConfirm(false)} />
            <ExportBtn label="Reset everything" onClick={resetSession} danger />
          </div>
        </Modal>
      )}

      {/* Add custom scenario modal */}
      {showAddScenario && <AddScenarioModal onCancel={() => setShowAddScenario(false)} onSave={addCustomScenario} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: TOKENS.cream,
        border: `1px solid ${TOKENS.line}`,
        padding: '22px 22px 26px',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontFamily: TOKENS.fontMono,
          fontSize: 10,
          letterSpacing: '0.18em',
          color: TOKENS.muted,
          textTransform: 'uppercase',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ width: 18, height: 1, background: TOKENS.muted }} />
        {eyebrow}
      </div>
      {children}
    </section>
  )
}

function AxisRow({
  label,
  options,
  value,
  stockValue,
  onChange,
}: {
  label: string
  options: readonly string[]
  value: string
  stockValue: string
  onChange: (v: string) => void
}) {
  const isStock = value === stockValue
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div
          style={{
            fontFamily: TOKENS.fontMono,
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: TOKENS.ink,
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        {!isStock && (
          <div
            style={{
              fontFamily: TOKENS.fontMono,
              fontSize: 10,
              letterSpacing: '0.1em',
              color: TOKENS.rust,
              textTransform: 'uppercase',
            }}
          >
            ✗ Differs from baseline
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt
          const isStockChip = opt === stockValue
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              style={{
                fontFamily: TOKENS.fontSans,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                padding: '8px 14px',
                background: active ? TOKENS.ink : isStockChip ? TOKENS.creamDeep : 'transparent',
                color: active ? TOKENS.cream : TOKENS.ink,
                border: `1px solid ${TOKENS.line}`,
                borderRadius: 999,
                cursor: 'pointer',
                transition: 'all 120ms ease-out',
              }}
              title={isStockChip && !active ? 'GONR baseline' : undefined}
            >
              {opt}
              {isStockChip && !active && (
                <span style={{ fontFamily: TOKENS.fontMono, fontSize: 9, marginLeft: 6, color: TOKENS.muted, letterSpacing: '0.1em' }}>
                  · stock
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SignalRow({
  question,
  value,
  options,
  onChange,
  activeColor,
}: {
  question: string
  value: string | null
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  activeColor: string
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: TOKENS.fontSerif,
          fontSize: 16,
          fontWeight: 400,
          fontStyle: 'italic',
          color: TOKENS.inkSoft,
          marginBottom: 10,
        }}
      >
        {question}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{
                fontFamily: TOKENS.fontSans,
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                padding: '12px 14px',
                background: active ? activeColor : 'transparent',
                color: active ? TOKENS.cream : TOKENS.ink,
                border: `1px solid ${TOKENS.line}`,
                cursor: 'pointer',
                transition: 'all 120ms ease-out',
                textAlign: 'left',
              }}
              className="hover:bg-stone-200"
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ExportBtn({
  label,
  onClick,
  primary,
  danger,
}: {
  label: string
  onClick: () => void
  primary?: boolean
  danger?: boolean
}) {
  const bg = primary ? TOKENS.ink : danger ? '#fff1ee' : 'transparent'
  const fg = primary ? TOKENS.cream : danger ? TOKENS.rustDeep : TOKENS.ink
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: TOKENS.fontMono,
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '10px 14px',
        background: bg,
        color: fg,
        border: `1px solid ${danger ? TOKENS.rust : TOKENS.line}`,
        cursor: 'pointer',
        textAlign: 'center',
      }}
      className="hover:opacity-80"
    >
      {label}
    </button>
  )
}

function Modal({ onCancel, children }: { onCancel: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,26,26,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 50,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: TOKENS.cream,
          border: `1px solid ${TOKENS.line}`,
          padding: '28px 28px 24px',
          maxWidth: 480,
          width: '100%',
        }}
      >
        {children}
      </div>
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
  return (
    <Modal onCancel={onCancel}>
      <h2 style={{ fontFamily: TOKENS.fontSerif, fontSize: 28, fontWeight: 400, marginBottom: 16, letterSpacing: '-0.02em' }}>
        Add a custom scenario
      </h2>
      <div className="space-y-3">
        <FieldLabel>Scenario description *</FieldLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="e.g., Customer brings in a satin tablecloth with red wine + candle wax overlap"
          style={inputStyle}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Garment</FieldLabel>
            <input value={garment} onChange={(e) => setGarment(e.target.value)} placeholder="silk satin tablecloth" style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Stain</FieldLabel>
            <input value={stain} onChange={(e) => setStain(e.target.value)} placeholder="red wine + candle wax, mixed" style={inputStyle} />
          </div>
        </div>
        <FieldLabel>Industry baseline (optional)</FieldLabel>
        <textarea
          value={stockDefault}
          onChange={(e) => setStockDefault(e.target.value)}
          rows={4}
          placeholder="What you think the GONR baseline answer would be. Leave blank to fill in later."
          style={inputStyle}
        />
      </div>
      <div className="flex gap-2 justify-end mt-5">
        <ExportBtn label="Cancel" onClick={onCancel} />
        <ExportBtn label="Add scenario" onClick={() => onSave(description, garment, stain, stockDefault)} primary />
      </div>
    </Modal>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontFamily: TOKENS.fontMono,
        fontSize: 10,
        letterSpacing: '0.15em',
        color: TOKENS.muted,
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  fontFamily: TOKENS.fontSans,
  fontSize: 14,
  background: TOKENS.creamDeep,
  border: `1px solid ${TOKENS.line}`,
  width: '100%',
  padding: '12px 14px',
  outline: 'none',
}
