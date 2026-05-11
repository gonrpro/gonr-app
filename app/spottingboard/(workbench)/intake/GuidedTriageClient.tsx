'use client'

// app/spottingboard/(workbench)/intake/GuidedTriageClient.tsx — TASK-188 v0
//
// First consumer of lib/spottingboard/scenario-engine/. Owns no domain
// logic — drives the engine's session through chip + free-text answers,
// calls resolveTriage when the engine reports no next step, and renders the
// resolution (protocol_match / plant_local_draft / escalation_required)
// with the engine's commit boundary for plant-local saves.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  answerStep,
  nextStep,
  startSession,
} from '@/lib/spottingboard/scenario-engine/session'
import { resolveTriage } from '@/lib/spottingboard/scenario-engine/resolve'
import { commitAsPlantLocal } from '@/lib/spottingboard/scenario-engine/persist'
import type {
  EscalationRequired,
  GuidedCaptureSession,
  PlantLocalDraft,
  RecommendedProtocolPreview,
  ScenarioResolution,
  ScenarioStep,
  ScenarioStepChip,
  TriageAnswer,
  TriageField,
} from '@/lib/spottingboard/scenario-engine/types'

declare global {
  interface Window {
    SpeechRecognition?: unknown
    webkitSpeechRecognition?: unknown
  }
}

interface Props {
  plantId: string
  plantName: string
  role: 'owner' | 'operator' | 'spotter' | string
}

type Phase = 'asking' | 'resolving' | 'resolved' | 'committing' | 'committed'

interface TranscriptMessage {
  id: string
  role: 'assistant' | 'operator'
  content: string
  pill?: { label: string; tone: 'plant-dna' | 'plant-local' | 'needs-review' | 'unsafe' | 'source-backed' }
}

