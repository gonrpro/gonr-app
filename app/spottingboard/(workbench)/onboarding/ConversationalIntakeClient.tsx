'use client'

// app/spottingboard/(workbench)/onboarding/ConversationalIntakeClient.tsx — TASK-165 v0
//
// Single client island for the conversational intake cockpit. Inline
// sub-components are clearly delimited and ready to extract into separate
// files (IntakeMessageList, IntakeChipPrompt, IntakeComposer,
// PlantBrainBuildStatus) when the surface stabilises.
//
// State machine:
//   1. On mount, read initial plant + itemCount from server props.
//   2. Compute current step via getNextStep(plant, itemCount).
//   3. Render assistant prompt + chips + composer.
//   4. On answer: optimistic transcript append → POST/PATCH → router.refresh()
//      to re-run server step computation. The refresh re-renders this client
//      with the new initial state; we re-seed transcript from prior history
//      stored in a sessionStorage-keyed scratch buffer so the operator does
//      not lose the conversation feel on refresh.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CockpitInitialState, ScriptChip, ScriptStep, ScriptStepKind, TranscriptMessage } from './types'
import { getNextStep } from './intake-script'

interface Props {
  initial: CockpitInitialState
}

const TRANSCRIPT_STORAGE_KEY = 'sb-intake-cockpit-transcript-v0'

declare global {
  interface Window {
    SpeechRecognition?: unknown
    webkitSpeechRecognition?: unknown
  }
}

