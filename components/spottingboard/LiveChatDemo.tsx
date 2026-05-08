'use client'

// components/spottingboard/LiveChatDemo.tsx — TASK-168 v3
//
// Decision-chip intake demo. NOT a chatbot. Per Tyler msg 1549 + Atlas's
// TASK-165 UX rule lock: "one high-value question at a time, prefilled
// inline buttons, typing only for exceptions, fast tap-to-answer."
//
// Flow per cycle (~13s):
//   Q1 stain identity → auto-taps "red wine"
//   Q2 fabric/material → auto-taps "cotton"
//   Q3 prior treatment → auto-taps "none"
//   Structured chemistry card materializes
//   Loop
//
// Bilingual via the page's local lang prop (passed from
// app/spottingboard/page.tsx's useState lang). Restarts on lang change.

import { useEffect, useMemo, useState } from 'react'

// ──────────────────────────────────────────────────────────────────────────────
// Demo content
// ──────────────────────────────────────────────────────────────────────────────

interface Chip {
  id: string
  label: string
}

interface DemoQuestion {
  id: string
  prompt: string
  chips: Chip[]
  /** Which chip the demo auto-selects. Must exist in `chips`. */
  selects: string
  /** Short label shown in the answered-summary pill. */
  answer_summary: string
}

interface DemoCopy {
  questions: DemoQuestion[]
  card: {
    title: string
    body: string
    badges: { label: string; tone: 'blue' | 'purple' | 'mute' }[]
  }
  header: { title: string; plant: string; livePill: string }
  cardEyebrow: string
  answeredLabel: string
}

const COPY_EN: DemoCopy = {
  questions: [
    {
      id: 'stain',
      prompt: 'What stain came in?',
      chips: [
        { id: 'red-wine', label: 'Red wine' },
        { id: 'coffee', label: 'Coffee' },
        { id: 'oil', label: 'Oil / grease' },
        { id: 'ink', label: 'Ink' },
        { id: 'unknown', label: 'Unknown' },
      ],
      selects: 'red-wine',
      answer_summary: 'Red wine',
    },
    {
      id: 'fabric',
      prompt: 'On what fabric?',
      chips: [
        { id: 'cotton', label: 'Cotton' },
        { id: 'silk', label: 'Silk' },
        { id: 'wool', label: 'Wool' },
        { id: 'polyester', label: 'Polyester' },
        { id: 'unknown', label: 'Unknown' },
      ],
      selects: 'cotton',
      answer_summary: 'Cotton',
    },
    {
      id: 'prior',
      prompt: 'Already treated?',
      chips: [
        { id: 'none', label: 'No, fresh' },
        { id: 'water', label: 'Water at counter' },
        { id: 'heat', label: 'Heat / dryer' },
        { id: 'home-product', label: 'Home product' },
        { id: 'unknown', label: 'Unknown' },
      ],
      selects: 'none',
      answer_summary: 'No, fresh',
    },
  ],
  card: {
    title: 'Red wine on cotton',
    body: 'Cool flush from the back. Tannin formula with a bone. POG if set. No heat until pigment is clear.',
    badges: [
      { label: 'tannin', tone: 'blue' },
      { label: 'no-heat-first', tone: 'purple' },
      { label: 'unreviewed', tone: 'mute' },
    ],
  },
  header: {
    title: 'Guided capture',
    plant: 'Spotter rule · plant-local',
    livePill: 'Live example',
  },
  cardEyebrow: 'Structured card preview',
  answeredLabel: 'Answered',
}

