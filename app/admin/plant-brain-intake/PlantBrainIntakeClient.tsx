'use client'

// ============================================================================
// TASK-122.2 — Plant Brain Builder: GONR Intelligence Cockpit
// ============================================================================
// Drop-in replacement for v0.1 PlantBrainIntakeClient.tsx.
//
// Atlas spec at ~/shared-workspace/TASK-122.2-plant-brain-apple-solve-card-builder.md
//
// Core thesis: not an intake form. A premium chat cockpit where GONR Intelligence
// asks sharp plant-specific questions, and the operator's Plant Brain profile +
// solve cards form live in the right panel as answers accumulate.
//
// Architecture:
//   - Chat panel (left/center, dominant): scrollable conversation stream
//   - Brain panel (right/desktop, bottom-sheet/mobile): profile coverage + live card
//   - Composer (bottom): voice input + text + predictive suggestions
//
// Three phases (auto-shift):
//   - discovery: AI asks high-coverage-gain questions
//   - forming: AI injects verify-style messages alongside discovery; live card visible
//   - verifying: AI primarily proposes, operator confirms/edits/rejects
//
// Confirmation gate (Atlas-locked, non-negotiable):
//   - Nothing becomes plant protocol without explicit operator confirm
//   - Batched per-scenario, not per-message
//   - Voice + predictive text are accelerators; confirm is the safety rail
//
// Design language: dark premium GONR continuity + Apple-level polish
//   - Background: deep neutral (not pure black)
//   - Surfaces: layered elevation via subtle shadows + hairline borders
//   - Typography: SF Pro Display / Inter Display + JetBrains Mono accents
//   - Accent: GONR rust used Apple-restrained (only on primary actions + active states)
//   - Motion: 250ms ease-out everywhere; typing indicator; smooth message arrival
//
// Constraints (preserved from v0/v0.1):
//   - No backend, no DDL, no env, no new deps
//   - localStorage only (key preserved for in-flight data continuity)
//   - JSON / Markdown ops plan exports
//   - /plant-brain-builder route (no auth)
//
// ============================================================================

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { SEED_SCENARIOS, type SeedScenario } from './scenarios'
import { QUESTIONS, MODULES, PHASE_THRESHOLDS, type ModuleId, type Question } from './questions'

// ============================================================================
// Types
// ============================================================================

type Phase = 'discovery' | 'forming' | 'verifying'

type AssistantMessageBase = { id: string; ts: string; kind: 'assistant' }
type ChipsMessage = AssistantMessageBase & { type: 'chips'; questionId: string; ask: string; whyAsking?: string; options: string[] }
type YesNoMessage = AssistantMessageBase & { type: 'yesno'; questionId: string; ask: string; whyAsking?: string }
type RankedMessage = AssistantMessageBase & { type: 'ranked'; questionId: string; ask: string; whyAsking?: string; options: string[] }
type MultiSelectMessage = AssistantMessageBase & { type: 'multiselect'; questionId: string; ask: string; whyAsking?: string; options: string[] }
type TextMessage = AssistantMessageBase & { type: 'text'; questionId: string; ask: string; whyAsking?: string; suggestedCompletions?: string[] }
type ScenarioMessage = AssistantMessageBase & { type: 'scenario'; questionId: string; ask: string; whyAsking?: string; suggestedCompletions?: string[] }
type ApproveMessage = AssistantMessageBase & {
  type: 'approve'
  cardSubject: string
  ask: string
  cardPreview: SolveCard
}
type InfoMessage = AssistantMessageBase & { type: 'info'; body: string; tone?: 'default' | 'milestone' }

type AssistantMessage =
  | ChipsMessage
  | YesNoMessage
  | RankedMessage
  | MultiSelectMessage
  | TextMessage
  | ScenarioMessage
  | ApproveMessage
  | InfoMessage

type UserMessage = {
  id: string
  ts: string
  kind: 'user'
  questionId?: string
  cardSubject?: string
  body: string // displayed text
  rawAnswer: unknown // structured answer for inference
}

type Message = AssistantMessage | UserMessage

type ProfileFieldValue = string | string[] | boolean | number | null

type ProfileModule = {
  id: ModuleId
  coverage: number // 0-100
  data: Record<string, ProfileFieldValue>
}

type SolveCardSection = {
  key: 'situation' | 'plantDefault' | 'steps' | 'safety' | 'stopRefuse' | 'staffNote' | 'customerNote' | 'confidence'
  label: string
  filled: boolean
  content: string
}

type SolveCardStatus = 'forming' | 'awaiting_confirm' | 'confirmed' | 'edited' | 'declined'

type SolveCard = {
  scenarioId: string
  scenarioLabel: string
  sections: SolveCardSection[]
  status: SolveCardStatus
  confirmedAt?: string
}

type SessionState = {
  sessionId: string
  startedAt: string
  conversation: Message[]
  profile: Record<ModuleId, ProfileModule>
  cards: SolveCard[]
  scenariosFromSeed: SeedScenario[]
  answeredQuestionIds: string[]
  phase: Phase
  currentScenarioId: string // which scenario is the live card forming for
  pendingApproveCardScenarioId: string | null // when an approve message is in flight
}

// ============================================================================
// Design tokens — dark premium GONR + Apple polish
// ============================================================================
const T = {
  // surfaces
  bg: '#0b0c0e',
  bgPanel: '#14161a',
  bgPanelHi: '#1c1f24',
  bgInput: '#0f1115',
  // text
  ink: '#e8eaed',
  inkDim: '#a8acb3',
  inkMuted: '#7a7e85',
  // accents
  rust: '#c8442a',
  rustHi: '#d85432',
  rustDim: '#8a3320',
  amber: '#d4a544',
  green: '#5fb286',
  // borders / lines
  hair: '#262a31',
  hairHi: '#363b44',
  // fonts
  serif: '"SF Pro Display", "Inter Display", "Inter", system-ui, sans-serif',
  sans: '"Inter", "SF Pro Text", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
  // motion
  ease: 'cubic-bezier(.2,.8,.2,1)',
  trans: '240ms cubic-bezier(.2,.8,.2,1)',
}

// Inject Inter + JetBrains Mono + global keyframes once. SF Pro is system on Apple, falls back to Inter elsewhere.
function useGoogleFonts() {
  useEffect(() => {
    if (!document.getElementById('plant-brain-fonts-v2')) {
      const link = document.createElement('link')
      link.id = 'plant-brain-fonts-v2'
      link.rel = 'stylesheet'
      link.href =
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'
      document.head.appendChild(link)
    }
    if (!document.getElementById('plant-brain-keyframes-v2')) {
      const style = document.createElement('style')
      style.id = 'plant-brain-keyframes-v2'
      style.textContent = `
        @keyframes pb-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pb-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
      `
      document.head.appendChild(style)
    }
  }, [])
}

