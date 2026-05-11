'use client'

// app/spottingboard/(workbench)/dashboard/GuidedDashboardClient.tsx — TASK-187 v0
//
// Guided dashboard cockpit. Mirrors the ConversationalIntakeClient pattern
// (TASK-165) but adapted for steady-state operation: dashboard is current-
// state driven, so transcript lives in-memory only (no sessionStorage).
//
// State machine:
//   1. Server resolves session + plant + counts + recent items, hands the
//      hydrated initial state to this client.
//   2. dashboard-script.ts picks the next best question from live state.
//   3. Operator answers via chips (navigate/skip) or composer (free-text →
//      POST /api/spottingboard/items). Onboarding-leftover steps reuse the
//      onboarding patch_plant / post_item paths.
//   4. After write, router.refresh() re-runs server resolution + picker.
//
// Reuses TASK-165 cockpit primitives via inline mirror (acceptable for MVP
// per Atlas plan §"Client duplication risk"; extraction to
// components/spottingboard/guided-intake/ is the natural follow-up).

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { UserPlant } from '@/lib/auth/getUserPlant'
import type { ScriptChip, TranscriptMessage } from '../onboarding/types'
import { pickDashboardStep, type DashboardChip, type DashboardStep } from './dashboard-script'

declare global {
  interface Window {
    SpeechRecognition?: unknown
    webkitSpeechRecognition?: unknown
  }
}

export interface DashboardInitial {
  plant: UserPlant | null
  totalItems: number
  queueCount: number
  recentItems: Array<{ id: string; title: string | null; body: string; safety_label: string }>
}

interface Props {
  initial: DashboardInitial
}

const COUNT_CAP = 1000