const COPY_ES: DemoCopy = {
  questions: [
    {
      id: 'stain',
      prompt: '¿Qué mancha llegó?',
      chips: [
        { id: 'red-wine', label: 'Vino tinto' },
        { id: 'coffee', label: 'Café' },
        { id: 'oil', label: 'Aceite / grasa' },
        { id: 'ink', label: 'Tinta' },
        { id: 'unknown', label: 'Desconocida' },
      ],
      selects: 'red-wine',
      answer_summary: 'Vino tinto',
    },
    {
      id: 'fabric',
      prompt: '¿Sobre qué tela?',
      chips: [
        { id: 'cotton', label: 'Algodón' },
        { id: 'silk', label: 'Seda' },
        { id: 'wool', label: 'Lana' },
        { id: 'polyester', label: 'Poliéster' },
        { id: 'unknown', label: 'Desconocida' },
      ],
      selects: 'cotton',
      answer_summary: 'Algodón',
    },
    {
      id: 'prior',
      prompt: '¿Ya fue tratada?',
      chips: [
        { id: 'none', label: 'No, fresca' },
        { id: 'water', label: 'Agua en mostrador' },
        { id: 'heat', label: 'Calor / secadora' },
        { id: 'home-product', label: 'Producto casero' },
        { id: 'unknown', label: 'Desconocido' },
      ],
      selects: 'none',
      answer_summary: 'No, fresca',
    },
  ],
  card: {
    title: 'Vino tinto sobre algodón',
    body: 'Enjuague frío desde atrás. Fórmula tanino con espátula. POG si está fijada. Sin calor hasta que el pigmento esté limpio.',
    badges: [
      { label: 'tanino', tone: 'blue' },
      { label: 'sin calor primero', tone: 'purple' },
      { label: 'sin revisar', tone: 'mute' },
    ],
  },
  header: {
    title: 'Captura guiada',
    plant: 'Regla del manchador · local de planta',
    livePill: 'Ejemplo en vivo',
  },
  cardEyebrow: 'Vista previa de tarjeta estructurada',
  answeredLabel: 'Respondido',
}

// ──────────────────────────────────────────────────────────────────────────────
// Per-question micro-states
// ──────────────────────────────────────────────────────────────────────────────

type ChipPhase =
  | 'hidden'      // chips not yet faded in
  | 'idle'        // chips visible, target not yet highlighted
  | 'highlight'   // target chip pulses
  | 'tapped'      // target chip filled (selected)
  | 'collapsing'  // chips fade out, summary slides in
  | 'answered'    // only summary pill remains

const CHIP_TIMING = {
  fadeIn: 350,
  idleHold: 500,
  highlight: 700,
  tap: 350,
  collapse: 500,
  answeredHold: 450,
}

const CARD_HOLD = 4500
const LOOP_GAP = 1100

