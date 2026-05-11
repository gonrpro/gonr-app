'use client'

// TASK-144 — Operator-week feedback capture modal
// Mobile-first. One screen per dimension. Tap-to-select chips, no dropdowns.
// 5 confusion dimensions (F1-F5) + headline binary F6 (would-use).
// Surface: GONR runtime v1; reusable for Spotting Board v1.1.
// SB-approved placeholder F4 copy: "GONR-backed source / plant rule / unverified note."
// Reusable contract per spec §6. Lab delivers; Atlas integrates into gonr-app.

import { useState } from 'react'

type Surface = 'gonr-runtime' | 'spottingboard'
type Trigger = 'post-recommendation' | 'manual'
type Device = 'phone' | 'tablet' | 'desktop'

type FeedbackPayload = {
  plant_id: string
  protocol_id?: string
  surface: Surface
  trigger: Trigger
  device: Device
  app_version: string
  recommendation_clarity?: 'clear' | 'partly_clear' | 'not_clear' | 'wrong'
  recommendation_note?: string
  material_risk_match?: 'matched' | 'partly_matched' | 'didnt_match' | 'missing_when_needed'
  material_risk_note?: string
  stop_escalate_clarity?: 'clear' | 'unclear' | 'missing'
  stop_escalate_note?: string
  provenance_clarity?: 'clear' | 'partly_clear' | 'not_clear' | 'didnt_notice'
  provenance_note?: string
  chemistry_clarity?: 'clear' | 'partly_clear' | 'not_clear' | 'looked_up'
  chemistry_note?: string
  would_use_real_garment?: 'yes' | 'no'
  would_use_note?: string
  dismissed?: boolean
}

export type OperatorFeedbackModalProps = {
  plantId: string
  protocolId?: string
  surface: Surface
  trigger: Trigger
  appVersion: string
  onSubmit: (payload: FeedbackPayload) => Promise<void>
  onDismiss: () => void
  legalIntakeOpen: () => void
  device?: Device
}

const STEPS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'] as const
type Step = typeof STEPS[number]

type ChipOption<T extends string> = { value: T; label: string }

const F1_OPTS: ChipOption<NonNullable<FeedbackPayload['recommendation_clarity']>>[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'partly_clear', label: 'Partly clear' },
  { value: 'not_clear', label: 'Not clear' },
  { value: 'wrong', label: 'Wrong' },
]

const F2_OPTS: ChipOption<NonNullable<FeedbackPayload['material_risk_match']>>[] = [
  { value: 'matched', label: 'Matched' },
  { value: 'partly_matched', label: 'Partly matched' },
  { value: 'didnt_match', label: "Didn't match" },
  { value: 'missing_when_needed', label: 'Missing when I needed it' },
]

const F3_OPTS: ChipOption<NonNullable<FeedbackPayload['stop_escalate_clarity']>>[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'unclear', label: 'Unclear' },
  { value: 'missing', label: 'No stop conditions shown' },
]

const F4_OPTS: ChipOption<NonNullable<FeedbackPayload['provenance_clarity']>>[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'partly_clear', label: 'Partly clear' },
  { value: 'not_clear', label: 'Not clear' },
  { value: 'didnt_notice', label: "Didn't notice" },
]

const F5_OPTS: ChipOption<NonNullable<FeedbackPayload['chemistry_clarity']>>[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'partly_clear', label: 'Partly clear' },
  { value: 'not_clear', label: 'Not clear' },
  { value: 'looked_up', label: 'Had to look something up' },
]

