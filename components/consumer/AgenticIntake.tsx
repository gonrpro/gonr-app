'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, Shirt, Send, Loader2, ChevronDown, ShieldCheck, AlertTriangle } from 'lucide-react'
import BottomNav from '@/components/consumer/BottomNav'
import ResultsScreen, {
  type SolveResponse,
  type PrefetchedSolve,
} from '@/components/consumer/screens/ResultsScreen'
import type { SolveInput } from '@/lib/consumer-safety/solve-input'
import { useSaveProtocol } from '@/components/consumer/useSaveProtocol'

// TASK-218 FRONTIER — AGENTIC INTAKE (the client half of the orchestrator).
//
// This is what makes GONR feel like a stain expert in your pocket instead of a
// form. It shows an INSTANT READ of what it thinks is happening, then asks ONE
// sharp question at a time with quick-reply chips, looping visually until the
// deterministic engine has what it needs. When the engine verdict comes back
// (the agent route already called /api/solve), it renders the real Results +
// Do-Not-Do — no mock, no LLM-authored advice.
//
// SAFETY: every question + read comes from /api/intake (the LLM interprets and
// asks; it never writes treatment advice). The verdict is the deterministic
// engine's, rendered by ResultsScreen. If the agent is unavailable we fail closed
// to the deterministic guided intake (onFallback) — the user is never stuck.

// ── Conversation model (mirrors lib/intake/orchestrator) ─────────────────────

interface IntakeTurn {
  role: 'user' | 'assistant'
  text: string
}
interface IntakeRead {
  fabric: string
  stain: string
  careRisk: string
  confidence: 'high' | 'medium' | 'low'
}
interface IntakeQuestion {
  text: string
  options: string[]
}
interface IntakeHints {
  userNote?: string
  stain?: { stain?: string; surface?: string; family?: string; confidence?: string }
  careLabel?: { fiber?: string; careSymbols?: string[]; warnings?: string[] }
  hardConstraints?: string[]
}
interface IntakeResponse {
  phase: 'question' | 'verdict' | 'unavailable'
  read?: IntakeRead
  knows?: string[]
  suspects?: string[]
  cannotKnow?: string[]
  riskFlags?: string[]
  hardConstraints?: string[]
  failClosedReasons?: string[]
  nextQuestion?: IntakeQuestion | null
  assembledInput?: SolveInput
  solve?: SolveResponse
  solveHttp?: number
  reason?: string
}

type Phase = 'thinking' | 'asking' | 'verdict' | 'unavailable'

export interface AgenticIntakeProps {
  /** Free text the user opened with (from Home ?stain=…). */
  initialText?: string
  /** Structured vision hints carried from the Attach sheet (a HINT, never a verdict). */
  hints?: IntakeHints
  /** Optional captured-photo thumbnail to show in the context chip. */
  thumbnailUrl?: string
  /** Switch to the deterministic guided intake when the agent can't run. */
  onFallback?: () => void
}

// ── Presentation helpers (descriptive synthesis only — never advice) ─────────

/** Compose the calm "here's what I think" line from the read fields. */
function readSentence(read: IntakeRead): string {
  const stain = read.stain.trim()
  const fabric = read.fabric.trim()
  const lower = (s: string) => (s === s.toUpperCase() ? s : s.toLowerCase())
  if (!stain && !fabric) return "Let's figure out what's going on."
  let s = stain ? `Looks like ${lower(stain)}` : 'Looks like a stain'
  if (fabric) s += ` on what seems to be ${lower(fabric)}`
  return `${s}.`
}

const CONFIDENCE_NOTE: Record<IntakeRead['confidence'], string> = {
  high: "I'm fairly sure.",
  medium: 'Worth a quick check.',
  low: "I'm not certain yet.",
}

