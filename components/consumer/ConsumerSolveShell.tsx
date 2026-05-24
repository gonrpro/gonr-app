'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, Clipboard, MapPin, ShieldCheck, Shirt, XCircle } from 'lucide-react'
import { CONSUMER_CARDS_PHASE0 } from '@/lib/consumer-cards/cards'
import { classify } from '@/lib/consumer-safety/classifier'
import type {
  CareStatus,
  Colorfastness,
  HeatExposure,
  ItemValue,
  Material,
  SafetyVerdict,
  SolveInput,
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
  { value: 'unknown', label: 'I am not sure' },
]

const STAIN_OPTIONS: Array<{ value: StainType | 'auto'; label: string }> = [
  { value: 'auto', label: 'Let GONR infer it' },
  { value: 'protein', label: 'Blood / sweat / protein' },
  { value: 'tannin', label: 'Coffee / wine / tea' },
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
  { value: 'unknown', label: 'I am not sure' },
]

const HEAT_OPTIONS: Array<{ value: HeatExposure; label: string }> = [
  { value: 'none', label: 'No heat yet' },
  { value: 'warm_hot_wash', label: 'Warm or hot water' },
  { value: 'machine_dried', label: 'Machine dryer' },
  { value: 'ironed', label: 'Ironed' },
  { value: 'unknown', label: 'I am not sure' },
]

const COLOR_OPTIONS: Array<{ value: Colorfastness; label: string }> = [
  { value: 'colorfast', label: 'Colorfast / white' },
  { value: 'prone_to_bleed', label: 'Dark, bright, or might bleed' },
  { value: 'unknown', label: 'I am not sure' },
]

const AGE_OPTIONS: Array<{ value: StainAge; label: string }> = [
  { value: 'fresh', label: 'Fresh' },
  { value: 'hours_old', label: 'Hours old' },
  { value: 'set_in', label: 'Set in / already washed' },
  { value: 'unknown', label: 'I am not sure' },
]

const VALUE_OPTIONS: Array<{ value: ItemValue; label: string }> = [
  { value: 'everyday', label: 'Everyday item' },
  { value: 'valuable', label: 'Valuable' },
  { value: 'sentimental', label: 'Sentimental' },
  { value: 'unknown', label: 'I am not sure' },
]

const PRIOR_TREATMENTS = ['water', 'detergent', 'bleach', 'ammonia', 'acetone', 'enzyme detergent', 'peroxide', 'baking soda']

const EXAMPLE_CHIPS = [
  'red wine on white cotton shirt',
  'grease on silk blouse',
  'ink on wool coat',
  'already used bleach and ammonia',
]