export function OperatorFeedbackModal(props: OperatorFeedbackModalProps) {
  const [step, setStep] = useState<Step>('F1')
  const [showNote, setShowNote] = useState<Record<Step, boolean>>({
    F1: false, F2: false, F3: false, F4: false, F5: false, F6: false,
  })
  const [draft, setDraft] = useState<Partial<FeedbackPayload>>({
    plant_id: props.plantId,
    protocol_id: props.protocolId,
    surface: props.surface,
    trigger: props.trigger,
    device: props.device ?? detectDevice(),
    app_version: props.appVersion,
  })
  const [submitting, setSubmitting] = useState(false)

  const stepIdx = STEPS.indexOf(step)

  const goNext = () => {
    if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1])
  }

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await props.onSubmit(draft as FeedbackPayload)
    } finally {
      setSubmitting(false)
    }
  }

  const dismiss = () => {
    if (submitting) return
    void props.onSubmit({ ...(draft as FeedbackPayload), dismissed: true })
    props.onDismiss()
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Quick feedback" className="ofm-root">
      <div className="ofm-sheet">
        <header className="ofm-head">
          <ProgressDots stepIdx={stepIdx} total={STEPS.length} />
          <button type="button" onClick={dismiss} aria-label="Close" className="ofm-close">×</button>
        </header>

        <main className="ofm-body">
          {step === 'F1' && (
            <Question
              title="Did the recommendation make sense for the stain in front of you?"
              chips={F1_OPTS.map(o => ({ ...o, selected: draft.recommendation_clarity === o.value }))}
              onPick={v => setDraft(d => ({ ...d, recommendation_clarity: v }))}
              note={draft.recommendation_note ?? ''}
              showNote={showNote.F1}
              onShowNote={() => setShowNote(s => ({ ...s, F1: true }))}
              onNoteChange={v => setDraft(d => ({ ...d, recommendation_note: v }))}
            />
          )}

          {step === 'F2' && (
            <Question
              title="Did the material/risk warnings match what you actually saw on the garment?"
              chips={F2_OPTS.map(o => ({ ...o, selected: draft.material_risk_match === o.value }))}
              onPick={v => setDraft(d => ({ ...d, material_risk_match: v }))}
              note={draft.material_risk_note ?? ''}
              showNote={showNote.F2}
              onShowNote={() => setShowNote(s => ({ ...s, F2: true }))}
              onNoteChange={v => setDraft(d => ({ ...d, material_risk_note: v }))}
            />
          )}

          {step === 'F3' && (
            <Question
              title="Was it clear when to stop or escalate to a specialist?"
              chips={F3_OPTS.map(o => ({ ...o, selected: draft.stop_escalate_clarity === o.value }))}
              onPick={v => setDraft(d => ({ ...d, stop_escalate_clarity: v }))}
              note={draft.stop_escalate_note ?? ''}
              showNote={showNote.F3}
              onShowNote={() => setShowNote(s => ({ ...s, F3: true }))}
              onNoteChange={v => setDraft(d => ({ ...d, stop_escalate_note: v }))}
            />
          )}

          {step === 'F4' && (
            <Question
              title="Was it clear where the recommendation came from — GONR-backed source, plant rule, or unverified note?"
              chips={F4_OPTS.map(o => ({ ...o, selected: draft.provenance_clarity === o.value }))}
              onPick={v => setDraft(d => ({ ...d, provenance_clarity: v }))}
              note={draft.provenance_note ?? ''}
              showNote={showNote.F4}
              onShowNote={() => setShowNote(s => ({ ...s, F4: true }))}
              onNoteChange={v => setDraft(d => ({ ...d, provenance_note: v }))}
            />
          )}

          {step === 'F5' && (
            <Question
              title="Was it clear which chemicals/agents to use, in what order, and on what materials?"
              chips={F5_OPTS.map(o => ({ ...o, selected: draft.chemistry_clarity === o.value }))}
              onPick={v => setDraft(d => ({ ...d, chemistry_clarity: v }))}
              note={draft.chemistry_note ?? ''}
              showNote={showNote.F5}
              onShowNote={() => setShowNote(s => ({ ...s, F5: true }))}
              onNoteChange={v => setDraft(d => ({ ...d, chemistry_note: v }))}
            />
          )}

          {step === 'F6' && (
            <Question
              title="With this garment in front of you for real money, would you actually follow what GONR recommended?"
              chips={[
                { value: 'yes', label: 'Yes', selected: draft.would_use_real_garment === 'yes' },
                { value: 'no', label: 'No', selected: draft.would_use_real_garment === 'no' },
              ]}
              onPick={v => setDraft(d => ({ ...d, would_use_real_garment: v as 'yes' | 'no' }))}
              note={draft.would_use_note ?? ''}
              showNote={showNote.F6}
              onShowNote={() => setShowNote(s => ({ ...s, F6: true }))}
              onNoteChange={v => setDraft(d => ({ ...d, would_use_note: v }))}
              emphasize
            />
          )}
        </main>

        <footer className="ofm-foot">
          <button type="button" onClick={props.legalIntakeOpen} className="ofm-legal-link">
            This is a refund/billing/legal issue, not product feedback
          </button>
          {step !== 'F6' ? (
            <button type="button" onClick={goNext} className="ofm-primary">
              Next
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={submitting} className="ofm-primary">
              {submitting ? 'Saving…' : 'Done'}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

function ProgressDots({ stepIdx, total }: { stepIdx: number; total: number }) {
  return (
    <div className="ofm-dots" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i <= stepIdx ? 'ofm-dot active' : 'ofm-dot'} />
      ))}
    </div>
  )
}

type QuestionProps<T extends string> = {
  title: string
  chips: { value: T; label: string; selected: boolean }[]
  onPick: (v: T) => void
  note: string
  showNote: boolean
  onShowNote: () => void
  onNoteChange: (v: string) => void
  emphasize?: boolean
}

function Question<T extends string>(props: QuestionProps<T>) {
  return (
    <div className={props.emphasize ? 'ofm-q ofm-q-emphasize' : 'ofm-q'}>
      <h2 className="ofm-q-title">{props.title}</h2>
      <div className="ofm-chips">
        {props.chips.map(c => (
          <button
            key={c.value}
            type="button"
            onClick={() => props.onPick(c.value)}
            className={c.selected ? 'ofm-chip selected' : 'ofm-chip'}
            aria-pressed={c.selected}
          >
            {c.label}
          </button>
        ))}
      </div>
      {props.showNote ? (
        <textarea
          value={props.note}
          onChange={e => props.onNoteChange(e.target.value)}
          placeholder="Optional note in your own words"
          className="ofm-note"
          rows={3}
        />
      ) : (
        <button type="button" onClick={props.onShowNote} className="ofm-note-toggle">
          + Add a note
        </button>
      )}
    </div>
  )
}

function detectDevice(): Device {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w < 600) return 'phone'
  if (w < 1024) return 'tablet'
  return 'desktop'
}