export function GuidedTriageClient({ plantId, plantName, role }: Props) {
  const router = useRouter()
  const [session, setSession] = useState<GuidedCaptureSession>(() =>
    startSession({ plantId, role }),
  )
  const [phase, setPhase] = useState<Phase>('asking')
  const [resolution, setResolution] = useState<ScenarioResolution | null>(null)
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [operatorNote, setOperatorNote] = useState('')
  const [textInputValue, setTextInputValue] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [inFlight, setInFlight] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const seededStepRef = useRef<string | null>(null)
  const transcriptRef = useRef<HTMLOListElement | null>(null)

  const currentStep = phase === 'asking' ? nextStep(session) : null

  useEffect(() => {
    if (typeof window === 'undefined') return
    setVoiceSupported(
      typeof window.SpeechRecognition !== 'undefined' ||
      typeof window.webkitSpeechRecognition !== 'undefined',
    )
  }, [])

  // Seed the assistant prompt when entering a new step.
  useEffect(() => {
    if (!currentStep) return
    if (seededStepRef.current === currentStep.id) return
    seededStepRef.current = currentStep.id
    appendTranscript({ id: cryptoRandomId(), role: 'assistant', content: currentStep.prompt })
  }, [currentStep])

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

  function recordAnswer(field: TriageField, value: string, label: string, source: TriageAnswer['source']) {
    const answer: TriageAnswer = {
      field,
      value,
      label,
      source,
      confidence: value === 'unknown' ? 'unknown' : 'explicit',
    }
    appendTranscript({ id: cryptoRandomId(), role: 'operator', content: label })
    setSession(prev => {
      const next = answerStep(prev, answer)
      // If this was the last step, fire resolve from the state-setter so we
      // don't need an additional useEffect on session changes (which would
      // require runResolve in its dep list).
      if (nextStep(next) === null) {
        void runResolveWith(next)
      }
      return next
    })
    setShowTextInput(false)
    setTextInputValue('')
  }

  function handleChip(field: TriageField, chip: ScenarioStepChip) {
    recordAnswer(field, chip.value, chip.label, 'chip')
  }

  function handleTextSubmit(e: React.FormEvent, field: TriageField) {
    e.preventDefault()
    const trimmed = textInputValue.trim()
    if (!trimmed) return
    recordAnswer(field, slugify(trimmed), trimmed, 'text')
  }

  async function runResolveWith(s: GuidedCaptureSession) {
    setPhase('resolving')
    setError(null)
    appendTranscript({
      id: cryptoRandomId(),
      role: 'assistant',
      content: 'Based on what is in the protocol library so far, checking the closest match…',
    })
    try {
      const result = await resolveTriage(s)
      setResolution(result)
      setPhase('resolved')
      setSession(prev => ({ ...prev, status: 'resolved' }))
      announceResolution(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'resolve_failed')
      appendTranscript({
        id: cryptoRandomId(),
        role: 'assistant',
        content: "I couldn't resolve that scenario — let's try again.",
      })
      setPhase('asking')
    }
  }

  function announceResolution(result: ScenarioResolution) {
    if (result.kind === 'protocol_match') {
      appendTranscript({
        id: cryptoRandomId(),
        role: 'assistant',
        content: 'Found a matching protocol. Preview below — open the full view for steps and materials.',
      })
    } else if (result.kind === 'plant_local_draft') {
      appendTranscript({
        id: cryptoRandomId(),
        role: 'assistant',
        content: result.body,
      })
    } else {
      appendTranscript({
        id: cryptoRandomId(),
        role: 'assistant',
        content: result.reason,
      })
    }
  }

  async function commitDraft(draft: PlantLocalDraft) {
    if (role === 'spotter') return
    setPhase('committing')
    setInFlight(true)
    setError(null)
    const operatorMsgId = cryptoRandomId()
    if (operatorNote.trim()) {
      appendTranscript({ id: operatorMsgId, role: 'operator', content: operatorNote.trim() })
    } else {
      appendTranscript({ id: operatorMsgId, role: 'operator', content: '(Saving scenario as captured)' })
    }
    try {
      const { safetyLabel, hardBlock } = await commitAsPlantLocal({
        session,
        draft,
        operatorNote,
      })
      const isUnsafe = hardBlock || safetyLabel === 'unsafe_do_not_use'
      markPillOnLastOperator(
        operatorMsgId,
        isUnsafe
          ? { label: 'Captured · Unsafe — do not use', tone: 'unsafe' }
          : { label: 'Captured · Plant-local · Needs supervisor review', tone: 'needs-review' },
      )
      appendTranscript({
        id: cryptoRandomId(),
        role: 'assistant',
        content: isUnsafe
          ? 'Saved, but the classifier flagged a safety issue. The row is marked Unsafe and pulled out of the runtime path.'
          : 'Saved as plant-local. A supervisor will review it before it can become runtime guidance.',
      })
      setPhase('committed')
      setSession(prev => ({ ...prev, status: 'committed' }))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'commit_failed')
      appendTranscript({
        id: cryptoRandomId(),
        role: 'assistant',
        content: "I couldn't save that — let's try again.",
      })
      setPhase('resolved')
    } finally {
      setInFlight(false)
    }
  }

  function commitEscalationAsDraft(escalation: EscalationRequired) {
    if (role === 'spotter') return
    const stain = escalation.capturedContext.find(a => a.field === 'stain')
    const fabric = escalation.capturedContext.find(a => a.field === 'fabric')
    const prior = escalation.capturedContext.find(a => a.field === 'prior_treatment')
    const title = `${stain?.label ?? 'Unknown stain'} on ${(fabric?.label ?? 'unknown fabric').toLowerCase()} (${prior?.label?.toLowerCase() ?? 'unknown treatment'})`
    const body = [
      `Stain: ${stain?.label ?? 'Unknown'}.`,
      `Fabric: ${fabric?.label ?? 'Unknown'}.`,
      `Already treated: ${prior?.label ?? 'Unknown'}.`,
      `Escalation reason: ${escalation.reason}`,
    ].join('\n')
    void commitDraft({
      kind: 'plant_local_draft',
      title,
      body,
      safetyLabel: 'needs_source_review',
      provenance: 'plant_local_draft',
      needsSupervisorReview: true,
      capturedContext: escalation.capturedContext,
    })
  }

  function restart() {
    setSession(startSession({ plantId, role }))
    setResolution(null)
    setTranscript([])
    setOperatorNote('')
    setTextInputValue('')
    setShowTextInput(false)
    setError(null)
    seededStepRef.current = null
    setPhase('asking')
  }

  // ── Render helpers ─────────────────────────────────────────────────────

  function renderTranscript() {
    if (transcript.length === 0) return null
    return (
      <ol
        ref={transcriptRef}
        role="log"
        aria-live="polite"
        aria-label="Guided triage conversation"
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

  function renderStepMeta(step: ScenarioStep) {
    return (
      <ul className="sb-question-meta" aria-label="About this question">
        <li><strong>Why I&apos;m asking:</strong> {step.why}</li>
        <li><strong>What this updates:</strong> {step.whatUpdates}</li>
      </ul>
    )
  }

  function renderActiveStep(step: ScenarioStep) {
    return (
      <article className="sb-triage-result-card" aria-label="Current question">
        {renderStepMeta(step)}
        <div className="sb-intake-chips" role="group" aria-label="Suggested answers">
          {step.chips.map(chip => (
            <button
              key={chip.value}
              type="button"
              className="sb-intake-chip"
              data-risk={chip.risk}
              disabled={inFlight}
              onClick={() => handleChip(step.field, chip)}
            >
              {chip.label}
            </button>
          ))}
          {step.allowText ? (
            <button
              type="button"
              className="sb-intake-chip sb-intake-chip-text"
              disabled={inFlight}
              onClick={() => setShowTextInput(true)}
            >
              Type your own
            </button>
          ) : null}
        </div>
        {showTextInput && step.allowText ? (
          <form className="sb-intake-composer sb-intake-composer-inline" onSubmit={e => handleTextSubmit(e, step.field)}>
            <input
              type="text"
              className="sb-intake-textarea"
              aria-label="Type your answer"
              placeholder="Type a value not listed above"
              value={textInputValue}
              onChange={e => setTextInputValue(e.target.value)}
              disabled={inFlight}
              autoFocus
            />
            <button type="submit" className="sb-intake-send" disabled={inFlight || !textInputValue.trim()}>
              {inFlight ? '…' : 'Use this'}
            </button>
          </form>
        ) : null}
      </article>
    )
  }

  function renderProtocolMatch(match: RecommendedProtocolPreview) {
    return (
      <article className="sb-triage-result-card" aria-label="Protocol preview">
        <header>
          <p className="sb-triage-card-eyebrow">Structured protocol preview</p>
          <h2>{match.title}</h2>
          <div className="sb-triage-card-pills">
            <span className={`sb-pill sb-pill-${provenanceTone(match.provenance)}`}>
              {provenanceLabel(match.provenance)}
            </span>
            {match.safetyLabel ? (
              <span className={`sb-pill sb-pill-${safetyTone(match.safetyLabel)}`}>
                {safetyLabelCopy(match.safetyLabel)}
              </span>
            ) : null}
          </div>
        </header>
        {match.summary ? <p className="sb-triage-card-body">{trimLong(match.summary, 600)}</p> : null}
        {match.caveats.length > 0 ? (
          <ul className="sb-triage-card-caveats">
            {match.caveats.map((c, i) => <li key={i}>⚠ {c}</li>)}
          </ul>
        ) : null}
        <p className="sb-triage-card-foot">
          Library protocol preview. Open the full solve view for steps, materials, and warnings.
        </p>
        <div className="sb-triage-card-actions">
          {match.solveLinkParams ? (
            <Link
              className="sb-link-button"
              href={`/solve?stain=${encodeURIComponent(match.solveLinkParams.stain)}&surface=${encodeURIComponent(match.solveLinkParams.surface)}`}
            >
              Open full protocol
            </Link>
          ) : null}
          {role !== 'spotter' ? (
            <button
              type="button"
              className="sb-intake-chip"
              disabled={inFlight}
              onClick={() => {
                const draft: PlantLocalDraft = {
                  kind: 'plant_local_draft',
                  title: match.title,
                  body: [
                    `Stain: ${match.stain}.`,
                    `Fabric: ${match.fabric}.`,
                    `Operator chose to save this scenario alongside the library protocol.`,
                    match.caveats.length > 0 ? `Library caveats: ${match.caveats.join(' · ')}` : null,
                  ].filter(Boolean).join('\n'),
                  safetyLabel: 'needs_source_review',
                  provenance: 'plant_local_draft',
                  needsSupervisorReview: true,
                  capturedContext: session.answers,
                }
                setResolution(draft)
              }}
            >
              Save as plant-local note
            </button>
          ) : null}
          <button type="button" className="sb-intake-chip" onClick={restart}>
            Triage another
          </button>
        </div>
      </article>
    )
  }

  function renderPlantLocalDraft(draft: PlantLocalDraft) {
    if (role === 'spotter') {
      return renderSpotterNotice()
    }
    return (
      <article className="sb-triage-result-card" aria-label="Plant-local capture">
        <p className="sb-triage-card-eyebrow">Plant-local capture</p>
        <h2>{draft.title}</h2>
        <ul className="sb-question-meta">
          <li><strong>What:</strong> {draft.body}</li>
          <li><strong>Saves as:</strong> Plant-local · needs supervisor review</li>
        </ul>
        <form
          className="sb-intake-composer"
          onSubmit={e => { e.preventDefault(); void commitDraft(draft) }}
        >
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
            aria-label="Additional notes (optional)"
            placeholder="Optional: any extra detail — what you would do, what to escalate."
            value={operatorNote}
            onChange={e => setOperatorNote(e.target.value)}
            disabled={inFlight}
            rows={3}
          />
          <button type="submit" className="sb-intake-send" disabled={inFlight}>
            {inFlight ? '…' : 'Save scenario'}
          </button>
        </form>
      </article>
    )
  }

  function renderEscalation(escalation: EscalationRequired) {
    return (
      <article className="sb-triage-result-card sb-triage-result-escalation" aria-label="Escalation required">
        <p className="sb-triage-card-eyebrow">Escalation required</p>
        <h2>Supervisor judgment needed</h2>
        <ul className="sb-question-meta">
          <li><strong>Why:</strong> {escalation.reason}</li>
          <li>
            <strong>Status:</strong>{' '}
            <span className={`sb-pill sb-pill-${escalation.safetyLabel === 'hard_block' ? 'unsafe' : 'needs-review'}`}>
              {escalation.safetyLabel === 'hard_block' ? 'Hard block' : escalation.safetyLabel === 'caution' ? 'Caution' : 'Unknown'}
            </span>
          </li>
        </ul>
        <p className="sb-triage-card-body">
          Library protocols are not safe to auto-suggest for this scenario. Route through supervisor review with the captured chip context.
        </p>
        <div className="sb-triage-card-actions">
          <Link className="sb-link-button" href="/spottingboard/supervisor">Open Supervisor Review</Link>
          {role !== 'spotter' ? (
            <button
              type="button"
              className="sb-intake-chip"
              disabled={inFlight}
              onClick={() => commitEscalationAsDraft(escalation)}
            >
              Save scenario for supervisor
            </button>
          ) : null}
          <button type="button" className="sb-intake-chip" onClick={restart}>
            Triage another
          </button>
        </div>
      </article>
    )
  }

  function renderSpotterNotice() {
    return (
      <article className="sb-triage-result-card" aria-label="Spotter notice">
        <p>
          Capture needs owner or operator role. Ask your supervisor to record the scenario, or look it up in
          the <Link href="/spottingboard/library">Library</Link>.
        </p>
        <button type="button" className="sb-intake-chip" onClick={restart}>Triage another</button>
      </article>
    )
  }

  function renderCommitted() {
    return (
      <article className="sb-triage-result-card" aria-label="Captured">
        <p>Saved. The next supervisor pass will see it in <Link href="/spottingboard/supervisor">Review</Link>.</p>
        <button type="button" className="sb-intake-chip" onClick={restart}>Triage another</button>
      </article>
    )
  }

  function renderProgress() {
    const fields: { field: TriageField; label: string }[] = [
      { field: 'stain', label: 'Stain' },
      { field: 'fabric', label: 'Fabric' },
      { field: 'prior_treatment', label: 'Already treated' },
    ]
    return (
      <ul className="sb-triage-progress" aria-label="Triage progress">
        {fields.map(f => {
          const answer = session.answers.find(a => a.field === f.field)
          return (
            <li key={f.field} data-done={answer ? 'true' : undefined}>
              <span aria-hidden="true">{answer ? '✓' : '○'}</span> {f.label}
              {answer ? <span className="sb-triage-progress-value"> · {answer.label}</span> : null}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="sb-triage-cockpit">
      <header className="sb-triage-header">
        <p className="sb-guided-kicker">Guided capture</p>
        <h1>{plantName}</h1>
        <p className="sb-guided-sub">Spotter rule · plant-local</p>
      </header>

      {renderProgress()}

      <section className="sb-triage-main" aria-label="Guided triage">
        {renderTranscript()}
        {error ? <p className="sb-intake-error" role="alert">{error}</p> : null}
        {phase === 'asking' && currentStep ? renderActiveStep(currentStep) : null}
        {phase === 'resolving' ? (
          <p className="sb-triage-loading" aria-live="polite">Looking up the closest protocol…</p>
        ) : null}
        {phase === 'resolved' && resolution?.kind === 'protocol_match' ? renderProtocolMatch(resolution) : null}
        {phase === 'resolved' && resolution?.kind === 'plant_local_draft' ? renderPlantLocalDraft(resolution) : null}
        {phase === 'resolved' && resolution?.kind === 'escalation_required' ? renderEscalation(resolution) : null}
        {phase === 'committing' ? (
          <p className="sb-triage-loading" aria-live="polite">Saving scenario…</p>
        ) : null}
        {phase === 'committed' ? renderCommitted() : null}
      </section>
    </div>
  )
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function trimLong(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}

function provenanceTone(p: RecommendedProtocolPreview['provenance']): 'source-backed' | 'plant-local' | 'needs-review' {
  if (p === 'source_backed') return 'source-backed'
  if (p === 'plant_confirmed') return 'plant-local'
  return 'needs-review'
}

function provenanceLabel(p: RecommendedProtocolPreview['provenance']): string {
  switch (p) {
    case 'source_backed': return 'Source-backed protocol'
    case 'plant_confirmed': return 'Plant-confirmed'
    case 'mixed': return 'Mixed evidence'
    default: return p
  }
}

function safetyTone(label: string): 'plant-local' | 'needs-review' | 'unsafe' | 'source-backed' {
  if (label === 'unsafe_do_not_use' || label === 'escalation_required') return 'unsafe'
  if (label === 'source_backed') return 'source-backed'
  if (label === 'reviewed_for_plant_use') return 'plant-local'
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