// ──────────────────────────────────────────────────────────────────────────────
// Reduced motion
// ──────────────────────────────────────────────────────────────────────────────

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function LiveChatDemo({ lang = 'en' }: { lang?: 'en' | 'es' }) {
  const reducedMotion = useReducedMotion()
  const copy = useMemo<DemoCopy>(() => (lang === 'es' ? COPY_ES : COPY_EN), [lang])

  // questionIndex 0..N-1 = active question; N = card visible; N+1 = loop pause
  const [questionIndex, setQuestionIndex] = useState(0)
  const [chipPhase, setChipPhase] = useState<ChipPhase>('hidden')
  const [answered, setAnswered] = useState<{ qid: string; chip_id: string; summary: string }[]>([])

  const totalQuestions = copy.questions.length
  const cardVisible = questionIndex >= totalQuestions
  const activeQuestion = copy.questions[questionIndex]

  // Reset on language flip so visitors don't see a half-translated cycle
  useEffect(() => {
    setQuestionIndex(0)
    setChipPhase('hidden')
    setAnswered([])
  }, [lang])

  // Reduced motion: jump to the final state immediately
  useEffect(() => {
    if (!reducedMotion) return
    setQuestionIndex(totalQuestions)
    setAnswered(copy.questions.map((q) => ({
      qid: q.id, chip_id: q.selects,
      summary: q.answer_summary,
    })))
  }, [reducedMotion, totalQuestions, copy.questions])

  // Chip phase machine — runs while questionIndex < totalQuestions
  useEffect(() => {
    if (reducedMotion) return
    if (cardVisible) return // card-hold timer handled separately

    let cancelled = false
    const advance = (next: ChipPhase, delay: number) => {
      const t = setTimeout(() => { if (!cancelled) setChipPhase(next) }, delay)
      timers.push(t)
    }
    const timers: ReturnType<typeof setTimeout>[] = []

    if (chipPhase === 'hidden') {
      advance('idle', 100)
    } else if (chipPhase === 'idle') {
      advance('highlight', CHIP_TIMING.fadeIn + CHIP_TIMING.idleHold)
    } else if (chipPhase === 'highlight') {
      advance('tapped', CHIP_TIMING.highlight)
    } else if (chipPhase === 'tapped') {
      advance('collapsing', CHIP_TIMING.tap)
    } else if (chipPhase === 'collapsing') {
      const t = setTimeout(() => {
        if (cancelled) return
        // Commit answer + advance to next question
        const q = copy.questions[questionIndex]
        setAnswered((prev) => [
          ...prev,
          { qid: q.id, chip_id: q.selects, summary: q.answer_summary },
        ])
        setQuestionIndex((prev) => prev + 1)
        setChipPhase('hidden')
      }, CHIP_TIMING.collapse)
      timers.push(t)
    }

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [chipPhase, questionIndex, cardVisible, reducedMotion, copy.questions])

  // Card-hold + loop restart
  useEffect(() => {
    if (reducedMotion) return
    if (!cardVisible) return
    const t = setTimeout(() => {
      setQuestionIndex(0)
      setChipPhase('hidden')
      setAnswered([])
    }, CARD_HOLD + LOOP_GAP)
    return () => clearTimeout(t)
  }, [cardVisible, reducedMotion])

  return (
    <div
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0b0d]/92 p-4 shadow-[0_36px_120px_-44px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-xl sm:p-5"
    >
      {/* Subtle turquoise top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(closest-side_at_50%_0%,rgba(0,212,170,0.20),transparent_72%)]" />

      {/* Header */}
      <div className="relative mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <div className="text-sm font-extrabold text-white">{copy.header.title}</div>
          <div className="text-xs text-white/40">{copy.header.plant}</div>
        </div>
        <div className="rounded-full border border-[#00d4aa]/35 bg-[#00d4aa]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#00d4aa]">
          {copy.header.livePill}
        </div>
      </div>

      {/* Body — fixed min-height so the layout doesn't jump */}
      <div className="relative space-y-4" style={{ minHeight: '15rem' }}>
        {/* Answered pills (above active question) */}
        {answered.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {answered.map((a) => {
              const q = copy.questions.find((qq) => qq.id === a.qid)
              return (
                <AnsweredPill
                  key={a.qid}
                  prompt={q?.prompt ?? ''}
                  summary={a.summary}
                  answeredLabel={copy.answeredLabel}
                />
              )
            })}
          </div>
        )}

        {/* Active question (hide when card visible) */}
        {!cardVisible && activeQuestion && (
          <ActiveQuestion
            question={activeQuestion}
            phase={chipPhase}
          />
        )}
      </div>

      {/* Structured card — animates in when all questions answered */}
      <GovernanceCard
        visible={cardVisible}
        eyebrow={copy.cardEyebrow}
        card={copy.card}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function ActiveQuestion({
  question,
  phase,
}: {
  question: DemoQuestion
  phase: ChipPhase
}) {
  const chipsVisible = phase !== 'hidden'
  const chipsCollapsing = phase === 'collapsing'

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        opacity: chipsCollapsing ? 0 : 1,
        transform: chipsCollapsing ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'opacity 280ms cubic-bezier(0.22, 0.61, 0.36, 1), transform 280ms cubic-bezier(0.22, 0.61, 0.36, 1)',
      }}
    >
      {/* Question prompt */}
      <div className="text-[15px] font-semibold leading-snug text-white/90">
        {question.prompt}
      </div>

      {/* Chip rail */}
      <div className="flex flex-wrap gap-2">
        {question.chips.map((c, i) => {
          const isTarget = c.id === question.selects
          const state: ChipState = (() => {
            if (phase === 'hidden') return 'hidden'
            if (phase === 'idle') return 'idle'
            if (phase === 'highlight') return isTarget ? 'highlight' : 'idle'
            if (phase === 'tapped' || phase === 'collapsing') {
              return isTarget ? 'tapped' : 'dimmed'
            }
            return 'idle'
          })()
          return (
            <ChipButton
              key={c.id}
              label={c.label}
              state={state}
              revealDelay={i * 60}
              isVisible={chipsVisible}
            />
          )
        })}
      </div>
    </div>
  )
}

