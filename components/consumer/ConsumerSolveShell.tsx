'use client'

import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, Clipboard, MapPin, ShieldCheck, Shirt, XCircle } from 'lucide-react'
import { CONSUMER_CARDS_PHASE0 } from '@/lib/consumer-cards/cards'
import { classify } from '@/lib/consumer-safety/classifier'
import { extractConsumerDisplayQuery, inferColorfastnessFromText } from '@/lib/consumer-safety/display-context'
import { inferStainType } from '@/lib/consumer-safety/helpers'
import { inferMaterialFromDescription } from '@/lib/solve/material-inference'
import {
  buildSolveInputFrom,
  deriveFollowups,
  effectiveColorfastness,
  effectiveMaterial,
  type FollowupField,
  type SolveFields,
} from '@/lib/consumer-safety/progressive'
import type {
  CareStatus,
  Colorfastness,
  HeatExposure,
  ItemValue,
  Material,
  SafetyVerdict,
  StainAge,
  StainType,
  VerdictLevel,
} from '@/lib/consumer-safety/types'

const MATERIAL_OPTIONS: Array<{ value: Material; label: string }> = [
  { value: 'cotton', label: 'Cotton' },
  { value: 'linen', label: 'Linen' },
  { value: 'denim', label: 'Denim' },
  { value: 'polyester', label: 'Polyester' },
  { value: 'nylon', label: 'Nylon' },
  { value: 'wool', label: 'Wool' },
  { value: 'silk', label: 'Silk' },
  { value: 'rayon_viscose', label: 'Rayon / viscose' },
  { value: 'acetate', label: 'Acetate lining' },
  { value: 'leather', label: 'Leather' },
  { value: 'suede', label: 'Suede / nubuck' },
  { value: 'blend', label: 'Blend' },
  { value: 'unknown', label: 'I do not know' },
]

const STAIN_OPTIONS: Array<{ value: StainType | 'auto'; label: string }> = [
  { value: 'auto', label: 'Let GONR decide' },
  { value: 'protein', label: 'Blood / sweat / dairy' },
  { value: 'tannin', label: 'Coffee / wine / tea / juice' },
  { value: 'oil_grease', label: 'Oil / grease' },
  { value: 'dye', label: 'Dye transfer' },
  { value: 'ink', label: 'Ink / marker' },
  { value: 'rust_mineral', label: 'Rust / mineral' },
  { value: 'particulate', label: 'Mud / soil' },
  { value: 'mixed_unknown', label: 'Mixed stain' },
  { value: 'unknown', label: 'Unknown stain' },
]

const CARE_OPTIONS: Array<{ value: CareStatus; label: string }> = [
  { value: 'machine_washable', label: 'Machine washable' },
  { value: 'hand_wash', label: 'Hand wash' },
  { value: 'dry_clean_only', label: 'Dry clean only' },
  { value: 'unknown', label: 'I do not know' },
]

const HEAT_OPTIONS: Array<{ value: HeatExposure; label: string }> = [
  { value: 'none', label: 'No heat' },
  { value: 'warm_hot_wash', label: 'Warm or hot water' },
  { value: 'machine_dried', label: 'Machine dryer' },
  { value: 'ironed', label: 'Ironed' },
  { value: 'unknown', label: 'I do not know' },
]

const COLOR_OPTIONS: Array<{ value: Colorfastness; label: string }> = [
  { value: 'colorfast', label: 'Colorfast / white' },
  { value: 'prone_to_bleed', label: 'Dark, bright, or might bleed' },
  { value: 'unknown', label: 'I do not know' },
]

const AGE_OPTIONS: Array<{ value: StainAge; label: string }> = [
  { value: 'fresh', label: 'Fresh' },
  { value: 'hours_old', label: 'Hours old' },
  { value: 'set_in', label: 'Set in / already washed' },
  { value: 'unknown', label: 'I do not know' },
]

const VALUE_OPTIONS: Array<{ value: ItemValue; label: string }> = [
  { value: 'everyday', label: 'Everyday' },
  { value: 'valuable', label: 'Expensive' },
  { value: 'sentimental', label: 'Sentimental' },
  { value: 'unknown', label: 'I do not know' },
]

