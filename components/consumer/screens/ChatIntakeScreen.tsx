'use client'

import { useMemo, useState } from 'react'
import { Sparkles, ShieldCheck, Shirt, Send } from 'lucide-react'
import BottomNav from '@/components/consumer/BottomNav'
import {
  type SolveInput,
  type FactOption,
  type Material,
  type StainType,
  type CareStatus,
  type HeatExposure,
  type Colorfastness,
  type StainAge,
  type ItemValue,
  MATERIAL_OPTIONS,
  STAIN_OPTIONS,
  CARE_OPTIONS,
  HEAT_OPTIONS,
  COLOR_OPTIONS,
  AGE_OPTIONS,
  VALUE_OPTIONS,
  PRIOR_TREATMENTS,
  emptySolveInput,
  labelFor,
} from '@/lib/consumer-safety/solve-input'
import gateSpecJson from '@/data/predictive-intake-gate-spec.json'

// TASK-218 — Screen 3, Chat / Clarifying Intake.
//
// The conversational safety gate that stands between "Red wine on a white cotton
// shirt" and a confident answer. It reflects the facts captured so far (vision is
// a HINT — "looks like", never a verdict), then asks the clarifying questions the
// engine's intake gate REQUIRES. Questions are derived from
// data/predictive-intake-gate-spec.json (GLOBAL-001 high-risk flags + the matched
// decision family's required_disambiguation) — never hand-authored advice. The
// only copy this component owns is the question wording and chip labels (which
// come verbatim from the shared SolveInput vocabulary). It authors no stain
// chemistry, steps, prohibitions, or product claims.
//
// SAFETY GATE (GLOBAL-001): any high-risk flag that is true OR unknown forces full
// intake — the "Continue" action stays disabled until every safety question has
// been addressed. "I'm not sure" (unknown) is a valid, safe answer that satisfies
// the gate (the engine then fails closed downstream); it is never a dead end.

// ----- gate-spec typing (narrow view of the parts we read) --------------------

interface GateGlobalRule {
  id: string
  if_any_flag_true_or_unknown?: string[]
}
interface GateDecisionFamily {
  family_id: string
  display_name: string
  required_disambiguation?: string[]
}
interface GateSpec {
  global_rules: GateGlobalRule[]
  decision_families: GateDecisionFamily[]
}

const GATE_SPEC = gateSpecJson as unknown as GateSpec

// ----- fact taxonomy ----------------------------------------------------------

type FactKey =
  | 'stainType'
  | 'material'
  | 'colorfastness'
  | 'careStatus'
  | 'heatExposure'
  | 'stainAge'
  | 'itemValue'
  | 'priorTreatment'

interface QuestionConfig {
  prompt: string
  options: ReadonlyArray<FactOption<string>>
  multi?: boolean
}

// Intake question copy + the answer vocabulary (verbatim from the shared lists).
const QUESTIONS: Record<FactKey, QuestionConfig> = {
  stainType: { prompt: 'Do you know what the stain is?', options: STAIN_OPTIONS },
  material: { prompt: 'What is the fabric?', options: MATERIAL_OPTIONS },
  colorfastness: { prompt: 'Could the color run or bleed?', options: COLOR_OPTIONS },
  careStatus: { prompt: 'What does the care label say?', options: CARE_OPTIONS },
  heatExposure: { prompt: 'Has it been through any heat yet?', options: HEAT_OPTIONS },
  stainAge: { prompt: 'How fresh is the stain?', options: AGE_OPTIONS },
  itemValue: { prompt: 'How valuable is the item?', options: VALUE_OPTIONS },
  priorTreatment: {
    prompt: 'Have you already tried anything on it?',
    multi: true,
    options: PRIOR_TREATMENTS.map((t) => ({
      value: t,
      label: t.charAt(0).toUpperCase() + t.slice(1),
    })),
  },
}

// Stable intake order (a subset of these renders, depending on the matched family).
const ORDERED_KEYS: readonly FactKey[] = [
  'stainType',
  'material',
  'colorfastness',
  'careStatus',
  'heatExposure',
  'stainAge',
  'priorTreatment',
  'itemValue',
]

// GLOBAL-001 high-risk flag → the fact that answers it. Drives BOTH which
// questions are mandatory and the "force full intake" gate.
const FLAG_TO_KEY: Record<string, FactKey> = {
  fiber_is_delicate_or_specialty: 'material',
  material_is_leather_suede_aniline_alcantara: 'material',
  dye_stability_unknown_or_failed: 'colorfastness',
  stain_identity_unknown: 'stainType',
  prior_home_treatment_unknown_or_present: 'priorTreatment',
  heat_exposure_unknown_or_present: 'heatExposure',
  garment_is_luxury_claim_sensitive_or_trimmed: 'itemValue',
  chemical_incompatibility_possible: 'priorTreatment',
}