const LS_KEY = 'plant-brain-intake-v0' // unchanged so v0/v0.1 in-flight data carries

// ============================================================================
// Persistence + helpers
// ============================================================================
function newSessionId() {
  return `pb-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`
}

function newMessageId() {
  return `m-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`
}

function emptyProfile(): Record<ModuleId, ProfileModule> {
  const result = {} as Record<ModuleId, ProfileModule>
  for (const m of MODULES) {
    result[m.id] = { id: m.id, coverage: 0, data: {} }
  }
  return result
}

function freshSession(): SessionState {
  const scenarios = JSON.parse(JSON.stringify(SEED_SCENARIOS)) as SeedScenario[]
  const session: SessionState = {
    sessionId: newSessionId(),
    startedAt: new Date().toISOString(),
    conversation: [],
    profile: emptyProfile(),
    cards: [],
    scenariosFromSeed: scenarios,
    answeredQuestionIds: [],
    phase: 'discovery',
    currentScenarioId: scenarios[0]?.id || 'red-wine-silk-3day',
    pendingApproveCardScenarioId: null,
  }
  // Welcome message + first question
  const welcome: InfoMessage = {
    id: newMessageId(),
    ts: new Date().toISOString(),
    kind: 'assistant',
    type: 'info',
    body:
      "Welcome. I'm SpottingBoard — I'll help you build your plant's private Plant Brain by asking sharp, specific questions about how your shop actually runs. Your answers stay in your browser. Nothing leaves your plant unless you decide to share it. Let's start with the facts that shape every safe recommendation.",
    tone: 'milestone',
  }
  session.conversation.push(welcome)
  const firstQuestion = pickNextQuestion(session)
  if (firstQuestion) {
    session.conversation.push(buildAssistantMessageFromQuestion(firstQuestion))
  }
  return session
}

function loadSession(): SessionState {
  if (typeof window === 'undefined') return freshSession()
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return freshSession()
    const parsed = JSON.parse(raw)
    // Detect v0/v0.1 shape (had 'scenarios' + 'responses' + 'currentIndex'); migrate to v0.2 fresh
    if (!parsed.conversation || !parsed.profile || !Array.isArray(parsed.cards)) {
      return freshSession()
    }
    return parsed as SessionState
  } catch {
    return freshSession()
  }
}

function saveSession(s: SessionState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LS_KEY, JSON.stringify(s))
}

// ============================================================================
// Question selection + profile inference
// ============================================================================
function pickNextQuestion(s: SessionState): Question | null {
  const answered = new Set(s.answeredQuestionIds)

  // The first run should feel like an expert plant interview, not a generic
  // form. Lock the opening sequence to the highest-signal context first:
  // process reality → hard safety boundaries → authority chain → useful
  // scenario → actual tools → customer-facing policy.
  const openingSequence = [
    'chem-primary-solvent',
    'chem-bleach-policy',
    'escalation-spotter-tier',
    'spotting-blood-on-cotton',
    'chem-spotting-products',
    'comm-disclosure-policy',
  ]
  if (s.phase === 'discovery') {
    const pinnedNext = openingSequence
      .map((id) => QUESTIONS.find((q) => q.id === id))
      .find((q): q is Question => Boolean(q && !answered.has(q.id)))
    if (pinnedNext) return pinnedNext
  }

  // Score = weight * (low coverage of its module + 1)
  let best: Question | null = null
  let bestScore = -Infinity
  for (const q of QUESTIONS) {
    if (answered.has(q.id)) continue
    const moduleCoverage = s.profile[q.module]?.coverage ?? 0
    const coverageGap = (100 - moduleCoverage) / 100 // 1.0 if empty, 0.0 if full
    // Prefer low-friction types in early discovery (chips, yesno > text, scenario)
    const frictionPenalty =
      s.phase === 'discovery'
        ? { chips: 0, yesno: 0, multiselect: 5, ranked: 5, scenario: 10, text: 12 }[q.type]
        : 0
    const score = q.weight * (1 + coverageGap) - frictionPenalty
    if (score > bestScore) {
      bestScore = score
      best = q
    }
  }
  return best
}

function buildAssistantMessageFromQuestion(q: Question): AssistantMessage {
  const base = { id: newMessageId(), ts: new Date().toISOString(), kind: 'assistant' as const, questionId: q.id, ask: q.ask, whyAsking: q.whyAsking }
  switch (q.type) {
    case 'chips':
      return { ...base, type: 'chips', options: q.options || [] }
    case 'yesno':
      return { ...base, type: 'yesno' }
    case 'ranked':
      return { ...base, type: 'ranked', options: q.options || [] }
    case 'multiselect':
      return { ...base, type: 'multiselect', options: q.options || [] }
    case 'text':
      return { ...base, type: 'text', suggestedCompletions: q.suggestedCompletions }
    case 'scenario':
      return { ...base, type: 'scenario', suggestedCompletions: q.suggestedCompletions }
  }
}

// Apply an answer to profile + return updated module coverage
function applyAnswer(s: SessionState, q: Question, answer: ProfileFieldValue): SessionState {
  // Set the field on the appropriate module
  const profile = { ...s.profile }
  const m = profile[q.module]
  const data = { ...m.data, [q.fieldKey.split('.').slice(1).join('.') || q.id]: answer }
  // Compute coverage: # of answered questions in this module / total questions in this module, capped at 100
  const moduleQuestions = QUESTIONS.filter((qq) => qq.module === q.module)
  const newAnswered = [...s.answeredQuestionIds, q.id]
  const answeredInModule = moduleQuestions.filter((qq) => newAnswered.includes(qq.id)).length
  const coverage = Math.min(100, Math.round((answeredInModule / moduleQuestions.length) * 100))
  profile[q.module] = { ...m, data, coverage }

  // Phase transition check
  const passed60 = MODULES.filter((mm) => profile[mm.id].coverage >= PHASE_THRESHOLDS.formingMinCoverage).length
  const passed75 = MODULES.filter((mm) => profile[mm.id].coverage >= PHASE_THRESHOLDS.verifyingMinCoverage).length
  let phase: Phase = s.phase
  if (passed75 >= PHASE_THRESHOLDS.verifyingMinModules) phase = 'verifying'
  else if (passed60 >= PHASE_THRESHOLDS.formingMinModules) phase = 'forming'

  return { ...s, profile, answeredQuestionIds: newAnswered, phase }
}