export default function AgenticIntake({
  initialText,
  hints,
  thumbnailUrl,
  onFallback,
}: AgenticIntakeProps) {
  const [turns, setTurns] = useState<IntakeTurn[]>(() =>
    initialText && initialText.trim() ? [{ role: 'user', text: initialText.trim() }] : [],
  )
  const [phase, setPhase] = useState<Phase>('thinking')
  const [read, setRead] = useState<IntakeRead | null>(null)
  const [question, setQuestion] = useState<IntakeQuestion | null>(null)
  const [knows, setKnows] = useState<string[]>([])
  const [cannotKnow, setCannotKnow] = useState<string[]>([])
  const [whyOpen, setWhyOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [verdict, setVerdict] = useState<{ input: SolveInput; prefetched: PrefetchedSolve } | null>(null)
  // Save-to-library writer: persists the engine's full card, never frontier-authored.
  const saveProtocol = useSaveProtocol()

  const hintsRef = useRef(hints)
  hintsRef.current = hints
  const startedRef = useRef(false)
  const inFlightRef = useRef(false)

  // One turn: POST the accumulated transcript, then act on ASK vs SOLVE.
  const runTurn = useCallback(
    async (transcript: IntakeTurn[], proceed: boolean) => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      setPhase('thinking')
      try {
        const res = await fetch('/api/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ transcript, hints: hintsRef.current, proceed }),
        })
        if (res.status === 503) {
          setPhase('unavailable')
          return
        }
        const data = (await res.json().catch(() => ({}))) as IntakeResponse

        if (data.phase === 'verdict' && data.assembledInput) {
          setRead(data.read ?? null)
          setVerdict({
            input: data.assembledInput,
            prefetched: { http: data.solveHttp ?? 0, data: data.solve ?? {} },
          })
          setPhase('verdict')
          return
        }

        if (data.phase === 'question' && data.nextQuestion) {
          setRead(data.read ?? null)
          setKnows(data.knows ?? [])
          setCannotKnow(data.cannotKnow ?? [])
          setQuestion(data.nextQuestion)
          // Record what GONR asked so the next turn has the full context.
          setTurns((prev) => [...prev, { role: 'assistant', text: data.nextQuestion!.text }])
          setPhase('asking')
          return
        }

        setPhase('unavailable')
      } catch {
        setPhase('unavailable')
      } finally {
        inFlightRef.current = false
      }
    },
    [],
  )

  // Kick off the first read once on mount.
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void runTurn(turns, false)
  }, [runTurn, turns])

  const answerWith = useCallback(
    (text: string) => {
      const t = text.trim()
      if (!t || inFlightRef.current) return
      setQuestion(null)
      setWhyOpen(false)
      setDraft('')
      const next = [...turns, { role: 'user' as const, text: t }]
      setTurns(next)
      void runTurn(next, false)
    },
    [turns, runTurn],
  )

  const proceedNow = useCallback(() => {
    if (inFlightRef.current) return
    setQuestion(null)
    void runTurn(turns, true)
  }, [turns, runTurn])

  // ── VERDICT: the deterministic engine answered — render the real Results. ──
  if (phase === 'verdict' && verdict) {
    return (
      <ResultsScreen
        input={verdict.input}
        prefetched={verdict.prefetched}
        onSave={saveProtocol}
        onAskFollowUp={(text) => {
          // Re-open the conversation with the follow-up as a new user turn.
          setVerdict(null)
          answerWith(text)
        }}
      />
    )
  }

  // ── AGENT UNAVAILABLE: fail closed to the deterministic guided intake. ─────
  if (phase === 'unavailable') {
    return (
      <Shell thumbnailUrl={thumbnailUrl} contextText={initialText}>
        <div className="gonr-card mt-6 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
            <ShieldCheck size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-black text-gonr-navy">Let&apos;s do this the careful way</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-gonr-textgray">
            I&apos;ll walk you through a few quick questions so I still get you the safest next move.
          </p>
          {onFallback ? (
            <button
              type="button"
              onClick={onFallback}
              className="gonr-gradient mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-[15px] font-extrabold text-white shadow-lg"
            >
              Answer a few questions
            </button>
          ) : null}
        </div>
        <BottomNav />
      </Shell>
    )
  }

  // ── ASKING / THINKING: the live conversation. ──────────────────────────────
  const showRead = Boolean(read && (read.stain || read.fabric))

  return (
    <Shell thumbnailUrl={thumbnailUrl} contextText={initialText}>
      {/* GONR's synthesized read — shown fast, calm, confident. */}
      <div className="mt-5 flex items-center gap-2">
        <span className="gonr-gradient grid h-7 w-7 place-items-center rounded-full text-white">
          <Sparkles size={15} aria-hidden="true" />
        </span>
        <span className="text-sm font-black text-gonr-navy">GONR</span>
      </div>

      {showRead && read ? (
        <div className="gonr-card mt-2 p-4">
          <p className="text-[15px] font-bold leading-6 text-gonr-navy">
            Here&apos;s what I think: <span className="text-gonr-hotpink">{readSentence(read)}</span>
          </p>
          {read.careRisk.trim() ? (
            <p className="mt-1 text-sm font-semibold leading-5 text-gonr-navy">{read.careRisk.trim()}</p>
          ) : null}
          <p className="mt-1 text-sm font-medium leading-5 text-gonr-textgray">
            {CONFIDENCE_NOTE[read.confidence]} I&apos;ll double-check the safest move before I tell you — I won&apos;t guess.
          </p>

          {/* "Why" — no visible complexity unless the user wants it. */}
          {knows.length > 0 || cannotKnow.length > 0 ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setWhyOpen((v) => !v)}
                aria-expanded={whyOpen}
                className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide text-gonr-hotpink"
              >
                Why I&apos;m asking
                <ChevronDown
                  size={14}
                  className={`transition-transform ${whyOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {whyOpen ? (
                <div className="mt-2 grid gap-2">
                  {knows.length > 0 ? (
                    <p className="text-xs font-semibold leading-5 text-gonr-navy">
                      <span className="font-extrabold">What I&apos;ve got:</span> {knows.join(' · ')}
                    </p>
                  ) : null}
                  {cannotKnow.length > 0 ? (
                    <p className="text-xs font-medium leading-5 text-gonr-textgray">
                      <span className="font-extrabold text-gonr-navy">Can&apos;t tell yet:</span>{' '}
                      {cannotKnow.join(' · ')}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Thinking indicator (calm, premium — not a spinner wall). */}
      {phase === 'thinking' ? (
        <div className="mt-4 flex items-center gap-3 px-1">
          <Loader2 size={18} className="animate-spin text-gonr-hotpink" aria-hidden="true" />
          <p className="text-sm font-bold text-gonr-textgray">
            {showRead ? 'Thinking about that…' : 'Reading what you gave me…'}
          </p>
        </div>
      ) : null}

      {/* The ONE sharp question + quick-reply chips. */}
      {phase === 'asking' && question ? (
        <fieldset className="mt-5">
          <legend className="text-[17px] font-extrabold leading-7 text-gonr-navy">
            {question.text}
          </legend>
          {question.options.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {question.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => answerWith(opt)}
                  className="rounded-full border border-[var(--gonr-border)] bg-white px-4 py-2 text-sm font-bold text-gonr-navy transition hover:border-gonr-hotpink/50 active:scale-[0.98]"
                >
                  {opt}
                </button>
              ))}
              {/* "Unknown / not sure" is always an acceptable answer — but only append
                  our own chip when the model's options don't already offer one, so a
                  fail-closed question that lists "Not sure" doesn't render it twice. */}
              {question.options.some((opt) => /\b(not sure|unsure|unknown)\b/i.test(opt)) ? null : (
                <button
                  type="button"
                  onClick={() => answerWith('Not sure')}
                  className="rounded-full bg-gonr-softpink px-4 py-2 text-sm font-bold text-gonr-hotpink transition active:scale-[0.98]"
                >
                  Not sure
                </button>
              )}
            </div>
          ) : null}

          {/* Free-text answer — always available, never a dead end. */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              answerWith(draft)
            }}
            className="mt-4 flex items-center gap-2 rounded-full border border-[var(--gonr-border)] bg-white px-4 py-2"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Or tell me in your own words…"
              aria-label="Answer in your own words"
              className="min-h-[40px] min-w-0 flex-1 bg-transparent text-[15px] font-medium text-gonr-navy outline-none placeholder:text-gonr-navy/40"
            />
            <button
              type="submit"
              aria-label="Send answer"
              disabled={draft.trim().length === 0}
              className="gonr-gradient grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-md disabled:opacity-40"
            >
              <Send size={16} aria-hidden="true" />
            </button>
          </form>
        </fieldset>
      ) : null}

      {/* Let the user short-circuit to the safest move at any point. */}
      {phase === 'asking' ? (
        <button
          type="button"
          onClick={proceedNow}
          className="mt-6 w-full rounded-full border border-gonr-hotpink/30 bg-white py-3 text-sm font-extrabold text-gonr-hotpink"
        >
          Skip — just give me the safest move
        </button>
      ) : null}

      {/* Honest posture note when GONR is staying cautious. */}
      {read && read.confidence === 'low' && phase === 'asking' ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--gonr-border)] bg-white p-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-gonr-navy" aria-hidden="true" />
          <p className="text-sm font-bold leading-5 text-gonr-navy">
            One more answer keeps me from guessing on your garment.
          </p>
        </div>
      ) : null}

      <BottomNav />
    </Shell>
  )
}

// ── Shared shell (identity + captured-context chip) ──────────────────────────

function Shell({
  children,
  thumbnailUrl,
  contextText,
}: {
  children: React.ReactNode
  thumbnailUrl?: string
  contextText?: string
}) {
  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-28 pt-5">
      <div className="flex items-center justify-between">
        <span className="gonr-gradient-text text-2xl font-black tracking-tight">GONR</span>
        <span className="text-xs font-extrabold uppercase tracking-wide text-gonr-textgray">
          Stain expert, on it
        </span>
      </div>

      <div className="gonr-card mt-5 flex items-center gap-3 p-3">
        {thumbnailUrl ? (
          <span
            role="img"
            aria-label="Captured photo"
            className="h-12 w-12 shrink-0 rounded-2xl bg-gonr-softpink bg-cover bg-center"
            style={{ backgroundImage: `url(${thumbnailUrl})` }}
          />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
            <Shirt size={22} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-gonr-textgray">
            What you showed me
          </p>
          <p className="truncate text-[15px] font-extrabold text-gonr-navy">
            {contextText?.trim() || 'A stain to look at'}
          </p>
        </div>
      </div>

      {children}
    </main>
  )
}