export function GuidedDashboardClient({ initial }: Props) {
  const router = useRouter()
  const step = useMemo<DashboardStep>(() => pickDashboardStep(initial), [initial])

  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set())
  const [composerText, setComposerText] = useState('')
  const [inFlight, setInFlight] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const seededStepRef = useRef<string | null>(null)
  const transcriptRef = useRef<HTMLOListElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setVoiceSupported(
      typeof window.SpeechRecognition !== 'undefined' ||
      typeof window.webkitSpeechRecognition !== 'undefined',
    )
  }, [])

  useEffect(() => {
    if (!step) return
    const stepKey = step.kind + (step.onboardingStep?.kind ?? '')
    if (seededStepRef.current === stepKey) return
    seededStepRef.current = stepKey
    setSkipped(false)
    appendTranscript({
      id: cryptoRandomId(),
      role: 'assistant',
      content: step.assistantPrompt,
    })
  }, [step])

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcript.length])

  function appendTranscript(msg: TranscriptMessage) {
    setTranscript(prev => [...prev, msg])
  }

  function markPillOnLastOperator(operatorMsgId: string, pill: NonNullable<TranscriptMessage['pill']>) {
    setTranscript(prev => prev.map(m => (m.id === operatorMsgId ? { ...m, pill } : m)))
  }

  function handleChip(chip: DashboardChip) {
    appendTranscript({ id: cryptoRandomId(), role: 'operator', content: chip.label })
    if (chip.action.kind === 'navigate') {
      router.push(chip.action.href)
      return
    }
    // skip → collapse the question for this view; operator can refresh for next.
    setSkipped(true)
    appendTranscript({
      id: cryptoRandomId(),
      role: 'assistant',
      content: 'Skipped. Use the quick links below or refresh when you want the next best question.',
    })
  }

  async function handleOnboardingChip(chip: ScriptChip) {
    if (!step.onboardingStep) return
    if (step.onboardingStep.multiSelect) {
      const key = String(chip.label)
      setSelectedChips(prev => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
      return
    }
    await submitOnboardingAnswer(chip.value, chip.label)
  }

  async function handleMultiSelectConfirm() {
    if (!step.onboardingStep || !step.onboardingStep.multiSelect) return
    const picked = step.onboardingStep.chips.filter(c => selectedChips.has(c.label))
    if (picked.length === 0) return
    const merged = picked.flatMap(c => (Array.isArray(c.value) ? c.value : [c.value]))
    const label = picked.map(c => c.label).join(', ')
    setSelectedChips(new Set())
    await submitOnboardingAnswer(merged, label)
  }

  async function submitOnboardingAnswer(value: unknown, displayLabel: string) {
    if (!step.onboardingStep) return
    const target = step.onboardingStep.target
    const operatorMsgId = cryptoRandomId()
    appendTranscript({ id: operatorMsgId, role: 'operator', content: displayLabel })
    setInFlight(true)
    setError(null)
    try {
      if (target.kind === 'patch_plant') {
        const body: Record<string, unknown> = {}
        if (target.field === 'name') {
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
          body[target.field] = value
          if (step.onboardingStep.kind === 'wizard_bleach') {
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

  async function handleComposerSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!composerText.trim() || !initial.plant) return
    if (step.kind === 'onboarding' && step.onboardingStep) {
      // Onboarding step composer (e.g., plant name free-text).
      const text = composerText.trim()
      setComposerText('')
      await submitOnboardingAnswer(text, text)
      return
    }
    if (!step.composer) return
    const text = composerText.trim()
    setComposerText('')
    const operatorMsgId = cryptoRandomId()
    appendTranscript({ id: operatorMsgId, role: 'operator', content: text })
    setInFlight(true)
    setError(null)
    try {
      const res = await fetch('/api/spottingboard/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plant_id: initial.plant.plantId,
          module: step.composer.captureModule,
          body: text,
          title: deriveTitle(text),
          chemistry_scope: ['uncategorized'],
        }),
      })
      if (!res.ok) throw new Error(`capture_failed_${res.status}`)
      const data = await res.json().catch(() => null) as
        | { governance_applied?: { safety_label?: string }; classifier?: { hard_block?: boolean } }
        | null
      const isUnsafe =
        data?.governance_applied?.safety_label === 'unsafe_do_not_use' ||
        data?.classifier?.hard_block === true
      markPillOnLastOperator(
        operatorMsgId,
        isUnsafe
          ? { label: 'Captured · Unsafe — do not use', tone: 'unsafe' }
          : { label: step.composer.successPillLabel, tone: 'needs-review' },
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

  // ── Render helpers ─────────────────────────────────────────────────────

  function renderProgress() {
    const plant = initial.plant
    const dna: Array<{ label: string; done: boolean }> = plant
      ? [
          { label: 'Plant name', done: !!plant.name },
          { label: 'Solvent', done: plant.solvents.length > 0 },
          { label: 'Board', done: !!plant.board },
          { label: 'Primary skill', done: !!plant.skillLevel },
          { label: 'Bleach policy', done: plant.wizardCompletedAt !== null },
        ]
      : [{ label: 'Plant name', done: false }]

    return (
      <aside className="sb-guided-progress" aria-label="Plant Brain progress">
        <header className="sb-guided-progress-head">
          <h2>Plant Brain</h2>
          <p>{plant ? `${plant.name} · ${plant.role}` : 'Not set up yet'}</p>
        </header>

        <section aria-label="Plant DNA progress">
          <h3 className="sb-guided-progress-section-title">Plant DNA</h3>
          <ul className="sb-guided-progress-list">
            {dna.map(d => (
              <li key={d.label} data-done={d.done ? 'true' : undefined}>
                <span aria-hidden="true">{d.done ? '✓' : '○'}</span> {d.label}
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Brain item counts">
          <dl className="sb-guided-counts">
            <dt>Brain items</dt><dd>{formatCount(initial.totalItems)}</dd>
            <dt>Awaiting review</dt><dd>{formatCount(initial.queueCount)}</dd>
          </dl>
        </section>

        {initial.recentItems.length > 0 ? (
          <section aria-label="Recent captures">
            <h3 className="sb-guided-progress-section-title">Recent captures</h3>
            <ul className="sb-guided-recent">
              {initial.recentItems.map(item => (
                <li key={item.id}>
                  <span className="sb-guided-recent-title">{item.title?.trim() || trimBody(item.body)}</span>
                  <span className={`sb-pill sb-pill-${safetyTone(item.safety_label)}`}>
                    {safetyLabelCopy(item.safety_label)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-label="Quick links" className="sb-quick-action-row">
          <Link href="/spottingboard/library">Library</Link>
          <Link href="/spottingboard/supervisor">Review</Link>
          <Link href="/spottingboard/export">Export</Link>
          <Link href="/spottingboard/profile">Profile</Link>
        </section>
      </aside>
    )
  }

  function renderTranscript() {
    return (
      <ol
        ref={transcriptRef}
        role="log"
        aria-live="polite"
        aria-label="Guided dashboard conversation"
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

  function renderQuestionMeta() {
    if (!step.why && !step.whatUpdates) return null
    return (
      <ul className="sb-question-meta" aria-label="About this question">
        {step.why ? <li><strong>Why I&apos;m asking:</strong> {step.why}</li> : null}
        {step.whatUpdates ? <li><strong>What this updates:</strong> {step.whatUpdates}</li> : null}
      </ul>
    )
  }

  function renderChips() {
    // Onboarding step uses its own chip array (multi-select aware).
    if (step.kind === 'onboarding' && step.onboardingStep) {
      const onboardingChips = step.onboardingStep.chips
      if (onboardingChips.length === 0 && step.chips.length === 0) return null
      return (
        <div className="sb-intake-chips" role="group" aria-label="Suggested answers">
          {onboardingChips.map(chip => {
            const isSelected = step.onboardingStep?.multiSelect && selectedChips.has(chip.label)
            return (
              <button
                key={chip.label}
                type="button"
                className="sb-intake-chip"
                data-selected={isSelected ? 'true' : undefined}
                disabled={inFlight}
                onClick={() => handleOnboardingChip(chip)}
              >
                {chip.label}
              </button>
            )
          })}
          {step.onboardingStep.multiSelect ? (
            <button
              type="button"
              className="sb-intake-chip-confirm"
              disabled={inFlight || selectedChips.size === 0}
              onClick={handleMultiSelectConfirm}
            >
              Confirm ({selectedChips.size})
            </button>
          ) : null}
          {step.chips.map(chip => (
            <button
              key={chip.label}
              type="button"
              className="sb-intake-chip"
              disabled={inFlight}
              onClick={() => handleChip(chip)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )
    }

    if (step.chips.length === 0) return null
    return (
      <div className="sb-intake-chips" role="group" aria-label="Suggested actions">
        {step.chips.map(chip => (
          <button
            key={chip.label}
            type="button"
            className="sb-intake-chip"
            disabled={inFlight}
            onClick={() => handleChip(chip)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    )
  }

  function renderComposer() {
    const onboardingComposerAllowed = step.kind === 'onboarding' && step.onboardingStep?.allowFreeText
    const showComposer = onboardingComposerAllowed || !!step.composer
    if (!showComposer) return null
    const placeholder = onboardingComposerAllowed
      ? step.onboardingStep!.composerPlaceholder
      : step.composer!.placeholder
    return (
      <form className="sb-intake-composer" onSubmit={handleComposerSubmit}>
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
          placeholder={placeholder}
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

  return (
    <div className="sb-guided-dashboard">
      <section className="sb-guided-main" aria-label="Next best question">
        <header className="sb-guided-header">
          <p className="sb-guided-kicker">What should we figure out next?</p>
          <h1>{initial.plant?.name ?? 'Your plant brain'}</h1>
          {initial.plant ? (
            <p className="sb-guided-sub">{initial.plant.role} · AI-led plant brain build</p>
          ) : null}
        </header>

        {!skipped ? (
          <article className="sb-next-question-card" aria-label="Current question">
            {renderQuestionMeta()}
            {renderTranscript()}
            {error ? <p className="sb-intake-error" role="alert">{error}</p> : null}
            {renderChips()}
            {renderComposer()}
          </article>
        ) : (
          <article className="sb-next-question-card sb-next-question-skipped" aria-label="Skipped">
            <p>You skipped this one. Refresh the page when you want the next best question.</p>
            <button
              type="button"
              className="sb-intake-chip"
              onClick={() => { setSkipped(false); router.refresh() }}
            >
              Show me another
            </button>
          </article>
        )}
      </section>
      {renderProgress()}
    </div>
  )
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

function formatCount(n: number): string {
  return n >= COUNT_CAP ? `${COUNT_CAP}+` : String(n)
}

function trimBody(body: string): string {
  const trimmed = body.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= 48) return trimmed
  return trimmed.slice(0, 45) + '…'
}

function safetyTone(label: string): 'plant-local' | 'needs-review' | 'unsafe' {
  if (label === 'unsafe_do_not_use' || label === 'escalation_required') return 'unsafe'
  if (label === 'source_backed' || label === 'reviewed_for_plant_use') return 'plant-local'
  return 'needs-review'
}

function safetyLabelCopy(label: string): string {
  switch (label) {
    case 'source_backed': return 'Source-backed'
    case 'reviewed_for_plant_use': return 'Reviewed for plant use'
    case 'needs_source_review': return 'Needs source review'
    case 'escalation_required': return 'Escalation required'
    case 'unsafe_do_not_use': return 'Unsafe — do not use'
    default: return label
  }
}