// ============================================================================
// Solve card formation — derives a card from accumulated profile + scenario
// ============================================================================
function buildLiveSolveCard(s: SessionState, scenarioId: string): SolveCard {
  const scenario = s.scenariosFromSeed.find((x) => x.id === scenarioId) || s.scenariosFromSeed[0]
  const p = s.profile

  const sections: SolveCardSection[] = [
    {
      key: 'situation',
      label: 'Situation',
      filled: true,
      content: scenario.description,
    },
    {
      key: 'plantDefault',
      label: 'Plant default',
      filled: hasAnyAnswer(p['spotting']),
      content: deriveCardSection_plantDefault(p, scenario),
    },
    {
      key: 'steps',
      label: 'Step-by-step procedure',
      filled: hasAnyAnswer(p['spotting']) && hasAnyAnswer(p['chemicals']),
      content: deriveCardSection_steps(p),
    },
    {
      key: 'safety',
      label: 'Safety limits',
      filled: hasAnyAnswer(p['chemicals']),
      content: deriveCardSection_safety(p),
    },
    {
      key: 'stopRefuse',
      label: 'When to stop / refuse / escalate',
      filled: hasAnyAnswer(p['escalation']),
      content: deriveCardSection_stopRefuse(p),
    },
    {
      key: 'staffNote',
      label: 'Staff note',
      filled: hasAnyAnswer(p['customer-comm']),
      content: deriveCardSection_staffNote(p),
    },
    {
      key: 'customerNote',
      label: 'Customer-facing note',
      filled: hasAnyAnswer(p['customer-comm']),
      content: deriveCardSection_customerNote(p),
    },
    {
      key: 'confidence',
      label: 'Confidence',
      filled: true,
      content: deriveCardSection_confidence(s),
    },
  ]

  // Determine if card is structurally complete enough to ask for confirmation
  const filledCount = sections.filter((sec) => sec.filled).length
  const status: SolveCardStatus = filledCount >= 6 ? 'awaiting_confirm' : 'forming'

  // Preserve confirmed status if already confirmed
  const existing = s.cards.find((c) => c.scenarioId === scenarioId)
  const finalStatus: SolveCardStatus = existing?.status === 'confirmed' || existing?.status === 'declined' ? existing.status : status
  const confirmedAt = existing?.confirmedAt

  return {
    scenarioId,
    scenarioLabel: `${scenario.garment} · ${scenario.stain}`,
    sections,
    status: finalStatus,
    confirmedAt,
  }
}

function hasAnyAnswer(m: ProfileModule): boolean {
  return Object.keys(m.data).length > 0
}

function deriveCardSection_plantDefault(p: Record<ModuleId, ProfileModule>, scenario: SeedScenario): string {
  const pretest = p['spotting'].data['pretest_default']
  const fragment = pretest ? `Pre-test policy: ${pretest}.` : 'Pre-test policy: not yet captured.'
  return `${fragment}\n\nIndustry baseline for this scenario:\n${scenario.stockDefault.split('. ').slice(0, 2).join('. ')}.`
}

function deriveCardSection_steps(p: Record<ModuleId, ProfileModule>): string {
  const steps: string[] = []
  const pretest = p['spotting'].data['pretest_default']
  if (pretest && String(pretest).toLowerCase().includes('always')) steps.push('1. Pre-test on a hidden seam first.')
  const arsenal = p['chemicals'].data['spotting_arsenal']
  if (Array.isArray(arsenal) && arsenal.length > 0) steps.push(`2. Available agents at this plant: ${(arsenal as string[]).join(', ')}.`)
  const solvent = p['chemicals'].data['primary_solvent']
  if (solvent) steps.push(`3. Primary solvent on this fiber: ${solvent}.`)
  if (steps.length === 0) return `Steps will fill as you answer more about your plant's process.`
  return steps.join('\n')
}

function deriveCardSection_safety(p: Record<ModuleId, ProfileModule>): string {
  const never = p['chemicals'].data['never_use']
  if (Array.isArray(never) && never.length > 0) {
    return `Your plant NEVER uses: ${(never as string[]).join(', ')}.`
  }
  return 'Safety boundaries will fill as you tell me what your plant never uses.'
}

function deriveCardSection_stopRefuse(p: Record<ModuleId, ProfileModule>): string {
  const refuseAuth = p['escalation'].data['refuse_authority']
  const seniorOnly = p['escalation'].data['senior_only_categories']
  const lines: string[] = []
  if (refuseAuth) lines.push(`Authority to refuse: ${refuseAuth}.`)
  if (Array.isArray(seniorOnly) && seniorOnly.length > 0) lines.push(`Senior-only categories: ${(seniorOnly as string[]).join(', ')}.`)
  if (lines.length === 0) return 'Escalation rules will fill as you answer about your authority chain.'
  return lines.join('\n')
}

function deriveCardSection_staffNote(p: Record<ModuleId, ProfileModule>): string {
  const langs = p['customer-comm'].data['languages']
  if (Array.isArray(langs) && langs.length > 0) {
    return `Staff languages: ${(langs as string[]).join(', ')}. This protocol will be available in each.`
  }
  return 'Staff guidance will translate once you tell me what languages your team speaks.'
}

function deriveCardSection_customerNote(p: Record<ModuleId, ProfileModule>): string {
  const disclosure = p['customer-comm'].data['uncertain_outcome']
  const rushScript = p['customer-comm'].data['rush_pushback_script']
  const lines: string[] = []
  if (disclosure) lines.push(`Disclosure stance: ${disclosure}.`)
  if (rushScript) lines.push(`Rush script: "${rushScript}"`)
  if (lines.length === 0) return 'Customer-facing language will form once you tell me how your team talks to customers.'
  return lines.join('\n')
}

function deriveCardSection_confidence(s: SessionState): string {
  const totalCoverage = MODULES.reduce((sum, m) => sum + s.profile[m.id].coverage, 0) / MODULES.length
  const pct = Math.round(totalCoverage)
  if (pct < 30) return `Confidence: building (${pct}% of plant brain captured).`
  if (pct < 60) return `Confidence: forming (${pct}% captured). Card is ready to verify on key sections.`
  if (pct < 80) return `Confidence: strong (${pct}% captured). Most sections backed by your plant's actual rules.`
  return `Confidence: high (${pct}% captured). Plant brain coverage is mature.`
}

