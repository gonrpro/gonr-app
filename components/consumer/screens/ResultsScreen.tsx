'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Info,
  Loader2,
  Lock,
  MapPin,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import type { Step } from '@/lib/types'
import {
  type SolveInput,
  MATERIAL_OPTIONS,
  buildEngineSolveBody,
  labelFor,
} from '@/lib/consumer-safety/solve-input'
import { type SolveSource, resolveSourceLabel } from '@/lib/consumer-safety/solve-source'
import BottomNav from '@/components/consumer/BottomNav'
import ResultsStepList from '@/components/consumer/ResultsStepList'
import DoNotDoPanel from '@/components/consumer/DoNotDoPanel'
import DoNotDoScreen from '@/components/consumer/screens/DoNotDoScreen'
import ProductsList, { type ProductItem } from '@/components/consumer/ProductsList'
import { buildRepFacts, logDataRep, newRepId } from '@/lib/consumer-safety/data-rep'

// TASK-218 Screen 5 — RESULTS / SOLUTION.
// POSTs the assembled intake facts to the live /api/solve engine and renders the
// answer. /api/solve is a DISCRIMINATED UNION — this screen branches every shape
// (card | disambiguation_prompt | noVerifiedProtocol | 422 care-label-no-stain |
// 402 paywall | transport errors).
//
// SAFETY CONTRACT (non-negotiable, see BUILD-SPEC §5):
//  • Render ENGINE FIELDS ONLY. No authored steps, prohibitions, product claims.
//  • Consumer/home tier: render homeSolutions + materialWarnings + escalation +
//    safetyMatrix.neverDo only. Pro fields (spottingProtocol/products.professional)
//    are stripped server-side — this screen never assumes they exist.
//  • Engine order is preserved; step 1 = safe-first move at position 1. No reorder,
//    no invent, no hardcoded count (ResultsStepList renders verbatim).
//  • Do-Not-Do shows ALL items, never sliced; red severity, visually distinct.
//  • ai_fallback_disclosure / source='ai-unavailable' → render the disclosure
//    banner VERBATIM. Source line reflects the real provenance — never overstated.
//  • Green is the calm expert/safe accent only; danger states stay hot-pink/red.

// ── Engine response shape (loosely typed; the server is the source of truth) ──
// SolveSource + SOURCE_LABEL are imported from the shared provenance module so
// Details and Results render byte-identical source strings for one engine source.

interface EngineEscalation {
  when?: string
  whatToTell?: string
  specialistType?: string
}

interface FiberContext {
  fiber?: string
  careSymbols?: ReadonlyArray<string>
  warnings?: ReadonlyArray<string>
}

export interface EngineCard {
  title?: string
  stainType?: string
  homeSolutions?: ReadonlyArray<string | Step>
  spottingProtocol?: ReadonlyArray<Step>
  materialWarnings?: ReadonlyArray<string>
  safetyMatrix?: { neverDo?: ReadonlyArray<string>; fiberSensitivities?: ReadonlyArray<string> }
  escalation?: string | EngineEscalation
  products?: { consumer?: ReadonlyArray<ProductItem>; household?: ReadonlyArray<ProductItem> }
  meta?: { riskLevel?: string }
  _fiberContext?: FiberContext
}

interface DisambiguationOption {
  label: string
  value: string
}

export interface SolveResponse {
  card?: EngineCard | null
  source?: SolveSource
  stainType?: string
  viewerTier?: string
  tier?: number
  confidence?: number
  noVerifiedProtocol?: boolean
  message?: string
  _safetyBlocked?: boolean
  _aiUnavailable?: boolean
  _hardRefuse?: boolean
  ai_fallback_disclosure?: { label: string; body: string }
  disambiguation_prompt?: { question: string; options: ReadonlyArray<DisambiguationOption> }
  original_query?: { stain?: string; surface?: string }
  fiberContext?: FiberContext
  error?: string
  reason?: string
}

type LoadState = 'loading' | 'loaded' | 'error'

/**
 * A verdict the AGENTIC INTAKE route already obtained from the deterministic
 * /api/solve engine. When supplied, Results renders it directly instead of
 * re-calling the engine — the orchestrator already made the (single) engine call.
 */