// required_disambiguation slug → fact (family-specific extra questions).
const SLUG_TO_KEY: Record<string, FactKey> = {
  fiber_material: 'material',
  shell_fiber: 'material',
  fiber_or_material: 'material',
  dye_stability: 'colorfastness',
  dye_stability_test: 'colorfastness',
  fiber_color_embroidery: 'colorfastness',
  garment_color: 'colorfastness',
  stain_identity_attempt: 'stainType',
  components_present: 'stainType',
  stain_age: 'stainAge',
  fresh_or_dried: 'stainAge',
  age_of_soil: 'stainAge',
  heat_exposure: 'heatExposure',
  fresh_or_heat_set: 'heatExposure',
  prior_treatment: 'priorTreatment',
  prior_bleach_or_home_attempt: 'priorTreatment',
  prior_washing_or_bleach: 'priorTreatment',
  prior_attempts: 'priorTreatment',
  alkaline_or_chlorine_exposure: 'priorTreatment',
  heirloom_or_claim_sensitive: 'itemValue',
  brand_value_claim_sensitivity: 'itemValue',
  customer_expectation_note: 'itemValue',
}

const NONE_VALUE = '__none__'

// Materials/values that mean "treat this with extra care" (drives the honest
// fail-closed note — NOT a verdict, just a posture signal).
const HIGH_CARE_MATERIALS: ReadonlySet<string> = new Set([
  'silk',
  'wool',
  'leather',
  'suede',
  'rayon_viscose',
  'acetate',
])

// ----- props ------------------------------------------------------------------

export interface ChatIntakeContext {
  /** Free-text summary, e.g. "Red wine on white cotton shirt". */
  text?: string
  /** Captured photo (object URL / data URL) shown in the context chip. */
  thumbnailUrl?: string
  /** Pre-filled facts from /api/scan-stain + /api/scan-label (a HINT, confirmable). */
  detected?: Partial<SolveInput>
  /** Where on the garment, carried straight through to SolveInput. */
  locationText?: string
}

/** /api/solve ambiguous-input response, rendered verbatim when present. */
export interface ChatDisambiguation {
  question: string
  options: ReadonlyArray<{ label: string; value: string }>
}

export interface ChatIntakeScreenProps {
  context?: ChatIntakeContext
  /** Optional disambiguation prompt returned by /api/solve. */
  disambiguation?: ChatDisambiguation | null
  /** Hands the assembled facts to the next step (Details / re-solve). */
  onComplete?: (input: SolveInput) => void
  className?: string
}

// ----- helpers ----------------------------------------------------------------

function detectedString(detected: Partial<SolveInput> | undefined, key: FactKey): string | undefined {
  if (!detected || key === 'priorTreatment') return undefined
  const v = detected[key]
  if (typeof v !== 'string' || v === 'unknown' || v.length === 0) return undefined
  return v
}