export function ConversationalIntakeClient({ initial }: Props) {
  const router = useRouter()
  const [transcript, setTranscript] = useState<TranscriptMessage[]>(() => loadTranscript())
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set())
  const [composerText, setComposerText] = useState('')
  const [inFlight, setInFlight] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const transcriptRef = useRef<HTMLOListElement | null>(null)
  const seededStepRef = useRef<ScriptStepKind | null>(null)

  const step = useMemo(() => getNextStep(initial.plant, initial.itemCount), [initial])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setVoiceSupported(
      typeof window.SpeechRecognition !== 'undefined' ||
      typeof window.webkitSpeechRecognition !== 'undefined',
    )
  }, [])

  useEffect(() => {
    if (!step) return
    if (seededStepRef.current === step.kind) return
    seededStepRef.current = step.kind
    appendTranscript({
      id: cryptoRandomId(),
      role: 'assistant',
      content: step.assistantPrompt,
    })
  }, [step])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(TRANSCRIPT_STORAGE_KEY, JSON.stringify(transcript))
  }, [transcript])

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcript.length])

  function appendTranscript(msg: TranscriptMessage) {
    setTranscript(prev => [...prev, msg])
  }

  async function handleChipAnswer(chip: ScriptChip) {
    if (!step) return
    if (step.multiSelect) {
      const key = String(chip.label)
      setSelectedChips(prev => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
      return
    }
    await submitAnswer(chip.value, chip.label, step)
  }

  async function handleMultiSelectConfirm() {
    if (!step || !step.multiSelect) return
    const picked = step.chips.filter(c => selectedChips.has(c.label))
    if (picked.length === 0) return
    // For wizard_solvent, values are arrays like ['hydrocarbon']. Merge them.
    const merged = picked.flatMap(c => (Array.isArray(c.value) ? c.value : [c.value]))
    const label = picked.map(c => c.label).join(', ')
    setSelectedChips(new Set())
    await submitAnswer(merged, label, step)
  }

  async function handleComposerSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!step || !composerText.trim()) return
    const text = composerText.trim()
    setComposerText('')
    await submitAnswer(text, text, step)
  }

  async function submitAnswer(value: unknown, displayLabel: string, currentStep: ScriptStep) {
    const operatorMsgId = cryptoRandomId()
    appendTranscript({ id: operatorMsgId, role: 'operator', content: displayLabel })
    setInFlight(true)
    setError(null)

    try {
      if (currentStep.target.kind === 'patch_plant') {
        const body: Record<string, unknown> = {}
        if (currentStep.target.field === 'name') {
          // Plant creation: POST if no plant; PATCH otherwise.
          if (!initial.plant) {
            const res = await fetch('/api/plant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: value }),
            })
            if (!res.ok) throw new Error(`create_plant_failed_${res.status}`)
          } else {
            body.name = value
            const res = await fetch('/api/plant', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
            if (!res.ok) throw new Error(`patch_plant_failed_${res.status}`)
          }
        } else {
          body[currentStep.target.field] = value
          // Last wizard step → also mark wizard_completed.
          if (currentStep.kind === 'wizard_bleach') {
            body.wizard_completed = true
          }
          const res = await fetch('/api/plant', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (!res.ok) throw new Error(`patch_plant_failed_${res.status}`)
        }

        markPillOnLastOperator(operatorMsgId, { label: 'Saved · Plant DNA', tone: 'plant-dna' })
      } else if (currentStep.target.kind === 'post_item') {
        if (!initial.plant?.plantId) throw new Error('plant_required_for_capture')
        const res = await fetch('/api/spottingboard/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plant_id: initial.plant.plantId,
            module: currentStep.target.module,
            body: value,
            title: deriveTitle(String(value)),
            // TASK-158 requires at least one scope. v0 cockpit captures raw
            // plant-local free text and lets Supervisor Review refine scope.
            chemistry_scope: ['uncategorized'],
          }),
        })
        if (!res.ok) throw new Error(`capture_failed_${res.status}`)
        const data = await res.json().catch(() => null) as {
          governance_applied?: { safety_label?: string }
          classifier?: { hard_block?: boolean }
        } | null
        const isUnsafe = data?.governance_applied?.safety_label === 'unsafe_do_not_use' || data?.classifier?.hard_block === true
        markPillOnLastOperator(
          operatorMsgId,
          isUnsafe
            ? { label: 'Captured · Unsafe — do not use', tone: 'unsafe' }
            : { label: 'Captured · Plant-local · Needs supervisor review', tone: 'needs-review' },
        )
        if (isUnsafe) {
          appendTranscript({
            id: cryptoRandomId(),
            role: 'assistant',
            content:
              'Heads-up: I saved that, but the classifier flagged a safety issue. ' +
              'The row is marked Unsafe and pulled out of the runtime path. ' +
              'Open Supervisor Review when you can.',
          })
        }
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'submit_failed')
      appendTranscript({
        id: cryptoRandomId(),
        role: 'assistant',
        content: "I couldn't save that — let's try again. (Check your connection.)",
      })
    } finally {
      setInFlight(false)
    }
  }

  function markPillOnLastOperator(operatorMsgId: string, pill: NonNullable<TranscriptMessage['pill']>) {
    setTranscript(prev => prev.map(m => (m.id === operatorMsgId ? { ...m, pill } : m)))
  }

  // ─── Component: PlantBrainBuildStatus ───────────────────────────────────
  function renderBuildStatus() {
    const dnaItems: Array<{ label: string; done: boolean }> = initial.plant
      ? [
          { label: 'Plant name', done: !!initial.plant.name },
          { label: 'Solvent', done: initial.plant.solvents.length > 0 },
          { label: 'Board', done: !!initial.plant.board },
          { label: 'Primary skill', done: !!initial.plant.skillLevel },
          { label: 'Bleach policy', done: initial.plant.wizardCompletedAt !== null },
        ]
      : [{ label: 'Plant name', done: false }]
    return (
      <aside className="sb-intake-status" aria-label="Plant Brain build status">
        <h2 className="sb-intake-status-title">Plant Brain</h2>
        <p className="sb-intake-status-sub">
          {initial.plant ? initial.plant.name : 'Not created yet'}
        </p>
        <ul className="sb-intake-status-list">
          {dnaItems.map(d => (
            <li key={d.label} data-done={d.done ? 'true' : undefined}>
              <span aria-hidden="true">{d.done ? '✓' : '○'}</span> {d.label}
            </li>
          ))}
        </ul>
        <p className="sb-intake-status-count">{initial.itemCount} rule(s) captured</p>
        <ul className="sb-intake-status-legend">
          <li><span className="sb-pill sb-pill-plant-dna">Plant DNA</span> — saved config</li>
          <li><span className="sb-pill sb-pill-needs-review">Needs supervisor review</span> — captured, awaiting review</li>
          <li><span className="sb-pill sb-pill-unsafe">Unsafe</span> — classifier-flagged</li>
        </ul>
      </aside>
    )
  }

  // ─── Component: IntakeMessageList ───────────────────────────────────────
  function renderTranscript() {
    return (
      <ol
        ref={transcriptRef}
        role="log"
        aria-live="polite"
        aria-label="Intake conversation"
        className="sb-intake-transcript"
      >
        {transcript.map(m => (
          <li key={m.id} data-role={m.role}>
            <div className="sb-intake-bubble">
              <span className="sb-intake-bubble-role">{m.role === 'assistant' ? 'Assistant' : 'You'}</span>
              <p>{m.content}</p>
              {m.pill ? (
                <span className={`sb-pill sb-pill-${m.pill.tone}`}>{m.pill.label}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    )
  }

  // ─── Component: IntakeChipPrompt ────────────────────────────────────────
  function renderChips() {
    if (!step || step.chips.length === 0) return null
    return (
      <div className="sb-intake-chips" role="group" aria-label="Suggested answers">
        {step.chips.map(chip => {
          const isSelected = step.multiSelect && selectedChips.has(chip.label)
          return (
            <button
              key={chip.label}
              type="button"
              className="sb-intake-chip"
              data-selected={isSelected ? 'true' : undefined}
              disabled={inFlight}
              onClick={() => handleChipAnswer(chip)}
            >
              {chip.label}
            </button>
          )
        })}
        {step.multiSelect ? (
          <button
            type="button"
            className="sb-intake-chip-confirm"
            disabled={inFlight || selectedChips.size === 0}
            onClick={handleMultiSelectConfirm}
          >
            Confirm ({selectedChips.size})
          </button>
        ) : null}
      </div>
    )
  }

  // ─── Component: IntakeComposer ──────────────────────────────────────────
  function renderComposer() {
    if (!step || !step.allowFreeText) return null
    return (
      <form className="sb-intake-composer" onSubmit={handleComposerSubmit}>
        {/* Voice button: visible on desktop only; placeholder unless Web Speech is detected. */}
        <button
          type="button"
          className="sb-intake-mic"
          aria-label={voiceSupported ? 'Tap to talk' : 'Voice support coming soon'}
          aria-disabled={!voiceSupported}
          title={voiceSupported ? 'Tap to talk' : 'Voice support coming soon — typing works fine'}
        >
          🎙
        </button>
        <textarea
          className="sb-intake-textarea"
          aria-label="Type your answer"
          placeholder={step.composerPlaceholder}
          value={composerText}
          onChange={e => setComposerText(e.target.value)}
          disabled={inFlight}
          rows={2}
        />
        <button
          type="submit"
          className="sb-intake-send"
          disabled={inFlight || !composerText.trim()}
        >
          {inFlight ? '…' : 'Send'}
        </button>
      </form>
    )
  }

  if (!step) {
    return (
      <div className="sb-intake-complete">
        <h1>Your Plant Brain is taking shape.</h1>
        <p>
          You can keep building anytime. The Dashboard now shows your live counts and review queue.
        </p>
        <a className="sb-link-button" href="/spottingboard/dashboard">Go to Dashboard</a>
      </div>
    )
  }

  return (
    <div className="sb-intake-cockpit">
      {renderBuildStatus()}
      <section className="sb-intake-main" aria-label="Intake conversation">
        {renderTranscript()}
        {error ? <p className="sb-intake-error" role="alert">{error}</p> : null}
        {renderChips()}
        {renderComposer()}
      </section>
    </div>
  )
}

function loadTranscript(): TranscriptMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(TRANSCRIPT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function deriveTitle(body: string): string {
  const trimmed = body.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= 60) return trimmed
  return trimmed.slice(0, 57) + '…'
}