export interface PrefetchedSolve {
  http: number
  data: SolveResponse
}

export interface ResultsScreenProps {
  /** Assembled facts from the intake journey. POSTed to /api/solve. */
  input: SolveInput
  /**
   * Pre-fetched engine verdict from /api/intake. When present (and the user has
   * not asked a follow-up that re-solves), render it without another engine call.
   */
  prefetched?: PrefetchedSolve | null
  /**
   * Re-open intake to correct a fact / ask a follow-up (screen 9). When omitted,
   * follow-ups re-solve in place with the refined text.
   */
  onAskFollowUp?: (text: string) => void
  /**
   * Persist this result to the user's library (screen 10). Receives the FULL engine
   * card (verdict + steps + safetyMatrix.neverDo + materialWarnings) so the saved
   * protocol_json is never steps-only (BUILD-SPEC S5). Returns the outcome so the CTA
   * can flip to "Saved just now", invite sign-in, or offer a retry. Hidden when not
   * wired. The frontier never authors the protocol — it persists the engine's card.
   */
  onSave?: (protocol: EngineCard) => Promise<'saved' | 'needs-auth' | 'error'>
  /**
   * Capture the rep outcome — whether the user followed the answer. Only shown
   * when wired (no dead taps; the persistence endpoint is the integrator's call).
   */
  onLogOutcome?: (followed: boolean) => void
}

// Risk badge — green-free. Low reads calm navy (never a green "all-clear"),
// medium amber, high hot-pink. Differentiated by label + color, not green.
const RISK_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Low risk', color: 'var(--gonr-text)', bg: 'var(--color-gonr-lightgray)' },
  medium: { label: 'Some risk', color: 'var(--gonr-state-limited)', bg: 'rgba(232,146,12,0.10)' },
  high: { label: 'High risk', color: 'var(--gonr-state-stop)', bg: 'rgba(247,10,117,0.08)' },
}

// Concrete fiber tokens, drawn from the canonical material vocabulary, used ONLY to
// detect when the engine INFERRED a fabric the user never stated (so we can flag it
// as an assumption, not a fact). Not used to author any advice.
const FABRIC_KEYWORDS: readonly string[] = [
  'cotton',
  'linen',
  'denim',
  'polyester',
  'nylon',
  'wool',
  'silk',
  'rayon',
  'viscose',
  'acetate',
  'leather',
  'suede',
  'nubuck',
]

/**
 * When the user never stated a fabric (material 'unknown') yet the engine's result
 * title names one (e.g. intake "coffee" → title "Coffee on Cotton"), the fabric was
 * INFERRED. Return that fabric word so the UI can surface it as an assumption rather
 * than presenting it as certain. A fabric the user typed in their OWN free text is
 * not inferred, so any token already present in their description is skipped.
 */
function inferredFabric(input: SolveInput, title: string | undefined): string | null {
  if (input.material !== 'unknown') return null
  const titleText = (title ?? '').toLowerCase()
  if (!titleText) return null
  const desc = input.stainDescription.toLowerCase()
  for (const fabric of FABRIC_KEYWORDS) {
    if (titleText.includes(fabric) && !desc.includes(fabric)) return fabric
  }
  return null
}

/** Human one-line of the captured context, for the result header chip. */
function contextSummary(input: SolveInput, override: string | null): string {
  const base = (override ?? input.stainDescription).trim()
  if (base) return base
  return input.material !== 'unknown' ? labelFor(MATERIAL_OPTIONS, input.material) : 'Your stain'
}

function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-[calc(7rem_+_env(safe-area-inset-bottom))] pt-5">
      <div className="flex items-center justify-between">
        <Link href="/solve-v2/solve" aria-label="Back to intake" className="text-gonr-navy/60">
          <ArrowLeft size={22} />
        </Link>
        <span className="gonr-gradient-text text-xl font-black tracking-tight">GONR</span>
        <span className="w-[22px]" aria-hidden="true" />
      </div>
      {children}
      <BottomNav />
    </main>
  )
}

function ContextChip({ text }: { text: string }) {
  return (
    <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-[var(--gonr-border)]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gonr-softpink text-gonr-hotpink">
        <Sparkles size={18} aria-hidden="true" />
      </span>
      <p className="min-w-0 truncate text-sm font-bold text-gonr-navy">{text}</p>
    </div>
  )
}