const optionLabel = <T extends string>(options: Array<{ value: T; label: string }>, value: T) =>
  options.find((option) => option.value === value)?.label ?? value

const PRIOR_TREATMENTS = ['water', 'detergent', 'bleach', 'ammonia', 'acetone', 'enzyme detergent', 'peroxide', 'baking soda']

const EXAMPLE_CHIPS = [
  'red wine on white cotton shirt',
  'grease on silk blouse',
  'ink on wool coat',
  'bleach and ammonia were already used',
]

const VERDICT_COPY: Record<VerdictLevel, { label: string; tone: string; color: string; bg: string; Icon: typeof ShieldCheck }> = {
  diy_safe: {
    label: 'First move permitted',
    tone: 'A reviewed card supports one constrained first move for these facts.',
    color: '#C2410C',
    bg: '#FFF7ED',
    Icon: CheckCircle2,
  },
  diy_with_constraints: {
    label: 'DIY only with constraints',
    tone: 'A limited first move is available, but the warnings matter.',
    color: '#9A5F00',
    bg: '#FFF4DA',
    Icon: ShieldCheck,
  },
  stop_use_pro: {
    label: 'Stop and use a pro',
    tone: 'Do not treat this at home yet.',
    color: '#B84525',
    bg: '#FDECE6',
    Icon: AlertTriangle,
  },
  do_not_attempt: {
    label: 'Do not attempt',
    tone: 'Stop now and avoid adding products.',
    color: '#9F1D1D',
    bg: '#FBE4E4',
    Icon: XCircle,
  },
}