type ChipState = 'hidden' | 'idle' | 'highlight' | 'tapped' | 'dimmed'

function ChipButton({
  label,
  state,
  revealDelay,
  isVisible,
}: {
  label: string
  state: ChipState
  revealDelay: number
  isVisible: boolean
}) {
  const baseStyles =
    'rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-300 select-none'

  const stateStyles = (() => {
    switch (state) {
      case 'hidden':
        return 'border-white/10 bg-white/[0.04] text-white/55'
      case 'idle':
        return 'border-white/10 bg-white/[0.05] text-white/70'
      case 'highlight':
        return 'border-[#00d4aa]/55 bg-white/[0.05] text-white shadow-[0_0_28px_-6px_rgba(0,212,170,0.55)]'
      case 'tapped':
        return 'border-[#00d4aa] bg-[#00d4aa] text-[#061018] shadow-[0_8px_24px_-10px_rgba(0,212,170,0.7)]'
      case 'dimmed':
        return 'border-white/8 bg-white/[0.03] text-white/30'
    }
  })()

  return (
    <span
      className={`${baseStyles} ${stateStyles}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? state === 'highlight'
            ? 'translateY(0) scale(1.04)'
            : 'translateY(0) scale(1)'
          : 'translateY(6px) scale(0.96)',
        transitionDelay: isVisible ? `${revealDelay}ms` : '0ms',
        transitionProperty: 'opacity, transform, background-color, border-color, color, box-shadow',
      }}
    >
      {label}
    </span>
  )
}

function AnsweredPill({
  prompt,
  summary,
  answeredLabel,
}: {
  prompt: string
  summary: string
  answeredLabel: string
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-[#00d4aa]/30 bg-[#00d4aa]/10 px-2.5 py-1 text-[11px] font-semibold text-[#00d4aa]"
      title={`${answeredLabel}: ${prompt}`}
    >
      <span className="text-[#00d4aa]/90">✓</span>
      <span>{summary}</span>
    </span>
  )
}

function GovernanceCard({
  visible,
  eyebrow,
  card,
}: {
  visible: boolean
  eyebrow: string
  card: DemoCopy['card']
}) {
  return (
    <div
      className="mt-5 rounded-2xl border border-white/10 bg-[#08090c] p-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 380ms cubic-bezier(0.22, 0.61, 0.36, 1), transform 380ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      aria-hidden={!visible}
    >
      <div className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-white/40">
        {eyebrow}
      </div>
      <div className="text-sm font-bold text-white">{card.title}</div>
      <p className="mt-2 text-sm leading-6 text-white/55">{card.body}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
        {card.badges.map((b) => (
          <span
            key={b.label}
            className={`rounded-md px-2 py-1 ${
              b.tone === 'blue'
                ? 'border border-[#5b9eff]/50 text-[#5b9eff]'
                : b.tone === 'purple'
                  ? 'border border-[#a78bfa]/50 text-[#a78bfa]'
                  : 'border border-white/15 text-white/55'
            }`}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  )
}