export default function ResultsScreen({
  input,
  prefetched,
  onAskFollowUp,
  onSave,
  onLogOutcome,
}: ResultsScreenProps) {
  // When the orchestrator already fetched the verdict, seed state from it so the
  // first render shows the engine answer without another call (no setState-in-effect).
  const [status, setStatus] = useState<LoadState>(() => (prefetched ? 'loaded' : 'loading'))
  const [http, setHttp] = useState(() => prefetched?.http ?? 0)
  const [data, setData] = useState<SolveResponse | null>(() => prefetched?.data ?? null)
  const [override, setOverride] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const [followUp, setFollowUp] = useState('')
  // Outcome capture (point 6/7). Lightweight, post-answer, no account required.
  const [outcome, setOutcome] = useState<boolean | null>(null)
  // Progressive disclosure (Atlas gate): the engine's full step array is split into
  // a "Do this now" head (always shown) and a collapsed "Full rescue plan" tail.
  // Default collapsed so mainstream sees save-my-shirt FIRST, details SECOND.
  const [showFullPlan, setShowFullPlan] = useState(false)
  // One rep id ties the answer-shown rep to the later outcome rep.
  const [repId] = useState(newRepId)
  const loggedAnswerRef = useRef<string | null>(null)
  // Lets the inferred-fabric "confirm or change" affordance jump the user to the
  // follow-up field so they can correct an assumed fabric without leaving Results.
  const followUpRef = useRef<HTMLInputElement>(null)
  // Save-to-library CTA lifecycle (screen 10 / S5). 'idle' until the user taps Save.
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'needs-auth' | 'error'>(
    'idle',
  )

  // Re-solve (follow-up / override) must carry the SAME assembled care/heat/prior-
  // treatment constraints as the orchestrator's first engine call — the shared
  // helper folds them into stain/surface so a follow-up never strips a do-not-wash
  // or prior-bleach constraint the verdict depends on.
  const body = useMemo(() => buildEngineSolveBody(input, { override }), [input, override])

  useEffect(() => {
    // The orchestrator already called the engine — its verdict seeded state via
    // the lazy initializers above, so there is nothing to fetch until the user
    // types a follow-up (override) that needs a fresh solve.
    if (prefetched && override === null) return

    if (!body.stain) return

    const controller = new AbortController()
    let ignore = false

    void (async () => {
      setStatus('loading')
      try {
        const res = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, lang: 'en' }),
          signal: controller.signal,
        })
        const json = (await res.json().catch(() => ({}))) as SolveResponse
        if (ignore) return
        setHttp(res.status)
        setData(json)
        setStatus('loaded')
      } catch (err) {
        if (ignore) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setHttp(0)
        setData(null)
        setStatus('error')
      }
    })()

    return () => {
      ignore = true
      controller.abort()
    }
  }, [body, nonce, prefetched, override])

  function retry() {
    setShowFullPlan(false)
    setNonce((n) => n + 1)
  }

  function resolveWith(text: string) {
    const next = text.trim()
    if (!next) return
    setOutcome(null)
    setShowFullPlan(false)
    if (onAskFollowUp) {
      onAskFollowUp(next)
      return
    }
    setOverride(next)
    setFollowUp('')
  }

  // Move focus to the follow-up field — the correction path for an assumed fabric.
  function focusFollowUp() {
    const el = followUpRef.current
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus()
  }

  // DATA-REP (points 1-5): once a real answer/verdict renders, log the rep —
  // what happened, fabric/care, prior treatment, risk snapshot, and the answer
  // shown. Fires for anon too; followed/outcome stay null until the user tells us.
  useEffect(() => {
    if (status !== 'loaded' || !data) return
    const card = data.card
    const isAnswer =
      Boolean(card) ||
      data.noVerifiedProtocol === true ||
      Boolean(data.ai_fallback_disclosure) ||
      data._hardRefuse === true
    if (!isAnswer) return
    const signature = `${repId}:${override ?? ''}:${data.source ?? ''}`
    if (loggedAnswerRef.current === signature) return
    loggedAnswerRef.current = signature

    const neverDo = card?.safetyMatrix?.neverDo ?? []
    const materialWarnings = card?.materialWarnings ?? []
    const doNotDoCount = new Set(
      [...neverDo, ...materialWarnings].map((s) => s.trim().toLowerCase()).filter(Boolean),
    ).size

    void logDataRep({
      ...buildRepFacts(input),
      correlation_id: repId,
      answer: {
        answer_shown: card?.title ?? data.message ?? data.source ?? 'guidance',
        source: data.source ?? null,
        risk_level: card?.meta?.riskLevel ?? null,
        do_not_do_count: doNotDoCount,
      },
      followed: null,
      outcome: null,
    })
  }, [status, data, input, override, repId])

  // DATA-REP (points 6-7): the post-answer outcome prompt. No account required.
  // "It worked" is the save-my-shirt win (point 7) and implies the user followed
  // the answer (point 6). "Not yet" only tells us the outcome isn't a win yet —
  // it does NOT mean they declined to follow it, so `followed` stays null rather
  // than fabricating a false. The outcome field is the metric we actually track.
  function handleOutcome(worked: boolean) {
    setOutcome(worked)
    void logDataRep({
      ...buildRepFacts(input),
      correlation_id: repId,
      followed: worked ? true : null,
      outcome: worked ? 'worked' : 'not_yet',
    })
    onLogOutcome?.(worked)
  }

  // Persist the FULL engine card to the library. The verdict + safety fields are the
  // engine's — the frontier only forwards them, never re-authors them (BUILD-SPEC S5).
  async function handleSave() {
    if (!onSave || saveState === 'saving' || saveState === 'saved') return
    const card = data?.card
    if (!card) return
    setSaveState('saving')
    try {
      setSaveState(await onSave(card))
    } catch {
      setSaveState('error')
    }
  }

  const headerContext = contextSummary(input, override)

  // ── 0. Nothing to solve yet — ask for the stain (no engine call) ───────────
  // A pre-fetched verdict always renders, even if the assembled stain text is thin.
  if (!body.stain && !prefetched) {
    return (
      <ScreenShell>
        <section className="gonr-card mt-8 p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
            <Sparkles size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-black text-gonr-navy">What’s the stain?</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-gonr-textgray">
            Tell us what happened and we’ll find the safest first move.
          </p>
        </section>
        <FollowUp
          value={followUp}
          placeholder="e.g. red wine on white cotton shirt…"
          onChange={setFollowUp}
          onSubmit={() => resolveWith(followUp)}
        />
      </ScreenShell>
    )
  }

  // ── 1. Loading ────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <ScreenShell>
        <ContextChip text={headerContext} />
        <div className="mt-8 flex flex-col items-center justify-center gap-4 py-10 text-center">
          <Loader2 size={30} className="animate-spin text-gonr-hotpink" aria-hidden="true" />
          <p className="text-base font-bold text-gonr-navy">Reading your details…</p>
          <p className="max-w-[20rem] text-sm font-medium text-gonr-textgray">
            Checking the verified library and safety rules for the safest first move.
          </p>
        </div>
      </ScreenShell>
    )
  }

  // ── 2. Transport / network failure ─────────────────────────────────────────
  if (status === 'error' && !data) {
    return (
      <ScreenShell>
        <ErrorState heading="Couldn’t reach GONR" message="Check your connection and try again." onRetry={retry} />
      </ScreenShell>
    )
  }

  const res = data ?? {}

  // ── 3. Paywall (402) ───────────────────────────────────────────────────────
  if (http === 402) {
    const limit = res.reason === 'anon_limit'
    return (
      <ScreenShell>
        <ContextChip text={headerContext} />
        <section className="gonr-card mt-6 p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
            <Lock size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-black text-gonr-navy">
            {limit ? 'You’ve used your free reads' : 'Your trial has ended'}
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-gonr-textgray">
            {limit
              ? 'Come back a little later for more free guidance, or sign in to keep going.'
              : 'Sign in to keep getting verified stain guidance.'}
          </p>
          <Link
            href="/solve-v2/profile"
            className="gonr-gradient mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 text-[15px] font-extrabold text-white shadow-lg"
          >
            Continue
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </ScreenShell>
    )
  }

  // ── 4. Care label scanned, no stain yet (422) ──────────────────────────────
  if (http === 422 && res.error === 'stain_not_identified') {
    const fiber = res.fiberContext
    return (
      <ScreenShell>
        <ContextChip text={headerContext} />
        <section className="gonr-card mt-6 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
            <ScanLine size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-black text-gonr-navy">We read the care label</h1>
          {res.message ? (
            <p className="mt-2 text-sm font-medium leading-6 text-gonr-textgray">{res.message}</p>
          ) : null}

          {fiber?.fiber ? (
            <p className="mt-4 text-sm font-bold text-gonr-navy">
              Fabric: <span className="font-extrabold">{fiber.fiber}</span>
            </p>
          ) : null}

          {fiber?.careSymbols && fiber.careSymbols.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {fiber.careSymbols.map((symbol) => (
                <span
                  key={symbol}
                  className="rounded-full bg-gonr-lightgray px-3 py-1 text-xs font-bold text-gonr-navy"
                >
                  {symbol}
                </span>
              ))}
            </div>
          ) : null}

          {fiber?.warnings && fiber.warnings.length > 0 ? (
            <DoNotDoPanel className="mt-5" heading="From the label" materialWarnings={fiber.warnings} />
          ) : null}
        </section>

        <FollowUp
          value={followUp}
          placeholder="Add the stain (e.g. red wine)…"
          onChange={setFollowUp}
          onSubmit={() => resolveWith(followUp)}
        />
      </ScreenShell>
    )
  }

  // ── 5. Other engine errors (400 / 429 / 503 / 500 / explicit error) ─────────
  if (http === 429) {
    return (
      <ScreenShell>
        <ErrorState heading="One moment" message="A lot of requests just came in. Try again in a few seconds." onRetry={retry} />
      </ScreenShell>
    )
  }
  if (http === 503 || http === 500 || (http >= 400 && (res.error || !res.card) && !res.disambiguation_prompt && !res.noVerifiedProtocol)) {
    return (
      <ScreenShell>
        <ErrorState
          heading="We couldn’t finish that"
          message={res.error === 'Stain required' ? 'Tell us what the stain is and we’ll take another look.' : (res.message || 'Something went wrong on our side. Please try again.')}
          onRetry={retry}
        />
      </ScreenShell>
    )
  }

  // ── 6. Disambiguation prompt ───────────────────────────────────────────────
  if (res.disambiguation_prompt) {
    const prompt = res.disambiguation_prompt
    return (
      <ScreenShell>
        <ContextChip text={headerContext} />
        <section className="gonr-card mt-6 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-gonr-hotpink">One quick question</p>
          <h1 className="mt-2 text-lg font-black leading-snug text-gonr-navy">{prompt.question}</h1>
          <div className="mt-4 grid gap-2">
            {prompt.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => resolveWith(option.value)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--gonr-border)] bg-white px-4 py-3 text-left text-[15px] font-bold text-gonr-navy transition hover:border-gonr-hotpink/40"
              >
                {option.label}
                <ChevronRight size={18} className="shrink-0 text-gonr-navy/40" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      </ScreenShell>
    )
  }

  // ── 7. No verified protocol ────────────────────────────────────────────────
  if (res.noVerifiedProtocol) {
    return (
      <ScreenShell>
        <ContextChip text={headerContext} />
        <section className="gonr-card mt-6 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
            <ShieldAlert size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-black text-gonr-navy">No verified protocol yet</h1>
          {res.message ? (
            <p className="mt-2 text-sm font-medium leading-6 text-gonr-textgray">{res.message}</p>
          ) : null}
          <SourceLine source={res.source} />
        </section>
        <FollowUp
          value={followUp}
          placeholder="Add a detail and we’ll re-check…"
          onChange={setFollowUp}
          onSubmit={() => resolveWith(followUp)}
        />
      </ScreenShell>
    )
  }

  // ── 8. Card result (the main path) ─────────────────────────────────────────
  const card = res.card
  // Consumer tier renders homeSolutions; spottingProtocol is stripped server-side
  // but we fall back to it defensively if a paid viewer ever lands here.
  const steps = card?.homeSolutions ?? card?.spottingProtocol ?? []
  // Progressive disclosure split (Atlas highest-priority gate): the 8-step wall is
  // too dense for free mainstream. Show the first 2-3 engine steps as "Do this now",
  // then a collapsed "Full rescue plan" accordion for the remainder. Engine order is
  // PRESERVED and NO step is dropped — startIndex keeps the tail numbered from 4.
  const PRIMARY_STEP_COUNT = 3
  const primarySteps = steps.slice(0, PRIMARY_STEP_COUNT)
  const restSteps = steps.slice(PRIMARY_STEP_COUNT)
  const risk = card?.meta?.riskLevel ? RISK_STYLE[card.meta.riskLevel] : undefined
  const escalation = card?.escalation
  const disclosure = res.ai_fallback_disclosure
  const aiUnavailable = res.source === 'ai-unavailable' || res._aiUnavailable === true

  // FRONTIER GATE (RESULTS): prohibitions must be seen BEFORE the action steps for
  // dangerous-category cards. Elevate Do-Not-Do above the steps whenever the engine
  // returns prohibitions on anything that isn't an explicitly low-risk card (high/
  // critical, or any safety-flagged card). Low-risk keeps the lower placement.
  const hasProhibitions =
    (card?.safetyMatrix?.neverDo?.length ?? 0) > 0 || (card?.materialWarnings?.length ?? 0) > 0
  const elevateProhibitions = hasProhibitions && card?.meta?.riskLevel !== 'low'
  // INFERRED-FABRIC CONFIDENCE (Atlas gate): if the title names a fabric the user
  // never stated, flag it as an assumption with a confirm/change affordance — never
  // present an inferred fabric as certain.
  const assumedFabric = inferredFabric(input, card?.title)

  return (
    <ScreenShell>
      <ContextChip text={headerContext} />

      {/* Safety-state strips — engine flags drive the severity skin + label. */}
      {res._hardRefuse ? (
        <div className="gonr-verdict-stop mt-5 flex items-start gap-3">
          <AlertTriangle size={20} className="gonr-severity-text mt-0.5 shrink-0" aria-hidden="true" />
          <p className="gonr-severity-text text-sm font-extrabold leading-6">
            Safety stop — don’t treat this yet. Follow the guidance below exactly.
          </p>
        </div>
      ) : res._safetyBlocked ? (
        <div className="gonr-verdict-caution mt-5 flex items-start gap-3">
          <ShieldAlert size={20} className="gonr-severity-text mt-0.5 shrink-0" aria-hidden="true" />
          <p className="gonr-severity-text text-sm font-extrabold leading-6">
            Safety-adjusted guidance — we replaced a riskier step with a safer one.
          </p>
        </div>
      ) : null}

      {/* Honest AI-fallback disclosure — rendered VERBATIM from the engine. */}
      {disclosure ? (
        <div className="mt-5 rounded-2xl border border-[var(--gonr-border)] bg-gonr-lightgray px-4 py-3">
          <div className="flex items-start gap-2">
            <Info size={18} className="mt-0.5 shrink-0 text-gonr-textgray" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-gonr-navy">{disclosure.label}</p>
              <p className="mt-1 text-sm font-medium leading-6 text-gonr-textgray">{disclosure.body}</p>
            </div>
          </div>
        </div>
      ) : aiUnavailable ? (
        <div className="mt-5 rounded-2xl border border-[var(--gonr-border)] bg-gonr-lightgray px-4 py-3">
          <div className="flex items-start gap-2">
            <Info size={18} className="mt-0.5 shrink-0 text-gonr-textgray" aria-hidden="true" />
            <p className="text-sm font-medium leading-6 text-gonr-textgray">
              This is general guidance, not stain-specific — our AI assist is temporarily unavailable.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black leading-tight text-gonr-navy">
          {card?.title ?? 'Your rescue plan'}
        </h1>
        {risk ? (
          <span
            className="shrink-0 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide"
            style={{ color: risk.color, background: risk.bg }}
          >
            {risk.label}
          </span>
        ) : null}
      </div>

      {/* Inferred-fabric confidence — the fabric in the title was assumed, not
          confirmed by the user; surface it with a confirm/change affordance. */}
      {assumedFabric ? (
        <InferredFabricNote fabric={assumedFabric} onConfirm={focusFollowUp} />
      ) : null}

      {/* Do-Not-Do (elevated) — for dangerous-category cards the prohibitions render
          ABOVE the action steps so the user sees what NOT to do before they can act. */}
      {elevateProhibitions ? (
        <DoNotDoScreen
          className="mt-6"
          neverDo={card?.safetyMatrix?.neverDo}
          materialWarnings={card?.materialWarnings}
          collapsible
        />
      ) : null}

      {/* Engine steps, verbatim + in order, progressively disclosed. "Do this now"
          carries the first 2-3 safe-first moves (step 1 stays at position 1); the
          rest live in a collapsed "Full rescue plan" accordion. No step is dropped. */}
      {steps.length > 0 ? (
        <div className="gonr-card mt-4 p-5">
          <ResultsStepList steps={primarySteps} heading="Do this now" />

          {restSteps.length > 0 ? (
            <div className="mt-4 border-t border-[var(--gonr-border)] pt-4">
              <button
                type="button"
                onClick={() => setShowFullPlan((open) => !open)}
                aria-expanded={showFullPlan}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="text-sm font-extrabold text-gonr-navy">
                  {showFullPlan
                    ? 'Full rescue plan'
                    : `Full rescue plan — ${restSteps.length} more ${restSteps.length === 1 ? 'step' : 'steps'}`}
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-gonr-navy/40 transition-transform duration-200 ${showFullPlan ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {showFullPlan ? (
                <ResultsStepList className="mt-4" steps={restSteps} startIndex={PRIMARY_STEP_COUNT} />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Do-Not-Do (low-risk placement) — highest-stakes surface. ALL items, never
          sliced, red severity. Sits below the steps only for explicitly low-risk cards. */}
      {!elevateProhibitions ? (
        <DoNotDoScreen
          className="mt-6"
          neverDo={card?.safetyMatrix?.neverDo}
          materialWarnings={card?.materialWarnings}
          collapsible
        />
      ) : null}

      {/* Structured escalation / take-it-to-a-pro handoff. */}
      {escalation ? <Escalation escalation={escalation} /> : null}

      {/* Consumer/household products only (server strips professional). */}
      <ProductsList
        className="mt-6"
        consumer={card?.products?.consumer}
        household={card?.products?.household}
      />

      <SourceLine source={res.source} />

      {/* Post-answer Save + outcome capture — offered AFTER the answer, never a
          signup wall. Outcome is the quiet data rep (points 6-7); it logs without
          an account. Save is shown only when the integrator wires persistence. */}
      <div className="mt-6 grid gap-3">
        {onSave ? (
          saveState === 'needs-auth' ? (
            <Link
              href="/solve-v2/profile"
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-gonr-hotpink/30 bg-white px-5 text-[15px] font-extrabold text-gonr-hotpink"
            >
              <Bookmark size={18} aria-hidden="true" />
              Sign in to save
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saveState === 'saving' || saveState === 'saved'}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-gonr-hotpink/30 bg-white px-5 text-[15px] font-extrabold text-gonr-hotpink disabled:opacity-70"
            >
              {saveState === 'saved' ? (
                <>
                  <BookmarkCheck size={18} aria-hidden="true" />
                  Saved just now
                </>
              ) : saveState === 'saving' ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : saveState === 'error' ? (
                <>
                  <Bookmark size={18} aria-hidden="true" />
                  Couldn’t save — tap to retry
                </>
              ) : (
                <>
                  <Bookmark size={18} aria-hidden="true" />
                  Save to My Library
                </>
              )}
            </button>
          )
        ) : null}
        <div className="rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-[var(--gonr-border)]">
          {outcome === null ? (
            <>
              <p className="text-xs font-extrabold uppercase tracking-wide text-gonr-textgray">
                Did this help?
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOutcome(true)}
                  className="min-h-[44px] rounded-full bg-gonr-softpink px-4 text-sm font-extrabold text-gonr-hotpink"
                >
                  It worked
                </button>
                <button
                  type="button"
                  onClick={() => handleOutcome(false)}
                  className="min-h-[44px] rounded-full border border-[var(--gonr-border)] bg-white px-4 text-sm font-extrabold text-gonr-navy"
                >
                  Not yet
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm font-bold leading-6 text-gonr-navy">
              {outcome
                ? 'Glad it helped — thanks for letting us know.'
                : 'Thanks — noted. If the stain is stubborn, a professional cleaner is the safest next step.'}
            </p>
          )}
        </div>
      </div>

      <FollowUp
        inputRef={followUpRef}
        value={followUp}
        placeholder="Ask a follow-up…"
        onChange={setFollowUp}
        onSubmit={() => resolveWith(followUp)}
      />
    </ScreenShell>
  )
}

function InferredFabricNote({
  fabric,
  onConfirm,
}: {
  fabric: string
  onConfirm: () => void
}) {
  const label = fabric.charAt(0).toUpperCase() + fabric.slice(1)
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-[var(--gonr-border)] bg-gonr-lightgray px-4 py-3">
      <HelpCircle
        size={18}
        className="mt-0.5 shrink-0"
        style={{ color: 'var(--gonr-state-limited)' }}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-bold leading-5 text-gonr-navy">We assumed the fabric is {label}.</p>
        <p className="mt-0.5 text-[13px] font-medium leading-5 text-gonr-textgray">
          You didn’t confirm the material, so this is our best read. If it’s not {label}, tell us so we
          keep the advice safe.
        </p>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-2 text-[13px] font-extrabold text-gonr-hotpink underline-offset-2 hover:underline"
        >
          Confirm or change fabric
        </button>
      </div>
    </div>
  )
}

function SourceLine({ source }: { source?: SolveSource }) {
  // Fail-safe: an engine source the UI has not mapped must NOT crash the result.
  const entry = resolveSourceLabel(source)
  if (!entry) return null
  return (
    <p className="mt-6 text-center text-xs font-bold text-gonr-textgray">
      Source: {entry.label}
    </p>
  )
}

function Escalation({ escalation }: { escalation: string | EngineEscalation }) {
  if (typeof escalation === 'string') {
    const text = escalation.trim()
    if (!text) return null
    return (
      <section className="gonr-card mt-6 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
            <MapPin size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide text-gonr-textgray">When to see a pro</p>
            <p className="mt-1 text-[15px] font-semibold leading-6 text-gonr-navy">{text}</p>
          </div>
        </div>
      </section>
    )
  }

  const { when, whatToTell, specialistType } = escalation
  if (!when && !whatToTell && !specialistType) return null
  return (
    <section className="gonr-card mt-6 p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
          <MapPin size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wide text-gonr-textgray">When to see a pro</p>
          {when ? <p className="mt-1 text-[15px] font-semibold leading-6 text-gonr-navy">{when}</p> : null}
          {whatToTell ? (
            <p className="mt-2 text-sm font-medium leading-6 text-gonr-textgray">
              <span className="font-extrabold text-gonr-navy">Tell them:</span> {whatToTell}
            </p>
          ) : null}
          {specialistType ? (
            <p className="mt-2 text-sm font-medium leading-6 text-gonr-textgray">
              <span className="font-extrabold text-gonr-navy">Who:</span> {specialistType}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function ErrorState({
  heading,
  message,
  onRetry,
}: {
  heading: string
  message: string
  onRetry: () => void
}) {
  return (
    <section className="gonr-card mt-8 p-6 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
        <AlertTriangle size={24} aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-xl font-black text-gonr-navy">{heading}</h1>
      <p className="mt-2 text-sm font-medium leading-6 text-gonr-textgray">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="gonr-gradient mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-extrabold text-white shadow-lg"
      >
        <RefreshCw size={18} aria-hidden="true" />
        Try again
      </button>
    </section>
  )
}

function FollowUp({
  value,
  placeholder,
  onChange,
  onSubmit,
  inputRef,
}: {
  value: string
  placeholder: string
  onChange: (value: string) => void
  onSubmit: () => void
  inputRef?: React.Ref<HTMLInputElement>
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="mt-6 flex items-center gap-2 rounded-full border border-[var(--gonr-border)] bg-white px-4 py-2"
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[40px] flex-1 bg-transparent text-[15px] font-medium text-gonr-navy outline-none placeholder:text-gonr-textgray"
      />
      <button
        type="submit"
        aria-label="Send follow-up"
        disabled={value.trim().length === 0}
        className="gonr-gradient grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-md disabled:opacity-40"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </form>
  )
}