const FAMILY_LESSONS: Record<StainType, { name: string; behavior: string; risk: string }> = {
  protein: {
    name: 'Protein',
    behavior: 'Protein stains come from things like blood, sweat, milk, egg, and some body fluids. Heat can cook them into the fiber.',
    risk: 'Keep protein stains cold until they are gone. Hot water, dryers, and irons are the big mistakes.',
  },
  tannin: {
    name: 'Tannin',
    behavior: 'Tannin stains come from coffee, tea, wine, juice, tomato, and many plant-based spills. They can darken when the wrong chemistry hits them.',
    risk: 'Avoid ammonia, baking soda, alkaline cleaners, and heat unless a reviewed card specifically allows the next step.',
  },
  oil_grease: {
    name: 'Oil / grease',
    behavior: 'Oil stains spread into fibers and can hide after the fabric looks dry. Heat can make the remaining oil harder to release.',
    risk: 'Do not rub oil deeper or use household solvents. Air dry until the mark is truly gone.',
  },
  dye: {
    name: 'Dye transfer',
    behavior: 'Dye problems are color movement, not normal soil. The stain may be the garment dye itself moving or outside dye attaching.',
    risk: 'Do not scrub, bleach, or chase it with random products. Dye work belongs in the Pro lane.',
  },
  ink: {
    name: 'Ink',
    behavior: 'Ink can migrate fast and turn a small mark into a ring if it is rubbed or flooded.',
    risk: 'Do not scrub or apply solvent unless a source-backed consumer card says it is safe for that exact fabric.',
  },
  rust_mineral: {
    name: 'Rust / mineral',
    behavior: 'Rust and mineral stains usually need controlled acidic chemistry, which can damage fibers, dyes, trims, and finishes.',
    risk: 'Do not use chlorine bleach or strong acids at home. This is usually a referral result.',
  },
  particulate: {
    name: 'Mud / soil',
    behavior: 'Particulate stains are physical soil sitting in and on the fibers. Wet rubbing can smear particles deeper.',
    risk: 'Let mud dry before brushing loose soil when the fabric allows it. Stop if the fabric is delicate or dry-clean-only.',
  },
  mixed_unknown: {
    name: 'Mixed / unknown',
    behavior: 'Mixed stains can contain protein, tannin, oil, dye, or minerals at the same time. One wrong move can set one part while chasing another.',
    risk: 'GONR treats mixed or unclear stains conservatively until the risk facts are known.',
  },
  unknown: {
    name: 'Unknown',
    behavior: 'Unknown stains are risky because the right first move depends on what the stain is and what the garment can tolerate.',
    risk: 'When the facts are missing, GONR protects the garment first and avoids treatment steps.',
  },
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#283241]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="min-h-[44px] w-full min-w-0 rounded-[8px] border border-[#DDDFD8] bg-white px-3 text-[15px] font-medium text-[#1F2937] outline-none transition focus:border-[#E11D48]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function ConsumerSolveShell() {
  const resultRef = useRef<HTMLDivElement>(null)
  const [description, setDescription] = useState('')
  const [stainType, setStainType] = useState<StainType | 'auto'>('auto')
  const [material, setMaterial] = useState<Material>('unknown')
  const [careStatus, setCareStatus] = useState<CareStatus>('unknown')
  const [heatExposure, setHeatExposure] = useState<HeatExposure>('unknown')
  const [colorfastness, setColorfastness] = useState<Colorfastness>('unknown')
  const [stainAge, setStainAge] = useState<StainAge>('unknown')
  const [itemValue, setItemValue] = useState<ItemValue>('everyday')
  const [priorTreatment, setPriorTreatment] = useState<string[]>([])
  const [locationText, setLocationText] = useState('')
  const [materialLocked, setMaterialLocked] = useState(false)
  const [colorfastnessLocked, setColorfastnessLocked] = useState(false)
  const [verdict, setVerdict] = useState<SafetyVerdict | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [copied, setCopied] = useState(false)
  // TASK-228 — progressive intake: lead with "what happened?", reveal the full
  // 8-field form only on demand.
  const [showDetails, setShowDetails] = useState(false)

  const renderedCard = useMemo(() => {
    if (!verdict?.card) return null
    return CONSUMER_CARDS_PHASE0.find((card) => card.id === verdict.card) ?? null
  }, [verdict])
  const candidateCard = useMemo(() => {
    if (!verdict?.candidateCard) return null
    return CONSUMER_CARDS_PHASE0.find((card) => card.id === verdict.candidateCard) ?? null
  }, [verdict])
  const displayQuery = useMemo(() => extractConsumerDisplayQuery(description), [description])
  const resultFamily = useMemo<StainType>(() => inferStainType(description, stainType === 'auto' ? undefined : stainType), [description, stainType])
  const familyLesson = FAMILY_LESSONS[resultFamily]
  const collectedFacts = useMemo(
    () => [
      ...(displayQuery ? [{ label: 'You said', value: displayQuery }] : []),
      { label: 'Family', value: familyLesson.name },
      { label: 'Fabric', value: optionLabel(MATERIAL_OPTIONS, material) },
      { label: 'Care', value: optionLabel(CARE_OPTIONS, careStatus) },
      { label: 'Color', value: optionLabel(COLOR_OPTIONS, colorfastness) },
      { label: 'Heat', value: optionLabel(HEAT_OPTIONS, heatExposure) },
      { label: 'Age', value: optionLabel(AGE_OPTIONS, stainAge) },
    ],
    [careStatus, colorfastness, displayQuery, familyLesson.name, heatExposure, material, stainAge],
  )

  function clearStaleVerdict() {
    setVerdict(null)
    setShowSummary(false)
    setCopied(false)
  }

  function updateDescriptionFromText(nextDescription: string) {
    setDescription(nextDescription)
    if (!materialLocked) setMaterial(inferMaterialFromDescription(nextDescription, 'unknown'))
    if (!colorfastnessLocked) setColorfastness(inferColorfastnessFromText(nextDescription, 'unknown'))
  }

  // Assemble the current form state (plus any override) into engine fields.
  const gatherFields = useCallback(
    (overrides: Partial<SolveFields> = {}): SolveFields => ({
      description,
      stainType,
      material,
      careStatus,
      heatExposure,
      colorfastness,
      stainAge,
      itemValue,
      priorTreatment,
      locationText,
      ...overrides,
    }),
    [description, stainType, material, careStatus, heatExposure, colorfastness, stainAge, itemValue, priorTreatment, locationText],
  )

  // Run the synchronous classifier and reflect any text-inferred facts back
  // into the form so the details panel + follow-ups stay consistent.
  const runClassify = useCallback(
    (fields: SolveFields): SafetyVerdict => {
      const inferredMaterial = effectiveMaterial(fields)
      const inferredColorfastness = effectiveColorfastness(fields)
      if (inferredMaterial !== material) setMaterial(inferredMaterial)
      if (inferredColorfastness !== colorfastness) setColorfastness(inferredColorfastness)
      const next = classify(buildSolveInputFrom(fields))
      setVerdict(next)
      setCopied(false)
      return next
    },
    [material, colorfastness],
  )

  // Live-update a structured field: set it and (once a verdict is showing)
  // re-classify immediately so the answer sharpens the result with no resubmit.
  function onSelect<K extends keyof SolveFields>(field: K, setter: (value: SolveFields[K]) => void) {
    return (value: SolveFields[K]) => {
      setter(value)
      if (verdict) runClassify(gatherFields({ [field]: value } as Partial<SolveFields>))
    }
  }

  const FIELD_SETTERS: Record<FollowupField, (value: string) => void> = {
    material: (v) => {
      setMaterialLocked(true)
      setMaterial(v as Material)
    },
    colorfastness: (v) => {
      setColorfastnessLocked(true)
      setColorfastness(v as Colorfastness)
    },
    careStatus: (v) => setCareStatus(v as CareStatus),
    stainAge: (v) => setStainAge(v as StainAge),
    heatExposure: (v) => setHeatExposure(v as HeatExposure),
  }

  // Answer one progressive follow-up: set the field and re-classify live so the
  // verdict sharpens immediately (no resubmit, no waiting).
  function answerFollowup(field: FollowupField, value: string) {
    FIELD_SETTERS[field](value)
    if (verdict) runClassify(gatherFields({ [field]: value } as Partial<SolveFields>))
  }

  function togglePriorTreatment(value: string) {
    const next = priorTreatment.includes(value) ? priorTreatment.filter((item) => item !== value) : [...priorTreatment, value]
    setPriorTreatment(next)
    if (verdict) runClassify(gatherFields({ priorTreatment: next }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = runClassify(gatherFields())
    setShowSummary(next.requiresReferral)
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const followups = verdict ? deriveFollowups(verdict, gatherFields()) : []

  async function copySummary() {
    if (!verdict) return
    try {
      await navigator.clipboard.writeText(verdict.referral.handoffSummary)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const theme = verdict ? VERDICT_COPY[verdict.verdict] : null
  const ResultIcon = theme?.Icon ?? ShieldCheck
  const displayedAvoid =
    verdict?.verdict === 'diy_safe' || verdict?.verdict === 'diy_with_constraints'
      ? (verdict.constraints && verdict.constraints.length > 0 ? verdict.constraints : verdict.avoid).slice(0, 3)
      : (verdict?.avoid ?? []).slice(0, 4)

  return (
    <div className="min-h-[calc(100dvh-122px)] w-full max-w-full overflow-x-hidden bg-[#F5F7FA] text-[#2D3748] lg:min-h-[calc(100dvh-62px)]">
      <div className="mx-auto grid w-full max-w-[720px] min-w-0 gap-5 px-1 py-5 sm:px-3 lg:max-w-[1280px] lg:grid-cols-[minmax(380px,0.88fr)_minmax(420px,1.12fr)] lg:items-start lg:gap-6 lg:px-0 lg:py-6 xl:grid-cols-[minmax(430px,0.9fr)_minmax(520px,1.1fr)]">
        <section className="grid w-full max-w-full min-w-0 gap-4 overflow-hidden rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-[86px] lg:max-h-[calc(100dvh-108px)] lg:overflow-auto lg:p-6">
          <div className="grid grid-cols-[44px_minmax(0,1fr)] items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#FFF1F2] text-[#E11D48]">
              <Shirt size={24} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight text-[#2D3748]">Tell GONR what happened</h1>
              <p className="mt-1 break-words text-sm leading-6 text-[#718096]">Answer what you know. Unknown is better than guessing.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid min-w-0 gap-4">
            <label className="grid gap-2 text-sm font-semibold text-[#283241]">
              What happened?
              <textarea
                value={description}
                onChange={(event) => {
                  clearStaleVerdict()
                  updateDescriptionFromText(event.target.value)
                }}
                placeholder="Example: red wine on a white cotton shirt, already blotted with water"
                rows={4}
                className="min-h-[118px] w-full min-w-0 rounded-[12px] border border-[#E5E7EB] bg-white px-3 py-3 text-[16px] leading-6 text-[#2D3748] outline-none transition placeholder:text-[#8A94A6] focus:border-[#E11D48]"
                required
              />
            </label>

            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              {EXAMPLE_CHIPS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    clearStaleVerdict()
                    setMaterialLocked(false)
                    setColorfastnessLocked(false)
                    setDescription(example)
                    setMaterial(inferMaterialFromDescription(example, 'unknown'))
                    setColorfastness(inferColorfastnessFromText(example, 'unknown'))
                  }}
                  className="min-h-[44px] w-full max-w-full whitespace-normal break-words rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold leading-5 text-[#4A5568] transition hover:border-[#E11D48] hover:text-[#BE123C]"
                >
                  {example}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowDetails((open) => !open)}
              aria-expanded={showDetails}
              className="flex min-h-[44px] items-center justify-between gap-2 rounded-[8px] border border-dashed border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#4A5568] transition hover:border-[#E11D48] hover:text-[#BE123C]"
            >
              <span>Add details (optional) — fabric, care label, color, age</span>
              <span aria-hidden="true">{showDetails ? '−' : '+'}</span>
            </button>

            {showDetails ? (
            <>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="What caused it?" value={stainType} options={STAIN_OPTIONS} onChange={onSelect('stainType', setStainType)} />
              <SelectField
                label="What is it on?"
                value={material}
                options={MATERIAL_OPTIONS}
                onChange={onSelect('material', (value) => {
                  setMaterialLocked(true)
                  setMaterial(value)
                })}
              />
              <SelectField label="Care label says" value={careStatus} options={CARE_OPTIONS} onChange={onSelect('careStatus', setCareStatus)} />
              <SelectField label="Has heat touched it?" value={heatExposure} options={HEAT_OPTIONS} onChange={onSelect('heatExposure', setHeatExposure)} />
              <SelectField
                label="Color risk"
                value={colorfastness}
                options={COLOR_OPTIONS}
                onChange={onSelect('colorfastness', (value) => {
                  setColorfastnessLocked(true)
                  setColorfastness(value)
                })}
              />
              <SelectField label="How old is it?" value={stainAge} options={AGE_OPTIONS} onChange={onSelect('stainAge', setStainAge)} />
              <SelectField label="Item risk" value={itemValue} options={VALUE_OPTIONS} onChange={onSelect('itemValue', setItemValue)} />
              <label className="grid gap-2 text-sm font-semibold text-[#283241]">
                Cleaner location
                <input
                  value={locationText}
                  onChange={(event) => {
                    clearStaleVerdict()
                    setLocationText(event.target.value)
                  }}
                  placeholder="City or ZIP"
                  className="min-h-[44px] w-full min-w-0 rounded-[8px] border border-[#DDDFD8] bg-white px-3 text-[15px] font-medium text-[#1F2937] outline-none transition placeholder:text-[#8A9288] focus:border-[#E11D48]"
                />
              </label>
            </div>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-[#283241]">What did you already try?</legend>
              <div className="flex flex-wrap gap-2">
                {PRIOR_TREATMENTS.map((item) => {
                  const selected = priorTreatment.includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => togglePriorTreatment(item)}
                      aria-pressed={selected}
                      className={`min-h-[44px] max-w-full whitespace-normal break-words rounded-full border px-3 py-2 text-sm font-semibold leading-5 transition ${
                        selected
                          ? 'border-[#E11D48] bg-[#FFF1F2] text-[#BE123C]'
                          : 'border-[#E5E7EB] bg-white text-[#4A5568] hover:border-[#E11D48]'
                      }`}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            </>
            ) : null}

            <button
              type="submit"
              className="flex min-h-[50px] items-center justify-center gap-2 rounded-[12px] bg-[#E11D48] px-4 text-[16px] font-bold text-white shadow-sm transition hover:bg-[#BE123C] focus:outline-none focus:ring-2 focus:ring-[#FB7185] focus:ring-offset-2"
            >
              <ShieldCheck size={20} aria-hidden="true" />
              Check safe first move
            </button>
          </form>
        </section>

        {verdict && theme ? (
          <section ref={resultRef} className="grid min-w-0 gap-4" data-testid="consumer-result">
            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px]" style={{ background: theme.bg, color: theme.color }}>
                  <ResultIcon size={26} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-[#667085]">Verdict</p>
                  <h2 className="mt-1 text-2xl font-bold leading-tight" style={{ color: theme.color }}>
                    {theme.label}
                  </h2>
                  <p className="mt-2 text-[15px] leading-6 text-[#475569]">{theme.tone}</p>
                  {displayQuery ? (
                    <p className="mt-2 text-sm font-semibold leading-5 text-[#667085]">
                      For: {displayQuery}
                    </p>
                  ) : null}
                </div>
              </div>

              {followups.length > 0 ? (
                <div className="mt-4 rounded-[12px] border border-[#FED7AA] bg-[#FFF7ED] p-3">
                  <p className="text-xs font-bold uppercase text-[#C2410C]">Answer to unlock the exact steps</p>
                  <p className="mt-1 text-sm leading-5 text-[#7C5414]">You already have a safe first move below. A couple quick taps sharpen it.</p>
                  <div className="mt-3 grid gap-3">
                    {followups.map((fu) => (
                      <div key={fu.field} className="grid gap-2">
                        <p className="text-sm font-semibold text-[#283241]">{fu.question}</p>
                        <div className="flex flex-wrap gap-2">
                          {fu.options.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => answerFollowup(fu.field, opt.value)}
                              className="min-h-[40px] rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-semibold text-[#4A5568] transition hover:border-[#E11D48] hover:text-[#BE123C]"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3">
                <div className="rounded-[12px] border border-[#E5E7EB] bg-[#F5F7FA] p-3">
                  <p className="text-xs font-bold uppercase text-[#667085]">First action</p>
                  <p className="mt-1 text-[17px] font-bold leading-6 text-[#16202D]">{verdict.safeFirstMove}</p>
                </div>

                <div className="grid gap-2">
                  <p className="text-xs font-bold uppercase text-[#667085]">Do not do</p>
                  <ul className="grid gap-2">
                    {displayedAvoid.map((item) => (
                      <li key={item} className="rounded-[12px] border border-[#F8CACA] bg-[#FEF2F2] px-3 py-2 text-sm font-semibold leading-5 text-[#991B1B]">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-1">
                  <p className="text-xs font-bold uppercase text-[#667085]">Why GONR thinks this</p>
                  <ul className="grid gap-1">
                    {verdict.reasons.slice(0, 4).map((reason) => (
                      <li key={reason} className="text-[15px] leading-6 text-[#475569]">
                        {reason}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm font-semibold text-[#667085]">
                    Confidence: {verdict.confidence} · Filter: {verdict.safetyFilterVersion}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[12px] border border-[#FED7AA] bg-[#FFF7ED] p-4 shadow-sm sm:p-5">
              <p className="text-xs font-bold uppercase text-[#C2410C]">Stain family lesson</p>
              <h3 className="mt-1 text-lg font-bold text-[#2D3748]">This behaves like {familyLesson.name.toLowerCase()}.</h3>
              <p className="mt-2 text-[15px] leading-6 text-[#4A5568]">{familyLesson.behavior}</p>
              <p className="mt-2 rounded-[12px] border border-[#FED7AA] bg-white px-3 py-2 text-sm font-semibold leading-5 text-[#2D3748]">{familyLesson.risk}</p>
            </div>

            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-bold uppercase text-[#667085]">Details collected</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {collectedFacts.map((fact) => (
                  <div key={fact.label} className="rounded-[12px] border border-[#E5E7EB] bg-[#F5F7FA] px-3 py-2">
                    <p className="text-[11px] font-bold uppercase text-[#718096]">{fact.label}</p>
                    <p className="mt-1 text-sm font-bold text-[#2D3748]">{fact.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-[#718096]">
                Care label, color risk, heat exposure, and prior products change whether GONR can show steps or must protect the garment first.
              </p>
            </div>

            {renderedCard && (verdict.verdict === 'diy_safe' || verdict.verdict === 'diy_with_constraints') ? (
              <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-bold uppercase text-[#667085]">Allowed first steps</p>
                <h3 className="mt-1 text-lg font-bold text-[#16202D]">{displayQuery || renderedCard.title}</h3>
                {displayQuery && displayQuery !== renderedCard.title ? (
                  <p className="mt-1 text-xs font-bold uppercase leading-5 text-[#667085]">
                    Matched reviewed card: {renderedCard.title}
                  </p>
                ) : null}
                <ol className="mt-3 grid gap-2">
                  {renderedCard.safeSteps.map((step, index) => (
                    <li key={step} className="flex gap-3 rounded-[12px] bg-[#FFF7ED] px-3 py-2 text-[15px] leading-6 text-[#26362D]">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F97316] text-sm font-bold text-white">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                {renderedCard.protocolName || renderedCard.mechanism || renderedCard.sourceFit ? (
                  <div className="mt-3 grid gap-2 rounded-[12px] border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                    {renderedCard.protocolName ? (
                      <p className="text-sm font-bold leading-5 text-[#16202D]">Protocol: {renderedCard.protocolName}</p>
                    ) : null}
                    {renderedCard.mechanism ? <p className="text-sm leading-6 text-[#475569]">{renderedCard.mechanism}</p> : null}
                    {renderedCard.sourceFit ? <p className="text-xs font-semibold leading-5 text-[#667085]">{renderedCard.sourceFit}</p> : null}
                  </div>
                ) : null}
                {renderedCard.knowledgeBullets && renderedCard.knowledgeBullets.length > 0 ? (
                  <div className="mt-3 rounded-[12px] border border-[#DBEAFE] bg-[#EFF6FF] p-3">
                    <p className="text-xs font-bold uppercase text-[#1D4ED8]">What matters here</p>
                    <ul className="mt-2 grid gap-1">
                      {renderedCard.knowledgeBullets.map((item) => (
                        <li key={item} className="text-sm font-semibold leading-5 text-[#1E3A8A]">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {renderedCard.productGuidance && renderedCard.productGuidance.length > 0 ? (
                  <div className="mt-3 rounded-[12px] border border-[#D1FAE5] bg-[#ECFDF5] p-3">
                    <p className="text-xs font-bold uppercase text-[#047857]">Product guidance</p>
                    <div className="mt-2 grid gap-2">
                      {renderedCard.productGuidance.map((product) => (
                        <div key={product.name} className="rounded-[10px] border border-[#A7F3D0] bg-white px-3 py-2">
                          <p className="text-sm font-bold text-[#064E3B]">{product.name}</p>
                          <p className="mt-1 text-sm leading-5 text-[#475569]">{product.use}</p>
                          {product.note ? <p className="mt-1 text-xs font-semibold leading-5 text-[#667085]">{product.note}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : candidateCard && verdict.missingFacts && verdict.missingFacts.length > 0 ? (
              <div className="rounded-[12px] border border-[#FED7AA] bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-bold uppercase text-[#C2410C]">Protocol locked pending facts</p>
                <h3 className="mt-1 text-lg font-bold text-[#16202D]">{candidateCard.title}</h3>
                {candidateCard.protocolName ? <p className="mt-1 text-sm font-bold leading-5 text-[#475569]">Protocol: {candidateCard.protocolName}</p> : null}
                {candidateCard.mechanism ? <p className="mt-3 text-[15px] leading-6 text-[#4A5568]">{candidateCard.mechanism}</p> : null}
                <div className="mt-3 rounded-[12px] border border-[#FED7AA] bg-[#FFF7ED] p-3">
                  <p className="text-xs font-bold uppercase text-[#C2410C]">Confirm before GONR can show steps</p>
                  <ul className="mt-2 grid gap-1">
                    {verdict.missingFacts.map((fact) => (
                      <li key={fact} className="text-sm font-semibold leading-5 text-[#2D3748]">
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
                {candidateCard.sourceFit ? <p className="mt-3 text-xs font-semibold leading-5 text-[#667085]">{candidateCard.sourceFit}</p> : null}
              </div>
            ) : (
              <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 text-[15px] font-semibold leading-6 text-[#4A5568] shadow-sm">
                No treatment steps are shown for this result. Use the protection step and referral summary instead.
              </div>
            )}

            <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#FFF1F2] text-[#E11D48]">
                  <MapPin size={23} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[#667085]">Referral</p>
                  <h3 className="mt-1 text-lg font-bold text-[#16202D]">
                    {verdict.referral.emphasize ? 'Find a cleaner who can help' : 'Referral is ready if you need it'}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#475569]">
                    Bring or send this summary so the cleaner knows what happened.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {verdict.referral.options.map((option) => (
                  <div key={option.label} className="rounded-[8px] border border-[#E5E7EB] bg-white px-3 py-3">
                    <p className="font-bold text-[#16202D]">{option.label}</p>
                    {option.detail ? <p className="mt-1 text-sm leading-5 text-[#667085]">{option.detail}</p> : null}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowSummary((current) => !current)}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[8px] bg-[#E11D48] px-3 text-sm font-bold text-white"
                >
                  <Clipboard size={18} aria-hidden="true" />
                  Create cleaner summary
                </button>
                <button
                  type="button"
                  onClick={copySummary}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#FDA4AF] bg-white px-3 text-sm font-bold text-[#BE123C]"
                >
                  <Clipboard size={18} aria-hidden="true" />
                  {copied ? 'Copied' : 'Copy summary'}
                </button>
              </div>

              {showSummary ? (
                <textarea
                  readOnly
                  value={verdict.referral.handoffSummary}
                  className="mt-4 min-h-[178px] w-full rounded-[8px] border border-[#FDA4AF] bg-white p-3 text-sm leading-6 text-[#283241]"
                />
              ) : null}
            </div>

            {verdict.requiresReferral ? (
              <div className="sticky bottom-[72px] z-20 rounded-[8px] border border-[#FDA4AF] bg-white/95 p-3 shadow-lg backdrop-blur sm:static sm:shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowSummary(true)}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#E11D48] px-4 text-[15px] font-bold text-white"
                >
                  <MapPin size={19} aria-hidden="true" />
                  Find a cleaner who can help
                </button>
              </div>
            ) : null}
          </section>
        ) : (
          <aside className="hidden min-w-0 rounded-[12px] border border-[#E5E7EB] bg-white p-5 shadow-sm lg:grid lg:gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-[#667085]">Safety triage</p>
              <h2 className="mt-1 text-2xl font-bold leading-tight text-[#16202D]">Protect the garment first.</h2>
              <p className="mt-2 text-[15px] leading-6 text-[#475569]">
                GONR weighs stain family, fiber, care label, heat, color risk, and prior products before showing a move.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {collectedFacts.slice(0, 6).map((fact) => (
                <div key={fact.label} className="rounded-[12px] border border-[#E5E7EB] bg-[#F5F7FA] px-3 py-2">
                  <p className="text-[11px] font-bold uppercase text-[#718096]">{fact.label}</p>
                  <p className="mt-1 text-sm font-bold text-[#2D3748]">{fact.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[12px] border border-[#FED7AA] bg-[#FFF7ED] p-4">
              <p className="text-xs font-bold uppercase text-[#C2410C]">Current family</p>
              <h3 className="mt-1 text-lg font-bold text-[#16202D]">{familyLesson.name}</h3>
              <p className="mt-2 text-sm leading-6 text-[#4A5568]">{familyLesson.risk}</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