const VERDICT_COPY: Record<VerdictLevel, { label: string; tone: string; color: string; bg: string; Icon: typeof ShieldCheck }> = {
  diy_safe: {
    label: 'DIY safe enough',
    tone: 'A reviewed card supports a simple first move for these facts.',
    color: '#1F7A52',
    bg: '#E8F6EE',
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
        className="min-h-[44px] rounded-[8px] border border-[#DDDFD8] bg-white px-3 text-[15px] font-medium text-[#1F2937] outline-none transition focus:border-[#2E9E6B]"
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
  const [verdict, setVerdict] = useState<SafetyVerdict | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [copied, setCopied] = useState(false)

  const renderedCard = useMemo(() => {
    if (!verdict?.card) return null
    return CONSUMER_CARDS_PHASE0.find((card) => card.id === verdict.card) ?? null
  }, [verdict])

  function clearStaleVerdict() {
    setVerdict(null)
    setShowSummary(false)
    setCopied(false)
  }

  function updateField<T>(setter: (value: T) => void) {
    return (value: T) => {
      clearStaleVerdict()
      setter(value)
    }
  }

  function togglePriorTreatment(value: string) {
    clearStaleVerdict()
    setPriorTreatment((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))
  }

  function buildInput(): SolveInput {
    return {
      stainDescription: description,
      stainType: stainType === 'auto' ? undefined : stainType,
      material,
      careStatus,
      heatExposure,
      colorfastness,
      stainAge,
      priorTreatment,
      itemValue,
      locationText,
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = classify(buildInput())
    setVerdict(next)
    setShowSummary(next.requiresReferral)
    setCopied(false)
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

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

  return (
    <div className="min-h-[calc(100dvh-122px)] bg-[#FAF7F2] text-[#1F2937]">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-1 py-5 sm:px-3">
        <section className="grid gap-4 rounded-[8px] border border-[#E6E1D8] bg-[#FFFDF8] p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-[#E8F6EE] text-[#1F7A52]">
              <Shirt size={24} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight text-[#16202D]">What happened?</h1>
              <p className="mt-1 text-sm leading-6 text-[#586171]">Tell us about the stain - we will tell you the safe move first.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-[#283241]">
              Stain details
              <textarea
                value={description}
                onChange={(event) => {
                  clearStaleVerdict()
                  setDescription(event.target.value)
                }}
                placeholder="Example: red wine on white cotton shirt"
                rows={4}
                className="min-h-[118px] rounded-[8px] border border-[#DDDFD8] bg-white px-3 py-3 text-[16px] leading-6 text-[#1F2937] outline-none transition placeholder:text-[#8A9288] focus:border-[#2E9E6B]"
                required
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {EXAMPLE_CHIPS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    clearStaleVerdict()
                    setDescription(example)
                  }}
                  className="min-h-[44px] rounded-full border border-[#DDD8CC] bg-white px-3 text-sm font-semibold text-[#475569] transition hover:border-[#2E9E6B] hover:text-[#1F7A52]"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Stain type" value={stainType} options={STAIN_OPTIONS} onChange={updateField(setStainType)} />
              <SelectField label="Material" value={material} options={MATERIAL_OPTIONS} onChange={updateField(setMaterial)} />
              <SelectField label="Care label" value={careStatus} options={CARE_OPTIONS} onChange={updateField(setCareStatus)} />
              <SelectField label="Heat exposure" value={heatExposure} options={HEAT_OPTIONS} onChange={updateField(setHeatExposure)} />
              <SelectField label="Colorfastness" value={colorfastness} options={COLOR_OPTIONS} onChange={updateField(setColorfastness)} />
              <SelectField label="Stain age" value={stainAge} options={AGE_OPTIONS} onChange={updateField(setStainAge)} />
              <SelectField label="Item value" value={itemValue} options={VALUE_OPTIONS} onChange={updateField(setItemValue)} />
              <label className="grid gap-2 text-sm font-semibold text-[#283241]">
                ZIP or city
                <input
                  value={locationText}
                  onChange={(event) => {
                    clearStaleVerdict()
                    setLocationText(event.target.value)
                  }}
                  placeholder="Naples, FL or 34102"
                  className="min-h-[44px] rounded-[8px] border border-[#DDDFD8] bg-white px-3 text-[15px] font-medium text-[#1F2937] outline-none transition placeholder:text-[#8A9288] focus:border-[#2E9E6B]"
                />
              </label>
            </div>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-[#283241]">Already tried</legend>
              <div className="flex flex-wrap gap-2">
                {PRIOR_TREATMENTS.map((item) => {
                  const selected = priorTreatment.includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => togglePriorTreatment(item)}
                      aria-pressed={selected}
                      className={`min-h-[44px] rounded-full border px-3 text-sm font-semibold transition ${
                        selected
                          ? 'border-[#2E9E6B] bg-[#E8F6EE] text-[#1F7A52]'
                          : 'border-[#DDD8CC] bg-white text-[#475569] hover:border-[#2E9E6B]'
                      }`}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <button
              type="submit"
              className="flex min-h-[50px] items-center justify-center gap-2 rounded-[8px] bg-[#1F7A52] px-4 text-[16px] font-bold text-white shadow-sm transition hover:bg-[#176541] focus:outline-none focus:ring-2 focus:ring-[#2E9E6B] focus:ring-offset-2"
            >
              <ShieldCheck size={20} aria-hidden="true" />
              Check safe move
            </button>
          </form>
        </section>

        {verdict && theme ? (
          <section ref={resultRef} className="grid gap-4" data-testid="consumer-result">
            <div className="rounded-[8px] border border-[#E6E1D8] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px]" style={{ background: theme.bg, color: theme.color }}>
                  <ResultIcon size={26} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-[#667085]">Verdict</p>
                  <h2 className="mt-1 text-2xl font-bold leading-tight" style={{ color: theme.color }}>
                    {theme.label}
                  </h2>
                  <p className="mt-2 text-[15px] leading-6 text-[#475569]">{theme.tone}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-[8px] border border-[#EAE5DB] bg-[#FAF7F2] p-3">
                  <p className="text-xs font-bold uppercase text-[#667085]">First action</p>
                  <p className="mt-1 text-[17px] font-bold leading-6 text-[#16202D]">{verdict.safeFirstMove}</p>
                </div>

                <div className="grid gap-2">
                  <p className="text-xs font-bold uppercase text-[#667085]">Avoid</p>
                  <ul className="grid gap-2">
                    {verdict.avoid.slice(0, 5).map((item) => (
                      <li key={item} className="rounded-[8px] border border-[#F1D4CC] bg-[#FFF7F4] px-3 py-2 text-sm font-semibold leading-5 text-[#87412B]">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-1">
                  <p className="text-xs font-bold uppercase text-[#667085]">Why</p>
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

            {renderedCard && (verdict.verdict === 'diy_safe' || verdict.verdict === 'diy_with_constraints') ? (
              <div className="rounded-[8px] border border-[#E6E1D8] bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-bold uppercase text-[#667085]">Allowed first steps</p>
                <h3 className="mt-1 text-lg font-bold text-[#16202D]">{renderedCard.title}</h3>
                <ol className="mt-3 grid gap-2">
                  {renderedCard.safeSteps.map((step, index) => (
                    <li key={step} className="flex gap-3 rounded-[8px] bg-[#F5FBF7] px-3 py-2 text-[15px] leading-6 text-[#26362D]">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1F7A52] text-sm font-bold text-white">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="rounded-[8px] border border-[#E6E1D8] bg-white p-4 text-[15px] font-semibold leading-6 text-[#475569] shadow-sm">
                No treatment steps are shown for this result. Use the protection step and referral summary instead.
              </div>
            )}

            <div className="rounded-[8px] border border-[#D8E6DD] bg-[#F8FFFB] p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-[#E8F6EE] text-[#1F7A52]">
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
                  <div key={option.label} className="rounded-[8px] border border-[#D8E6DD] bg-white px-3 py-3">
                    <p className="font-bold text-[#16202D]">{option.label}</p>
                    {option.detail ? <p className="mt-1 text-sm leading-5 text-[#667085]">{option.detail}</p> : null}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowSummary((current) => !current)}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[8px] bg-[#1F7A52] px-3 text-sm font-bold text-white"
                >
                  <Clipboard size={18} aria-hidden="true" />
                  Create cleaner summary
                </button>
                <button
                  type="button"
                  onClick={copySummary}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#C9D7CE] bg-white px-3 text-sm font-bold text-[#1F7A52]"
                >
                  <Clipboard size={18} aria-hidden="true" />
                  {copied ? 'Copied' : 'Copy summary'}
                </button>
              </div>

              {showSummary ? (
                <textarea
                  readOnly
                  value={verdict.referral.handoffSummary}
                  className="mt-4 min-h-[178px] w-full rounded-[8px] border border-[#D8E6DD] bg-white p-3 text-sm leading-6 text-[#283241]"
                />
              ) : null}
            </div>

            {verdict.requiresReferral ? (
              <div className="sticky bottom-[72px] z-20 rounded-[8px] border border-[#D8E6DD] bg-white/95 p-3 shadow-lg backdrop-blur sm:static sm:shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowSummary(true)}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#1F7A52] px-4 text-[15px] font-bold text-white"
                >
                  <MapPin size={19} aria-hidden="true" />
                  Find a cleaner who can help
                </button>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  )
}