// ============================================================================
// Voice input — Web Speech API (browser-native, no backend)
// ============================================================================
type SpeechRecognitionAlternative = { transcript: string }
type SpeechRecognitionResultLike = {
  isFinal: boolean
  0: SpeechRecognitionAlternative
  length: number
}
type SpeechRecognitionResultListLike = {
  length: number
  [index: number]: SpeechRecognitionResultLike
}
type SpeechRecognitionEventLike = {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}
type SpeechRec = {
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  continuous: boolean
  interimResults: boolean
  lang: string
}
type SpeechRecognitionCtor = new () => SpeechRec

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor
  webkitSpeechRecognition?: SpeechRecognitionCtor
}

function getSpeechRecognition(): SpeechRec | null {
  if (typeof window === 'undefined') return null
  const w = window as SpeechWindow
  const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!SR) return null
  const rec = new SR()
  rec.continuous = false
  rec.interimResults = true
  rec.lang = 'en-US'
  return rec
}

// ============================================================================
// Export functions
// ============================================================================
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

function exportJSON(s: SessionState) {
  const enriched = { ...s, exportedAt: new Date().toISOString() }
  downloadFile(`${s.sessionId}.json`, JSON.stringify(enriched, null, 2), 'application/json')
}

function exportOpsPlan(s: SessionState) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const confirmed = s.cards.filter((c) => c.status === 'confirmed')
  const lines: string[] = []
  lines.push(`# Your Plant Brain — Ops Plan`)
  lines.push(``)
  lines.push(`*Captured ${date} · Session ${s.sessionId}*`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  lines.push(`## What this is`)
  lines.push(``)
  lines.push(`This is your plant's protocol guidance, captured from how you actually run the operation. Every protocol below was explicitly confirmed by you. Print this and post it. Hand it to a new hire on day one. Use it as the reference your team works from.`)
  lines.push(``)
  lines.push(`**${confirmed.length} confirmed protocols.** ${s.cards.length - confirmed.length} more in progress.`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  lines.push(`## Plant profile`)
  lines.push(``)
  for (const m of MODULES) {
    lines.push(`### ${m.label} (${s.profile[m.id].coverage}% captured)`)
    lines.push(``)
    const data = s.profile[m.id].data
    if (Object.keys(data).length === 0) {
      lines.push(`*No answers captured yet.*`)
    } else {
      for (const [k, v] of Object.entries(data)) {
        const value = Array.isArray(v) ? v.join(', ') : String(v)
        lines.push(`- **${k.replace(/_/g, ' ')}:** ${value}`)
      }
    }
    lines.push(``)
  }
  lines.push(`---`)
  lines.push(``)
  lines.push(`## Confirmed protocols`)
  lines.push(``)
  if (confirmed.length === 0) {
    lines.push(`*No protocols confirmed yet. Continue the conversation to lock in your plant's first card.*`)
  } else {
    for (const c of confirmed) {
      lines.push(`### ${c.scenarioLabel}`)
      lines.push(``)
      lines.push(`*Confirmed ${c.confirmedAt ? new Date(c.confirmedAt).toLocaleDateString('en-US') : ''}*`)
      lines.push(``)
      for (const sec of c.sections) {
        if (!sec.filled) continue
        lines.push(`**${sec.label}**`)
        lines.push(``)
        lines.push(sec.content)
        lines.push(``)
      }
      lines.push(`---`)
      lines.push(``)
    }
  }
  lines.push(`## About this plan`)
  lines.push(``)
  lines.push(`Built with **GONR Plant Brain** — your plant's knowledge, captured. Continue adding scenarios and refining protocols as your team teaches the brain more about how your plant operates.`)
  downloadFile(`plant-brain-ops-plan-${s.sessionId}.md`, lines.join('\n'), 'text/markdown')
}

// ============================================================================
// Root component
// ============================================================================
export default function PlantBrainIntakeClient() {
  useGoogleFonts()
  const [state, setState] = useState<SessionState>(() => loadSession())
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showBrainPanel, setShowBrainPanel] = useState(false) // mobile
  const [composing, setComposing] = useState<{ messageId: string; text: string; suggestions: string[] } | null>(null)
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'transcribing'>('idle')
  const streamRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    saveSession(state)
  }, [state])

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight
    }
  }, [state?.conversation.length])

  // Live solve card derives from current scenario + profile
  const liveCard = useMemo(() => buildLiveSolveCard(state, state.currentScenarioId), [state])
  const totalCoverage = useMemo(() => Math.round(MODULES.reduce((sum, m) => sum + state.profile[m.id].coverage, 0) / MODULES.length), [state.profile])

  // ==========================================================================
  // Answer handling — applies inference + advances conversation
  // ==========================================================================
  function submitAnswer(question: Question, message: AssistantMessage, displayBody: string, rawAnswer: ProfileFieldValue) {
    setState((prev) => {
      const userMsg: UserMessage = {
        id: newMessageId(),
        ts: new Date().toISOString(),
        kind: 'user',
        questionId: question.id,
        body: displayBody,
        rawAnswer,
      }
      let next: SessionState = {
        ...prev,
        conversation: [...prev.conversation, userMsg],
      }
      next = applyAnswer(next, question, rawAnswer)

      // Decide what comes next: phase transition info? approve message? next question?
      const newCard = buildLiveSolveCard(next, next.currentScenarioId)
      const shouldAskApprove = newCard.status === 'awaiting_confirm' && !next.cards.find((c) => c.scenarioId === next.currentScenarioId && c.status === 'confirmed') && !next.pendingApproveCardScenarioId
      // Track the card in state
      const cardIndex = next.cards.findIndex((c) => c.scenarioId === next.currentScenarioId)
      if (cardIndex === -1) {
        next.cards = [...next.cards, newCard]
      } else {
        next.cards = next.cards.map((c, i) => (i === cardIndex ? newCard : c))
      }

      // Add a phase-transition info message if just shifted
      if (next.phase !== prev.phase) {
        const phaseMsg: InfoMessage = {
          id: newMessageId(),
          ts: new Date().toISOString(),
          kind: 'assistant',
          type: 'info',
          body:
            next.phase === 'forming'
              ? "Nice — your Plant Brain is forming. I can start drafting solve cards from what you've told me. I'll keep asking discovery questions, but you'll see protocols starting to take shape on the right."
              : "Your Plant Brain is mature now. From here I'll mostly propose protocols based on what you've told me, and you'll verify or edit. Less form-filling, more confirming.",
          tone: 'milestone',
        }
        next.conversation = [...next.conversation, phaseMsg]
      }

      // If we should ask for approval on the live card, do that
      if (shouldAskApprove) {
        const approveMsg: ApproveMessage = {
          id: newMessageId(),
          ts: new Date().toISOString(),
          kind: 'assistant',
          type: 'approve',
          cardSubject: next.currentScenarioId,
          ask: `Here's the protocol forming for ${newCard.scenarioLabel}. Should this become how your team handles it?`,
          cardPreview: newCard,
        }
        next.conversation = [...next.conversation, approveMsg]
        next.pendingApproveCardScenarioId = next.currentScenarioId
      } else {
        // Otherwise, ask the next question
        const nextQ = pickNextQuestion(next)
        if (nextQ) {
          const nextMsg = buildAssistantMessageFromQuestion(nextQ)
          next.conversation = [...next.conversation, nextMsg]
        } else {
          // No more questions
          const doneMsg: InfoMessage = {
            id: newMessageId(),
            ts: new Date().toISOString(),
            kind: 'assistant',
            type: 'info',
            body: "I've run through every question I have for you. Your Plant Brain has the structure it needs. From here, you can keep refining protocols, add scenarios, or export your ops plan.",
            tone: 'milestone',
          }
          next.conversation = [...next.conversation, doneMsg]
        }
      }

      return next
    })
  }

  // Approve / Edit / Decline a card
  function decideOnCard(scenarioId: string, decision: 'confirm' | 'edit' | 'decline') {
    setState((prev) => {
      const card = prev.cards.find((c) => c.scenarioId === scenarioId)
      if (!card) return prev
      let updatedCard: SolveCard = { ...card }
      const userMsgBody =
        decision === 'confirm'
          ? "Confirm — make this our plant's protocol."
          : decision === 'edit'
          ? "Edit details before locking it in."
          : "Not yet — keep refining."
      if (decision === 'confirm') updatedCard = { ...card, status: 'confirmed', confirmedAt: new Date().toISOString() }
      else if (decision === 'edit') updatedCard = { ...card, status: 'edited' }
      else updatedCard = { ...card, status: 'forming' }

      const userMsg: UserMessage = {
        id: newMessageId(),
        ts: new Date().toISOString(),
        kind: 'user',
        cardSubject: scenarioId,
        body: userMsgBody,
        rawAnswer: decision,
      }
      const cards = prev.cards.map((c) => (c.scenarioId === scenarioId ? updatedCard : c))
      const conversation = [...prev.conversation, userMsg]

      // Follow-up message based on decision
      let followup: AssistantMessage
      if (decision === 'confirm') {
        followup = {
          id: newMessageId(),
          ts: new Date().toISOString(),
          kind: 'assistant',
          type: 'info',
          body: "Locked in. This protocol is now part of your Plant Brain. Your team can use it. Let's keep building.",
          tone: 'milestone',
        }
      } else if (decision === 'edit') {
        followup = {
          id: newMessageId(),
          ts: new Date().toISOString(),
          kind: 'assistant',
          type: 'info',
          body: "Got it. The card stays in draft. You can refine it from the panel on the right, or keep answering questions and I'll keep updating it.",
        }
      } else {
        followup = {
          id: newMessageId(),
          ts: new Date().toISOString(),
          kind: 'assistant',
          type: 'info',
          body: "Understood. I'll keep refining. Tell me more and I'll bring it back when there's more to lock in.",
        }
      }
      conversation.push(followup)

      // Move on to next scenario or next question
      const next: SessionState = { ...prev, cards, conversation, pendingApproveCardScenarioId: null }
      // Advance to next un-confirmed scenario for the live card focus
      const nextScenario = prev.scenariosFromSeed.find((sc) => !next.cards.find((c) => c.scenarioId === sc.id && c.status === 'confirmed'))
      if (nextScenario) next.currentScenarioId = nextScenario.id

      const nextQ = pickNextQuestion(next)
      if (nextQ) {
        next.conversation.push(buildAssistantMessageFromQuestion(nextQ))
      }
      return next
    })
  }

  // Voice input handling
  function startVoice(messageId: string) {
    const rec = getSpeechRecognition()
    if (!rec) {
      alert("Voice isn't supported in this browser. Try Safari on iOS or Chrome on Android. You can type your answer instead.")
      return
    }
    setVoiceState('listening')
    let final = ''
    rec.onresult = (ev: SpeechRecognitionEventLike) => {
      let interim = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i]
        if (result.isFinal) final += result[0].transcript
        else interim += result[0].transcript
      }
      const live = (final + ' ' + interim).trim()
      setComposing((prev) => (prev ? { ...prev, text: live } : { messageId, text: live, suggestions: [] }))
    }
    rec.onerror = () => setVoiceState('idle')
    rec.onend = () => setVoiceState('idle')
    rec.start()
  }

  function resetSession() {
    if (typeof window !== 'undefined') window.localStorage.removeItem(LS_KEY)
    setState(freshSession())
    setShowResetConfirm(false)
  }

  return (
    <div
      style={{
        background: T.bg,
        color: T.ink,
        fontFamily: T.sans,
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: T.bg,
          borderBottom: `1px solid ${T.hair}`,
          padding: '14px 20px',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              style={{
                width: 10,
                height: 10,
                background: T.rust,
                borderRadius: 99,
                boxShadow: `0 0 0 3px ${T.bgPanel}`,
              }}
            />
            <span style={{ fontFamily: T.serif, fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em' }}>
              GONR Plant Brain
            </span>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted, letterSpacing: '0.1em' }}>
              · INTELLIGENCE COCKPIT
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.inkMuted, textTransform: 'uppercase' }}>
                Plant brain forming
              </div>
              <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.1 }}>
                {totalCoverage}% <span style={{ color: T.inkMuted, fontWeight: 300 }}>captured</span>
              </div>
            </div>
            <button
              onClick={() => setShowBrainPanel(!showBrainPanel)}
              className="md:hidden"
              style={{
                fontFamily: T.mono,
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: T.ink,
                background: T.bgPanel,
                border: `1px solid ${T.hairHi}`,
                padding: '8px 12px',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {showBrainPanel ? 'Hide' : 'Brain'}
            </button>
          </div>
        </div>
        {/* Hairline progress bar */}
        <div className="max-w-7xl mx-auto mt-2" style={{ height: 1, background: T.hair, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${totalCoverage}%`,
              background: T.rust,
              transition: `width ${T.trans}`,
            }}
          />
        </div>
      </header>

      {/* Main two-pane layout */}
      <div className="max-w-7xl mx-auto md:flex md:gap-6 md:px-6 md:pt-6">
        {/* Chat panel (left/main) */}
        <main className="flex-1 min-w-0" style={{ paddingBottom: 220 }}>
          <div
            ref={streamRef}
            style={{
              padding: '24px 20px',
              maxHeight: 'calc(100vh - 220px)',
              overflowY: 'auto',
            }}
            className="md:max-h-[calc(100vh-180px)]"
          >
            <div className="space-y-5 max-w-2xl mx-auto">
              {state.conversation.map((m) => (
                <MessageRenderer
                  key={m.id}
                  message={m}
                  state={state}
                  onAnswer={(question, msg, displayBody, raw) => submitAnswer(question, msg, displayBody, raw)}
                  onCardDecision={decideOnCard}
                  composing={composing}
                  setComposing={setComposing}
                  voiceState={voiceState}
                  startVoice={startVoice}
                />
              ))}
            </div>
          </div>
        </main>

        {/* Brain panel (desktop right) */}
        <aside className="hidden md:block w-[380px] shrink-0">
          <div style={{ position: 'sticky', top: 80 }}>
            <BrainPanel state={state} liveCard={liveCard} />
          </div>
        </aside>
      </div>

      {/* Mobile bottom-sheet for brain panel */}
      {showBrainPanel && (
        <div
          className="md:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowBrainPanel(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.bgPanel,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              borderTop: `1px solid ${T.hairHi}`,
              borderRadius: '16px 16px 0 0',
              padding: 20,
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 600 }}>Your Plant Brain</h2>
              <button
                onClick={() => setShowBrainPanel(false)}
                style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
            <BrainPanel state={state} liveCard={liveCard} />
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      <BottomToolbar
        onExportJSON={() => exportJSON(state)}
        onExportOps={() => exportOpsPlan(state)}
        onReset={() => setShowResetConfirm(true)}
      />

      {/* Reset modal */}
      {showResetConfirm && (
        <Modal onCancel={() => setShowResetConfirm(false)}>
          <h2 style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Reset session?</h2>
          <p style={{ fontFamily: T.sans, fontSize: 15, color: T.inkDim, lineHeight: 1.5, marginBottom: 20 }}>
            This clears your conversation, profile, and any cards. Cannot be undone. Export your ops plan first if you want a copy.
          </p>
          <div className="flex gap-2 justify-end">
            <ToolBtn label="Cancel" onClick={() => setShowResetConfirm(false)} />
            <ToolBtn label="Reset everything" onClick={resetSession} primary danger />
          </div>
        </Modal>
      )}
    </div>
  )
}

// ============================================================================
// Message renderer
// ============================================================================
function MessageRenderer({
  message,
  state,
  onAnswer,
  onCardDecision,
  composing,
  setComposing,
  voiceState,
  startVoice,
}: {
  message: Message
  state: SessionState
  onAnswer: (question: Question, msg: AssistantMessage, displayBody: string, raw: ProfileFieldValue) => void
  onCardDecision: (scenarioId: string, decision: 'confirm' | 'edit' | 'decline') => void
  composing: { messageId: string; text: string; suggestions: string[] } | null
  setComposing: (c: { messageId: string; text: string; suggestions: string[] } | null) => void
  voiceState: 'idle' | 'listening' | 'transcribing'
  startVoice: (messageId: string) => void
}) {
  const isUser = message.kind === 'user'
  const isAnswered = !isUser && 'questionId' in message && message.questionId ? state.answeredQuestionIds.includes(message.questionId) : false

  if (isUser) {
    return (
      <div className="flex justify-end" style={{ animation: 'pb-fade-up 280ms ease-out' }}>
        <div
          style={{
            background: T.rust,
            color: '#fff',
            fontFamily: T.sans,
            fontSize: 15,
            padding: '10px 16px',
            borderRadius: '14px 14px 4px 14px',
            maxWidth: '78%',
            lineHeight: 1.45,
            boxShadow: `0 2px 8px rgba(200,68,42,0.18)`,
          }}
        >
          {(message as UserMessage).body}
        </div>
      </div>
    )
  }

  const m = message as AssistantMessage

  // Common assistant avatar + bubble shell
  const renderShell = (content: ReactNode) => (
    <div className="flex gap-3" style={{ animation: 'pb-fade-up 280ms ease-out' }}>
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          background: T.bgPanelHi,
          border: `1px solid ${T.hairHi}`,
          borderRadius: 99,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 4,
        }}
      >
        <span style={{ width: 6, height: 6, background: T.rust, borderRadius: 99 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{content}</div>
    </div>
  )

  if (m.type === 'info') {
    return renderShell(
      <div
        style={{
          background: m.tone === 'milestone' ? `linear-gradient(135deg, ${T.bgPanelHi}, ${T.bgPanel})` : 'transparent',
          border: m.tone === 'milestone' ? `1px solid ${T.rustDim}` : 'none',
          borderRadius: 14,
          padding: m.tone === 'milestone' ? 16 : '4px 0',
        }}
      >
        <p style={{ fontFamily: T.serif, fontSize: 16, lineHeight: 1.55, color: T.ink, fontWeight: m.tone === 'milestone' ? 500 : 400 }}>
          {m.body}
        </p>
      </div>,
    )
  }

  // Approve message — special render with the live solve card preview inline
  if (m.type === 'approve') {
    const card = m.cardPreview
    const isResolved = card.status === 'confirmed' || state.cards.find((c) => c.scenarioId === card.scenarioId)?.status === 'confirmed'
    return renderShell(
      <div>
        <p style={{ fontFamily: T.serif, fontSize: 17, lineHeight: 1.5, color: T.ink, marginBottom: 12 }}>{m.ask}</p>
        <SolveCardPreview card={card} compact />
        {!isResolved && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            <BigPillarBtn label="Confirm" tone="primary" onClick={() => onCardDecision(card.scenarioId, 'confirm')} />
            <BigPillarBtn label="Edit details" tone="neutral" onClick={() => onCardDecision(card.scenarioId, 'edit')} />
            <BigPillarBtn label="Not yet — keep refining" tone="ghost" onClick={() => onCardDecision(card.scenarioId, 'decline')} />
          </div>
        )}
      </div>,
    )
  }

  const question = 'questionId' in m && m.questionId ? findQuestion(m.questionId) : undefined

  // Question shell — render the ask text + whyAsking + the type-specific input
  return renderShell(
    <div>
      <p style={{ fontFamily: T.serif, fontSize: 17, lineHeight: 1.5, color: T.ink }}>{m.ask}</p>
      {m.whyAsking && (
        <p
          style={{
            fontFamily: T.sans,
            fontSize: 13,
            color: T.inkMuted,
            marginTop: 6,
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          {m.whyAsking}
        </p>
      )}
      <div style={{ marginTop: 14 }}>
        {m.type === 'chips' && (
          <ChipStripInput
            options={(m as ChipsMessage).options}
            onSelect={(opt) => question && onAnswer(question, m, opt, opt)}
            disabled={isAnswered}
          />
        )}
        {m.type === 'yesno' && (
          <YesNoInput
            onSelect={(v) => question && onAnswer(question, m, v ? 'Yes' : 'No', v)}
            disabled={isAnswered}
          />
        )}
        {m.type === 'multiselect' && (
          <MultiSelectInput
            options={(m as MultiSelectMessage).options}
            onSubmit={(picks) => question && onAnswer(question, m, picks.join(', '), picks)}
            disabled={isAnswered}
          />
        )}
        {m.type === 'ranked' && (
          <RankedInput
            options={(m as RankedMessage).options}
            onSelect={(opt) => question && onAnswer(question, m, opt, opt)}
            disabled={isAnswered}
          />
        )}
        {(m.type === 'text' || m.type === 'scenario') && (
          <TypedInput
            messageId={m.id}
            suggestions={(m as TextMessage).suggestedCompletions || []}
            composing={composing}
            setComposing={setComposing}
            voiceState={voiceState}
            startVoice={startVoice}
            onSubmit={(text) => question && onAnswer(question, m, text, text)}
            disabled={isAnswered}
          />
        )}
      </div>
    </div>,
  )

  function findQuestion(qid: string): Question | undefined {
    return QUESTIONS.find((q) => q.id === qid)
  }
}

// ============================================================================
// Input primitives
// ============================================================================
function ChipStripInput({ options, onSelect, disabled }: { options: string[]; onSelect: (opt: string) => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          disabled={disabled}
          onClick={() => onSelect(opt)}
          style={{
            fontFamily: T.sans,
            fontSize: 14,
            fontWeight: 500,
            padding: '10px 16px',
            background: disabled ? T.bgPanelHi : T.bgPanelHi,
            color: disabled ? T.inkMuted : T.ink,
            border: `1px solid ${T.hairHi}`,
            borderRadius: 999,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: T.trans,
            opacity: disabled ? 0.5 : 1,
          }}
          className={disabled ? '' : 'hover:bg-[var(--rust)] hover:!text-white hover:!border-[var(--rust)]'}
          onMouseEnter={(e) => {
            if (disabled) return
            ;(e.currentTarget as HTMLButtonElement).style.background = T.rust
            ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = T.rust
          }}
          onMouseLeave={(e) => {
            if (disabled) return
            ;(e.currentTarget as HTMLButtonElement).style.background = T.bgPanelHi
            ;(e.currentTarget as HTMLButtonElement).style.color = T.ink
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = T.hairHi
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function YesNoInput({ onSelect, disabled }: { onSelect: (v: boolean) => void; disabled: boolean }) {
  return (
    <div className="flex gap-2">
      <BigPillarBtn label="Yes" tone="primary" onClick={() => onSelect(true)} disabled={disabled} />
      <BigPillarBtn label="No" tone="neutral" onClick={() => onSelect(false)} disabled={disabled} />
    </div>
  )
}

function MultiSelectInput({ options, onSubmit, disabled }: { options: string[]; onSubmit: (picks: string[]) => void; disabled: boolean }) {
  const [picks, setPicks] = useState<string[]>([])
  const togglePick = (opt: string) => setPicks((prev) => (prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]))
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = picks.includes(opt)
          return (
            <button
              key={opt}
              disabled={disabled}
              onClick={() => togglePick(opt)}
              style={{
                fontFamily: T.sans,
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                padding: '10px 16px',
                background: active ? T.rust : T.bgPanelHi,
                color: active ? '#fff' : T.ink,
                border: `1px solid ${active ? T.rust : T.hairHi}`,
                borderRadius: 999,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: T.trans,
              }}
            >
              {active ? '✓ ' : ''}
              {opt}
            </button>
          )
        })}
      </div>
      {picks.length > 0 && !disabled && (
        <div className="mt-3">
          <BigPillarBtn label={`Confirm ${picks.length} selected`} tone="primary" onClick={() => onSubmit(picks)} />
        </div>
      )}
    </div>
  )
}

function RankedInput({ options, onSelect, disabled }: { options: string[]; onSelect: (opt: string) => void; disabled: boolean }) {
  // For v0, ranked is treated like chips with a sequential visual (could be drag-rank in v0.1)
  return <ChipStripInput options={options} onSelect={onSelect} disabled={disabled} />
}

function TypedInput({
  messageId,
  suggestions,
  composing,
  setComposing,
  voiceState,
  startVoice,
  onSubmit,
  disabled,
}: {
  messageId: string
  suggestions: string[]
  composing: { messageId: string; text: string; suggestions: string[] } | null
  setComposing: (c: { messageId: string; text: string; suggestions: string[] } | null) => void
  voiceState: 'idle' | 'listening' | 'transcribing'
  startVoice: (messageId: string) => void
  onSubmit: (text: string) => void
  disabled: boolean
}) {
  const isActive = composing?.messageId === messageId
  const text = isActive ? composing!.text : ''
  const setText = (v: string) => setComposing({ messageId, text: v, suggestions })
  return (
    <div>
      {/* Suggested completions as chips above the input */}
      {!disabled && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setText(s)}
              style={{
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 400,
                padding: '8px 12px',
                background: 'transparent',
                color: T.inkDim,
                border: `1px dashed ${T.hairHi}`,
                borderRadius: 999,
                cursor: 'pointer',
                transition: T.trans,
                textAlign: 'left',
                maxWidth: '100%',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.color = T.ink
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = T.hairHi
                ;(e.currentTarget as HTMLButtonElement).style.borderStyle = 'solid'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.color = T.inkDim
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = T.hairHi
                ;(e.currentTarget as HTMLButtonElement).style.borderStyle = 'dashed'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-stretch">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={voiceState === 'listening' ? 'Listening…' : 'Type or tap mic to speak'}
          disabled={disabled}
          style={{
            flex: 1,
            fontFamily: T.serif,
            fontSize: 16,
            fontWeight: 400,
            background: T.bgInput,
            color: T.ink,
            border: `1px solid ${voiceState === 'listening' ? T.rust : T.hairHi}`,
            borderRadius: 12,
            padding: '12px 16px',
            outline: 'none',
            resize: 'vertical',
            opacity: disabled ? 0.5 : 1,
            transition: T.trans,
          }}
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={() => startVoice(messageId)}
            disabled={disabled || voiceState === 'listening'}
            title="Voice input"
            style={{
              fontFamily: T.mono,
              fontSize: 11,
              padding: 12,
              background: voiceState === 'listening' ? T.rust : T.bgPanelHi,
              color: voiceState === 'listening' ? '#fff' : T.ink,
              border: `1px solid ${voiceState === 'listening' ? T.rust : T.hairHi}`,
              borderRadius: 12,
              cursor: disabled ? 'not-allowed' : 'pointer',
              minWidth: 56,
              transition: T.trans,
            }}
          >
            {voiceState === 'listening' ? '●' : '🎤'}
          </button>
          <button
            onClick={() => {
              if (text.trim().length > 0) {
                onSubmit(text.trim())
                setComposing(null)
              }
            }}
            disabled={disabled || text.trim().length === 0}
            style={{
              fontFamily: T.sans,
              fontSize: 13,
              fontWeight: 600,
              padding: '12px 14px',
              background: text.trim().length === 0 ? T.bgPanelHi : T.rust,
              color: text.trim().length === 0 ? T.inkMuted : '#fff',
              border: 'none',
              borderRadius: 12,
              cursor: disabled || text.trim().length === 0 ? 'not-allowed' : 'pointer',
              minWidth: 56,
              transition: T.trans,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function BigPillarBtn({
  label,
  onClick,
  tone,
  disabled,
  danger,
}: {
  label: string
  onClick: () => void
  tone: 'primary' | 'neutral' | 'ghost'
  disabled?: boolean
  danger?: boolean
}) {
  const styles: CSSProperties =
    tone === 'primary'
      ? {
          background: danger ? T.rust : T.rust,
          color: '#fff',
          border: `1px solid ${danger ? T.rust : T.rust}`,
          fontWeight: 600,
        }
      : tone === 'neutral'
      ? {
          background: T.bgPanelHi,
          color: T.ink,
          border: `1px solid ${T.hairHi}`,
          fontWeight: 500,
        }
      : {
          background: 'transparent',
          color: T.inkDim,
          border: `1px solid ${T.hair}`,
          fontWeight: 400,
        }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles,
        fontFamily: T.sans,
        fontSize: 15,
        padding: '14px 18px',
        borderRadius: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: T.trans,
        opacity: disabled ? 0.5 : 1,
        textAlign: 'center',
        width: '100%',
      }}
    >
      {label}
    </button>
  )
}

// ============================================================================
// Brain panel (right side / mobile bottom-sheet)
// ============================================================================
function BrainPanel({ state, liveCard }: { state: SessionState; liveCard: SolveCard }) {
  return (
    <div className="space-y-4">
      <ProfileCoverage state={state} />
      <SolveCardPreview card={liveCard} />
    </div>
  )
}

function ProfileCoverage({ state }: { state: SessionState }) {
  return (
    <section
      style={{
        background: T.bgPanel,
        border: `1px solid ${T.hair}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          fontFamily: T.mono,
          fontSize: 10,
          letterSpacing: '0.18em',
          color: T.inkMuted,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Plant Brain Coverage
      </div>
      <div className="space-y-3">
        {MODULES.map((m) => {
          const cov = state.profile[m.id].coverage
          return (
            <div key={m.id}>
              <div className="flex items-baseline justify-between mb-1">
                <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 500, color: T.ink }}>{m.label}</span>
                <span style={{ fontFamily: T.mono, fontSize: 11, color: cov === 0 ? T.inkMuted : T.ink }}>{cov}%</span>
              </div>
              <div style={{ height: 3, background: T.hair, borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${cov}%`,
                    background: cov >= 75 ? T.green : cov >= 40 ? T.amber : T.rust,
                    transition: T.trans,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SolveCardPreview({ card, compact }: { card: SolveCard; compact?: boolean }) {
  return (
    <section
      style={{
        background: T.bgPanel,
        border: `1px solid ${card.status === 'confirmed' ? T.green : card.status === 'awaiting_confirm' ? T.rust : T.hair}`,
        borderRadius: 16,
        padding: 18,
        position: 'relative',
        boxShadow: card.status === 'confirmed' ? `0 0 0 2px ${T.green}33` : 'none',
      }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 10,
              letterSpacing: '0.18em',
              color: T.inkMuted,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Solve Card · {card.status.replace('_', ' ')}
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, color: T.ink, lineHeight: 1.2 }}>{card.scenarioLabel}</div>
        </div>
        {card.status === 'confirmed' && (
          <span
            style={{
              fontFamily: T.mono,
              fontSize: 10,
              letterSpacing: '0.1em',
              color: T.green,
              textTransform: 'uppercase',
              border: `1px solid ${T.green}`,
              padding: '3px 8px',
              borderRadius: 999,
            }}
          >
            ✓ Confirmed
          </span>
        )}
      </div>
      <div className="space-y-3">
        {card.sections.map((sec) => (
          <div key={sec.key} style={{ opacity: sec.filled ? 1 : 0.45, transition: T.trans }}>
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 9,
                letterSpacing: '0.18em',
                color: sec.filled ? T.inkDim : T.inkMuted,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {sec.label} {!sec.filled && <span style={{ color: T.inkMuted }}>· forming</span>}
            </div>
            <p style={{ fontFamily: T.sans, fontSize: compact ? 12 : 13, color: T.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{sec.content}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// Bottom toolbar
// ============================================================================
function BottomToolbar({ onExportJSON, onExportOps, onReset }: { onExportJSON: () => void; onExportOps: () => void; onReset: () => void }) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: `linear-gradient(180deg, transparent, ${T.bg} 30%)`,
        zIndex: 25,
        padding: '12px 16px',
        pointerEvents: 'none',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2" style={{ pointerEvents: 'auto' }}>
        <div
          style={{
            background: T.bgPanel,
            border: `1px solid ${T.hair}`,
            borderRadius: 12,
            padding: '8px',
            display: 'flex',
            gap: 6,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
          }}
        >
          <ToolBtn label="Ops Plan" onClick={onExportOps} primary />
          <ToolBtn label="JSON" onClick={onExportJSON} />
          <ToolBtn label="Reset" onClick={onReset} danger />
        </div>
      </div>
    </nav>
  )
}

function ToolBtn({ label, onClick, primary, danger }: { label: string; onClick: () => void; primary?: boolean; danger?: boolean }) {
  const bg = primary ? T.rust : danger ? 'transparent' : T.bgPanelHi
  const fg = primary ? '#fff' : danger ? T.inkDim : T.ink
  const border = primary ? T.rust : danger ? T.hair : T.hairHi
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: T.mono,
        fontSize: 11,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '8px 14px',
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        cursor: 'pointer',
        transition: T.trans,
      }}
    >
      {label}
    </button>
  )
}

// ============================================================================
// Modal
// ============================================================================
function Modal({ children, onCancel }: { children: ReactNode; onCancel: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
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
          background: T.bgPanel,
          border: `1px solid ${T.hairHi}`,
          padding: 24,
          borderRadius: 16,
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// (Keyframes are injected inside useGoogleFonts above — no separate component needed.)