/** Light keyword match to pick the decision family whose extra questions apply. */
function matchFamily(haystack: string): GateDecisionFamily | undefined {
  const hay = haystack.toLowerCase()
  let best: GateDecisionFamily | undefined
  let bestScore = 0
  for (const family of GATE_SPEC.decision_families) {
    const tokens = family.family_id
      .split('-')
      .concat(family.display_name.toLowerCase().split(/[^a-z]+/))
    let score = 0
    for (const token of tokens) {
      if (token.length > 3 && hay.includes(token)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      best = family
    }
  }
  return (
    best ??
    GATE_SPEC.decision_families.find((f) => f.family_id === 'unknown-delicate-fibers') ??
    GATE_SPEC.decision_families[0]
  )
}

// ----- component --------------------------------------------------------------

export default function ChatIntakeScreen({
  context,
  disambiguation,
  onComplete,
  className,
}: ChatIntakeScreenProps) {
  const detected = context?.detected
  const [answers, setAnswers] = useState<Partial<Record<FactKey, string>>>({})
  const [prior, setPrior] = useState<string[]>(() => detected?.priorTreatment ?? [])
  const [answered, setAnswered] = useState<ReadonlySet<FactKey>>(() => new Set())
  const [disambigValue, setDisambigValue] = useState<string | null>(null)
  const [followUps, setFollowUps] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  // One-question-at-a-time cursor: this path is a CONVERSATION, not a form. We walk
  // the active questions one at a time (answered ones collapse into a chat thread)
  // so even this degraded, no-key fallback reads like talking to GONR — never a
  // wizard with a global "answer everything to continue" gate or an "X of Y" count.
  const [stepIndex, setStepIndex] = useState(0)

  // Which questions to ask: GLOBAL-001 safety set (mandatory) ∪ matched-family
  // extras ∪ any fact the vision pass already detected (so it can be confirmed).
  const { activeKeys, requiredKeys } = useMemo(() => {
    const global001 = GATE_SPEC.global_rules.find((r) => r.id === 'GLOBAL-001')
    const required = new Set<FactKey>()
    for (const flag of global001?.if_any_flag_true_or_unknown ?? []) {
      const key = FLAG_TO_KEY[flag]
      if (key) required.add(key)
    }

    const haystack = [context?.text, detected?.material, detected?.stainType]
      .filter(Boolean)
      .join(' ')
    const family = matchFamily(haystack)
    const active = new Set<FactKey>(required)
    for (const slug of family?.required_disambiguation ?? []) {
      const key = SLUG_TO_KEY[slug]
      if (key) active.add(key)
    }
    for (const key of ORDERED_KEYS) {
      if (detectedString(detected, key)) active.add(key)
    }
    if (detected?.priorTreatment && detected.priorTreatment.length > 0) active.add('priorTreatment')

    return {
      activeKeys: ORDERED_KEYS.filter((k) => active.has(k)),
      requiredKeys: ORDERED_KEYS.filter((k) => required.has(k)),
    }
  }, [context?.text, detected])

  function currentValue(key: FactKey): string {
    return answers[key] ?? detectedString(detected, key) ?? ''
  }

  function selectFact(key: FactKey, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
    setAnswered((prev) => new Set(prev).add(key))
  }

  function togglePrior(value: string) {
    if (value === NONE_VALUE) {
      setPrior([])
    } else {
      setPrior((prev) =>
        prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value],
      )
    }
    setAnswered((prev) => new Set(prev).add('priorTreatment'))
  }

  function sendFollowUp(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (text.length === 0) return
    setFollowUps((prev) => [...prev, text])
    setDraft('')
  }

  // ── Conversation steps (one at a time) ─────────────────────────────────────
  // An optional /api/solve disambiguation leads, then each active safety question.
  // Answering the current step advances the cursor; there is no global submit gate.
  type Step = { kind: 'disambig' } | { kind: 'fact'; key: FactKey }
  const steps = useMemo<Step[]>(() => {
    const out: Step[] = []
    if (disambiguation) out.push({ kind: 'disambig' })
    for (const key of activeKeys) out.push({ kind: 'fact', key })
    return out
  }, [disambiguation, activeKeys])

  const safeStepIndex = Math.min(stepIndex, steps.length)
  const currentStep: Step | null = safeStepIndex < steps.length ? steps[safeStepIndex] : null
  const conversationDone = safeStepIndex >= steps.length
  const advance = () => setStepIndex((i) => i + 1)

  function optionLabel(key: FactKey, value: string): string {
    return QUESTIONS[key].options.find((o) => o.value === value)?.label ?? value
  }
  function answerFact(key: FactKey, value: string) {
    selectFact(key, value)
    advance()
  }
  function answerDisambig(value: string) {
    setDisambigValue(value)
    advance()
  }
  // Multi-select prior-treatment can't auto-advance; this confirms the (possibly
  // empty = "nothing yet") answer and moves on. Empty is a valid, safe answer.
  function confirmPrior() {
    setAnswered((prev) => new Set(prev).add('priorTreatment'))
    advance()
  }
  function stepPrompt(step: Step): string {
    return step.kind === 'disambig'
      ? disambiguation?.question ?? ''
      : QUESTIONS[step.key].prompt
  }
  function stepAnswerLabel(step: Step): string {
    if (step.kind === 'disambig') {
      return disambiguation?.options.find((o) => o.value === disambigValue)?.label ?? '—'
    }
    if (step.key === 'priorTreatment') {
      return prior.length > 0 ? prior.map((v) => optionLabel('priorTreatment', v)).join(', ') : 'Nothing yet'
    }
    const v = currentValue(step.key)
    return v ? optionLabel(step.key, v) : '—'
  }

  const allRequiredAnswered = requiredKeys.every((k) => answered.has(k))

  // Detected-facts reflection sentence (vision is a hint, framed as "looks like").
  const detectedStainLabel = detectedString(detected, 'stainType')
    ? labelFor(STAIN_OPTIONS, detected?.stainType ?? 'unknown')
    : undefined
  const detectedMaterialLabel = detectedString(detected, 'material')
    ? labelFor(MATERIAL_OPTIONS, detected?.material ?? 'unknown')
    : undefined

  // Honest fail-closed posture: high-care fiber, prior chemistry, or heat applied.
  const showHighCareNote =
    HIGH_CARE_MATERIALS.has(currentValue('material')) ||
    prior.length > 0 ||
    (currentValue('heatExposure') !== '' && currentValue('heatExposure') !== 'none') ||
    ['valuable', 'sentimental'].includes(currentValue('itemValue'))

  function handleContinue() {
    if (!allRequiredAnswered || !onComplete) return
    const parts = [context?.text, disambigValue ?? undefined, ...followUps].filter(
      (p): p is string => Boolean(p),
    )
    const stainTypeAnswer = answers.stainType ?? detectedString(detected, 'stainType')
    const input: SolveInput = {
      ...emptySolveInput(),
      stainDescription: parts.join('. '),
      stainType:
        stainTypeAnswer && stainTypeAnswer !== 'auto' && stainTypeAnswer !== 'unknown'
          ? (stainTypeAnswer as StainType)
          : undefined,
      material: (currentValue('material') || 'unknown') as Material,
      careStatus: (currentValue('careStatus') || 'unknown') as CareStatus,
      heatExposure: (currentValue('heatExposure') || 'unknown') as HeatExposure,
      colorfastness: (currentValue('colorfastness') || 'unknown') as Colorfastness,
      stainAge: (currentValue('stainAge') || 'unknown') as StainAge,
      itemValue: (currentValue('itemValue') || 'everyday') as ItemValue,
      priorTreatment: prior,
      locationText: context?.locationText ?? '',
    }
    onComplete(input)
  }

  return (
    <main
      className={`relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-28 pt-5 ${className ?? ''}`}
    >
      {/* identity */}
      <div className="flex items-center justify-between">
        <span className="gonr-gradient-text text-2xl font-black tracking-tight">GONR</span>
        <span className="text-xs font-extrabold uppercase tracking-wide text-gonr-textgray">
          Stain expert, on it
        </span>
      </div>

      {/* captured-context chip */}
      <div className="gonr-card mt-5 flex items-center gap-3 p-3">
        {context?.thumbnailUrl ? (
          <span
            role="img"
            aria-label="Captured photo"
            className="h-12 w-12 shrink-0 rounded-2xl bg-gonr-softpink bg-cover bg-center"
            style={{ backgroundImage: `url(${context.thumbnailUrl})` }}
          />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
            <Shirt size={22} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-gonr-textgray">
            What you told us
          </p>
          <p className="truncate text-[15px] font-extrabold text-gonr-navy">
            {context?.text?.trim() || 'A stain to look at'}
          </p>
        </div>
      </div>

      {/* assistant bubble */}
      <div className="mt-5 flex items-center gap-2">
        <span className="gonr-gradient grid h-7 w-7 place-items-center rounded-full text-white">
          <Sparkles size={15} aria-hidden="true" />
        </span>
        <span className="text-sm font-black text-gonr-navy">GONR</span>
      </div>
      <div className="gonr-card mt-2 p-4">
        {detectedStainLabel || detectedMaterialLabel ? (
          <p className="text-[15px] font-bold leading-6 text-gonr-navy">
            Looks like{' '}
            {detectedStainLabel ? (
              <span className="text-gonr-hotpink">{detectedStainLabel.toLowerCase()}</span>
            ) : (
              'a stain'
            )}
            {detectedMaterialLabel ? (
              <>
                {' '}on{' '}
                <span className="text-gonr-hotpink">
                  {detectedMaterialLabel.toLowerCase()}
                </span>
              </>
            ) : null}
            . Confirm below so I don&apos;t guess.
          </p>
        ) : (
          <p className="text-[15px] font-bold leading-6 text-gonr-navy">
            Before I say anything, a couple of quick questions so I don&apos;t guess.
          </p>
        )}
        <p className="mt-1 text-sm font-medium leading-5 text-gonr-textgray">
          &ldquo;I&apos;m not sure&rdquo; is always a safe answer.
        </p>
      </div>

      {/* answered steps collapse into a calm chat thread (GONR asked → you said) */}
      {steps.slice(0, safeStepIndex).length > 0 ? (
        <div className="mt-5 grid gap-4">
          {steps.slice(0, safeStepIndex).map((step, i) => (
            <div key={i} className="grid gap-2">
              <p className="max-w-[85%] text-sm font-semibold leading-5 text-gonr-textgray">
                {stepPrompt(step)}
              </p>
              <button
                type="button"
                onClick={() => setStepIndex(i)}
                className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-gonr-softpink px-3 py-2 text-sm font-extrabold text-gonr-navy"
              >
                {stepAnswerLabel(step)}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* the ONE current question — chips, not a form; answering advances us on */}
      {currentStep ? (
        <fieldset className="mt-5">
          <legend className="text-[17px] font-extrabold leading-7 text-gonr-navy">
            {stepPrompt(currentStep)}
          </legend>
          {currentStep.kind === 'fact' &&
          !answered.has(currentStep.key) &&
          (currentStep.key === 'priorTreatment'
            ? (detected?.priorTreatment?.length ?? 0) > 0
            : Boolean(detectedString(detected, currentStep.key))) ? (
            <p className="mt-1 text-xs font-bold text-[var(--gonr-state-limited)]">
              Looks like this from the photo — tap to confirm.
            </p>
          ) : null}

          {currentStep.kind === 'disambig' && disambiguation ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {disambiguation.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={disambigValue === opt.value}
                  onClick={() => answerDisambig(opt.value)}
                  className={chipClass(disambigValue === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : currentStep.kind === 'fact' && currentStep.key === 'priorTreatment' ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={answered.has('priorTreatment') && prior.length === 0}
                  onClick={() => togglePrior(NONE_VALUE)}
                  className={chipClass(answered.has('priorTreatment') && prior.length === 0)}
                >
                  Nothing yet
                </button>
                {QUESTIONS.priorTreatment.options.map((opt) => {
                  const selected = prior.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => togglePrior(opt.value)}
                      className={chipClass(selected)}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={confirmPrior}
                className="gonr-gradient mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-extrabold text-white shadow-md"
              >
                {prior.length > 0 ? 'That’s everything' : 'Nothing else'}
              </button>
            </>
          ) : currentStep.kind === 'fact' ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {QUESTIONS[currentStep.key].options.map((opt) => {
                const key = currentStep.key
                const selected = currentValue(key) === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => answerFact(key, opt.value)}
                    className={chipClass(selected)}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          ) : null}
        </fieldset>
      ) : null}

      {/* honest fail-closed posture note (navy — never a green "safe" verdict) */}
      {showHighCareNote ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--gonr-border)] bg-white p-4">
          <ShieldCheck
            size={20}
            strokeWidth={2.25}
            className="mt-0.5 shrink-0 text-gonr-navy"
            aria-hidden="true"
          />
          <p className="text-sm font-bold leading-5 text-gonr-navy">
            This looks like a higher-care item, so I&apos;ll stay cautious and won&apos;t
            guess — better to be sure than sorry.
          </p>
        </div>
      ) : null}

      {/* follow-up thread */}
      {followUps.length > 0 ? (
        <div className="mt-6 grid gap-2">
          {followUps.map((msg, i) => (
            <p
              key={i}
              className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-gonr-softpink px-3 py-2 text-sm font-bold text-gonr-navy"
            >
              {msg}
            </p>
          ))}
        </div>
      ) : null}

      <form onSubmit={sendFollowUp} className="mt-6 flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a follow-up…"
          aria-label="Ask a follow-up"
          className="min-w-0 flex-1 rounded-full border border-[var(--gonr-border)] bg-white px-4 py-3 text-[15px] font-medium text-gonr-navy placeholder:text-gonr-navy/40 focus:border-gonr-hotpink focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send follow-up"
          disabled={draft.trim().length === 0}
          className="gonr-gradient grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-lg disabled:opacity-40"
        >
          <Send size={18} aria-hidden="true" />
        </button>
      </form>

      {/* continue — appears once we've talked through every question (no global
          "answer everything" gate, no progress counter — it just shows up when the
          conversation is done). allRequiredAnswered is a final safety assert: every
          GLOBAL-001 question is in the walk, so reaching the end satisfies it. */}
      {conversationDone && allRequiredAnswered ? (
        <button
          type="button"
          onClick={handleContinue}
          className="gonr-gradient mt-6 w-full rounded-full py-4 text-base font-black text-white shadow-lg"
        >
          See my safe next step
        </button>
      ) : null}

      <BottomNav />
    </main>
  )
}

// Shared chip styling (text-only — no forced icons per the design rules).
function chipClass(selected: boolean): string {
  return selected
    ? 'gonr-gradient rounded-full px-4 py-2 text-sm font-extrabold text-white shadow-sm'
    : 'rounded-full border border-[var(--gonr-border)] bg-white px-4 py-2 text-sm font-bold text-gonr-navy'
}
