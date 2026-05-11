'use client'

// app/spottingboard/(workbench)/setup/ChatSetupClient.tsx — TASK-189 v0
//
// Chat-first setup surface. Drives the 4-layer architecture:
//   1. Interview Orchestrator   → POST /api/spottingboard/setup/orchestrator
//   2. Structured Extractor     → POST /api/spottingboard/setup/extractor
//   3. Deterministic validator  → setup/validators.ts (local)
//   4. Human confirmation       → inline cards rendered from candidates
//
// State machine (compact):
//   asking      — orchestrator has rendered the next question; awaiting operator answer
//   extracting  — operator just answered; extractor + validator running
//   confirming  — at least one candidate is pending operator action
//   advancing   — operator confirmed/rejected all candidates; loop back to orchestrator
//   capped      — session hit max turns
//
// CSS lesson (from TASK-188 regression): all primitives needed by this
// surface are defined in `chat-setup.css` (scoped under .sb-chat-setup), so
// the route renders correctly without depending on onboarding.css.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type {
  PlantBuildRecord,
  PlantProfileRecord,
} from '@/lib/spottingboard/plant-build-engine/types'
import { buildPlantBrainCompleteness } from '@/lib/spottingboard/plant-build-engine/views'
import { buildPhaseTargets, expectedRecordKindForPhase, phaseDisplayName, pickCurrentPhase } from './setup-spine'
import { validateCandidates } from './validators'
import { persistRecord } from './storage-adapter'
import type {
  CandidateRecord,
  OpenFollowup,
  OrchestratorResponse,
  ExtractorResponse,
  SetupPhaseId,
  TranscriptTurn,
  ValidatorFlag,
} from './types'

interface Props {
  plantId: string
  plantName: string
  role: 'owner' | 'operator' | 'spotter' | string
  initialRecords: PlantBuildRecord[]
}

declare global {
  interface Window {
    SpeechRecognition?: unknown
    webkitSpeechRecognition?: unknown
  }
}

export function ChatSetupClient({ plantId, plantName, role, initialRecords }: Props) {
  const [records, setRecords] = useState<PlantBuildRecord[]>(initialRecords)
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([])
  const [pendingCandidates, setPendingCandidates] = useState<CandidateRecord[]>([])
  const [openFollowups, setOpenFollowups] = useState<OpenFollowup[]>([])
  const [safetyFlags, setSafetyFlags] = useState<ValidatorFlag[]>([])
  const [nextQuestion, setNextQuestion] = useState<OrchestratorResponse['nextQuestion'] | null>(null)
  const [progressNote, setProgressNote] = useState<string | null>(null)
  const [composerText, setComposerText] = useState('')
  const [inFlight, setInFlight] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userTurnCount, setUserTurnCount] = useState(0)
  const [capped, setCapped] = useState(false)
  const [phase, setPhase] = useState<SetupPhaseId>('plant_profile')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const transcriptRef = useRef<HTMLOListElement | null>(null)
  const bootRef = useRef(false)

  const phaseTargets = useMemo(() => buildPhaseTargets(records), [records])
  const completeness = useMemo(() => buildPlantBrainCompleteness(records, profileFor(records)), [records])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setVoiceSupported(
      typeof window.SpeechRecognition !== 'undefined' ||
      typeof window.webkitSpeechRecognition !== 'undefined',
    )
  }, [])

  useEffect(() => {
    setPhase(pickCurrentPhase(phaseTargets))
  }, [phaseTargets])

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcript.length, pendingCandidates.length])

  // Boot: ask the orchestrator for the opening question.
  useEffect(() => {
    if (bootRef.current) return
    bootRef.current = true
    void askOrchestrator()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function askOrchestrator() {
    setInFlight(true)
    setError(null)
    try {
      const target = phaseTargets.find(t => t.phaseId === phase)
      const res = await fetch('/api/spottingboard/setup/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plant_id: plantId,
          plant_summary: profileSummary(records, plantName),
          current_phase: phase,
          phase_target: target,
          captured_records_summary: capturedSummary(records),
          recent_transcript: transcript.slice(-6).map(t => ({ role: t.role, content: t.content })),
          open_followups: openFollowups,
          safety_flags: safetyFlags,
          user_turn_count: userTurnCount,
        }),
      })
      if (!res.ok) {
        if (res.status === 503) throw new Error('setup_llm_not_configured')
        throw new Error(`orchestrator_${res.status}`)
      }
      const data = (await res.json()) as RawOrchestratorResponse
      const orchestrator = normalizeOrchestratorResponse(data)
      if (!orchestrator) throw new Error('orchestrator_invalid_shape')
      setNextQuestion(orchestrator.nextQuestion)
      setProgressNote(orchestrator.progressNote ?? null)
      setCapped(!!orchestrator.cappedSession)
      appendAssistantTurn(orchestrator.nextQuestion.prompt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'orchestrator_failed')
    } finally {
      setInFlight(false)
    }
  }

  async function handleSubmit(answer: string, source: 'chip' | 'text') {
    if (!answer.trim() && source === 'text') return
    if (capped) return

    appendOperatorTurn(answer)
    setComposerText('')
    setUserTurnCount(n => n + 1)
    setInFlight(true)
    setError(null)

    try {
      const chunk = [
        ...transcript.slice(-1).map(t => ({ role: t.role, content: t.content })),
        { role: 'operator' as const, content: answer },
      ]
      const extractorRes = await fetch('/api/spottingboard/setup/extractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plant_id: plantId,
          current_phase: phase,
          transcript_chunk: chunk,
          schema_hint: expectedRecordKindForPhase(phase) ?? 'rule',
        }),
      })
      if (!extractorRes.ok) {
        if (extractorRes.status === 503) throw new Error('setup_llm_not_configured')
        throw new Error(`extractor_${extractorRes.status}`)
      }
      const rawExtractor = (await extractorRes.json()) as RawExtractorResponse
      const extractor = normalizeExtractorResponse(rawExtractor, transcript.length)
      if (!extractor) throw new Error('extractor_invalid_shape')

      const validation = validateCandidates(extractor.candidates, {
        existingRecords: records,
        existingFollowups: openFollowups,
      })
      setOpenFollowups(prev => [...prev, ...validation.newOpenFollowups])
      setSafetyFlags(prev => uniq([...prev, ...validation.newSafetyFlags]))

      if (validation.approved.length > 0) {
        setPendingCandidates(prev => [...prev, ...validation.approved])
      } else {
        // No candidates produced (vague answer); ask orchestrator again.
        await askOrchestrator()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'extractor_failed')
      appendAssistantTurn("I couldn't structure that — let's try a different angle. Could you say it another way?")
    } finally {
      setInFlight(false)
    }
  }

  async function confirmCandidate(c: CandidateRecord, decision: 'confirmed' | 'rejected' | 'edited', edits?: Record<string, unknown>) {
    setPendingCandidates(prev => prev.map(p => p.id === c.id ? { ...p, status: decision, decidedAt: new Date().toISOString() } : p))
    if (decision === 'rejected') {
      // No persist on reject; loop back to next question.
      void afterDecision()
      return
    }
    const merged: CandidateRecord = decision === 'edited' && edits
      ? { ...c, fields: { ...c.fields, ...edits } }
      : c
    setInFlight(true)
    try {
      const record = candidateToRecord(merged, plantId)
      const result = await persistRecord(record)
      // Refresh records optimistically.
      setRecords(prev => [...prev, { ...record, id: result.itemId, review: { ...record.review, safetyLabel: (result.safetyLabel as PlantBuildRecord['review']['safetyLabel']) } }])
      void afterDecision()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'persist_failed')
    } finally {
      setInFlight(false)
    }
  }

  async function afterDecision() {
    // After any decision, if no candidates remain pending, advance.
    const remaining = pendingCandidates.filter(p => p.status === 'pending').length
    if (remaining <= 1) {
      await askOrchestrator()
    }
  }

  function appendAssistantTurn(content: string) {
    setTranscript(prev => [...prev, {
      id: randId(),
      role: 'assistant',
      content,
      at: new Date().toISOString(),
    }])
  }

  function appendOperatorTurn(content: string) {
    setTranscript(prev => [...prev, {
      id: randId(),
      role: 'operator',
      content,
      at: new Date().toISOString(),
    }])
  }

  // ── Render helpers ────────────────────────────────────────────────────

  function renderProgressRail() {
    return (
      <ol className="sb-setup-progress" aria-label="Setup progress">
        {phaseTargets.map(t => (
          <li
            key={t.phaseId}
            data-active={t.phaseId === phase ? 'true' : undefined}
            data-covered={t.isCovered ? 'true' : undefined}
          >
            <span aria-hidden="true">{t.isCovered ? '✓' : t.phaseId === phase ? '◉' : '○'}</span>
            <span>{phaseDisplayName(t.phaseId)}</span>
            {t.minSignalCount > 0 ? (
              <span className="sb-setup-progress-count">
                {Math.min(t.currentSignalCount, t.minSignalCount)}/{t.minSignalCount}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    )
  }

  function renderTranscript() {
    return (
      <ol
        ref={transcriptRef}
        role="log"
        aria-live="polite"
        aria-label="Setup conversation"
        className="sb-chat-transcript"
      >
        {transcript.map(t => (
          <li key={t.id} data-role={t.role}>
            <div className="sb-chat-bubble">
              <span className="sb-chat-bubble-role">{t.role === 'assistant' ? 'Assistant' : 'You'}</span>
              <p>{t.content}</p>
            </div>
          </li>
        ))}
      </ol>
    )
  }

  function renderPendingCandidates() {
    const pending = pendingCandidates.filter(p => p.status === 'pending')
    if (pending.length === 0) return null
    return (
      <section className="sb-chat-candidates" aria-label="Confirm what I heard">
        <h2>I heard the following — is each right?</h2>
        {pending.map(c => (
          <article key={c.id} className="sb-chat-candidate-card" data-kind={c.kind} data-flags={c.safetyFlags.join(' ') || undefined}>
            <header>
              <span className="sb-chat-candidate-kind">{c.kind}</span>
              {c.safetyFlags.length > 0 ? (
                <span className="sb-chat-candidate-flags">{c.safetyFlags.join(' · ')}</span>
              ) : null}
            </header>
            <pre className="sb-chat-candidate-fields">{JSON.stringify(c.fields, null, 2)}</pre>
            <p className="sb-chat-candidate-conf">
              Confidence {(c.confidence * 100).toFixed(0)}% · {c.safetyFlags.length > 0 ? 'safety flagged' : 'ok'}
            </p>
            <div className="sb-chat-candidate-actions">
              <button
                type="button"
                className="sb-chip sb-chip-primary"
                disabled={inFlight}
                onClick={() => void confirmCandidate(c, 'confirmed')}
              >
                Confirm
              </button>
              <button
                type="button"
                className="sb-chip"
                disabled={inFlight}
                onClick={() => {
                  const next = window.prompt('Edit the captured fields (JSON)', JSON.stringify(c.fields, null, 2))
                  if (!next) return
                  try {
                    const edits = JSON.parse(next) as Record<string, unknown>
                    void confirmCandidate(c, 'edited', edits)
                  } catch {
                    setError('invalid_json_edit')
                  }
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="sb-chip"
                disabled={inFlight}
                onClick={() => void confirmCandidate(c, 'rejected')}
              >
                Reject
              </button>
            </div>
          </article>
        ))}
      </section>
    )
  }

  function renderQuestion() {
    if (!nextQuestion) return null
    return (
      <section className="sb-chat-question" aria-label="Next question">
        <p className="sb-chat-question-meta">
          <strong>Why I&apos;m asking:</strong> {nextQuestion.whyAsking}
        </p>
        {nextQuestion.chips.length > 0 ? (
          <div className="sb-chip-row" role="group">
            {nextQuestion.chips.map(chip => (
              <button
                key={chip.value}
                type="button"
                className="sb-chip"
                disabled={inFlight || capped}
                onClick={() => void handleSubmit(chip.label, 'chip')}
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : null}
        {nextQuestion.allowText ? (
          <form
            className="sb-chat-composer"
            onSubmit={e => { e.preventDefault(); void handleSubmit(composerText, 'text') }}
          >
            <button
              type="button"
              className="sb-chat-mic"
              aria-label={voiceSupported ? 'Tap to talk' : 'Voice support coming soon'}
              aria-disabled={!voiceSupported}
              title={voiceSupported ? 'Tap to talk' : 'Voice support coming soon — typing works fine'}
            >🎙</button>
            <textarea
              className="sb-chat-textarea"
              aria-label="Your answer"
              placeholder="Type your answer…"
              value={composerText}
              onChange={e => setComposerText(e.target.value)}
              disabled={inFlight || capped}
              rows={2}
            />
            <button type="submit" className="sb-chip sb-chip-primary" disabled={inFlight || capped || !composerText.trim()}>
              {inFlight ? '…' : 'Send'}
            </button>
          </form>
        ) : null}
      </section>
    )
  }

  function renderBrainPreview() {
    return (
      <aside className="sb-chat-preview" aria-label="Plant Brain preview">
        <header>
          <h2>Plant Brain · {plantName}</h2>
          <p>{role} · {capturedCount(records)} record(s)</p>
        </header>
        <ul className="sb-chat-preview-counts">
          <li>Plant Profile · {records.filter(r => r.kind === 'plant_profile').length}</li>
          <li>Inventory · {records.filter(r => r.kind === 'inventory').length}</li>
          <li>Rules · {records.filter(r => r.kind === 'rule').length}</li>
          <li>Training · {records.filter(r => r.kind === 'training').length}</li>
        </ul>
        {completeness.readyForDashboard ? (
          <Link className="sb-link-button" href="/spottingboard/dashboard">Open compiled dashboard</Link>
        ) : (
          <p className="sb-chat-preview-locked">
            Dashboard unlocks after the core minimums: {completeness.missingPhases.join(' · ')}.
          </p>
        )}
      </aside>
    )
  }

  return (
    <div className="sb-chat-setup">
      <header className="sb-chat-setup-header">
        <p className="sb-chat-setup-kicker">Plant brain interview</p>
        <h1>{plantName}</h1>
        {progressNote ? <p className="sb-chat-setup-note">{progressNote}</p> : null}
      </header>

      {renderProgressRail()}

      <section className="sb-chat-main">
        {renderTranscript()}
        {error ? <p className="sb-chat-error" role="alert">{describeError(error)}</p> : null}
        {renderPendingCandidates()}
        {!capped ? renderQuestion() : (
          <section className="sb-chat-question">
            <p>Session paused at the per-session cap. Reload to resume.</p>
            <a className="sb-chip sb-chip-primary" href="/spottingboard/setup">Resume</a>
          </section>
        )}
      </section>

      {renderBrainPreview()}
    </div>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────

function randId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}

function profileFor(records: PlantBuildRecord[]): PlantProfileRecord | null {
  return (records.find(r => r.kind === 'plant_profile') as PlantProfileRecord | undefined) ?? null
}

function capturedCount(records: PlantBuildRecord[]): number {
  return records.filter(r => r.review.status === 'approved' || r.review.status === 'needs_review').length
}

function profileSummary(records: PlantBuildRecord[], plantName: string): Record<string, unknown> {
  const profile = profileFor(records)
  return {
    name: plantName,
    services: profile?.services ?? [],
    languages: profile?.languages ?? [],
    staff: profile?.staff ?? [],
  }
}

function capturedSummary(records: PlantBuildRecord[]) {
  return records.slice(-12).map(r => ({
    kind: r.kind,
    id: r.id,
    summary: summaryFor(r),
    review_status: r.review.status,
  }))
}

function summaryFor(r: PlantBuildRecord): string {
  if (r.kind === 'plant_profile') return r.identity.name
  if (r.kind === 'inventory') return `${r.category}: ${r.name}`
  if (r.kind === 'rule') return `${r.category}: ${r.title}`
  return `${r.category}: ${r.title}`
}

function candidateToRecord(c: CandidateRecord, plantId: string): PlantBuildRecord {
  const now = new Date().toISOString()
  const base = {
    id: c.id,
    plantId,
    createdAt: now,
    updatedAt: now,
    provenance: c.provenance,
    review: c.review,
  }
  switch (c.kind) {
    case 'plant_profile': {
      const f = c.fields as Partial<PlantBuildRecord & { identity?: { name: string } }>
      return {
        ...base,
        kind: 'plant_profile',
        identity: (f as { identity?: { name: string } }).identity ?? { name: '' },
        services: (f as { services?: string[] }).services as never ?? [],
        languages: (f as { languages?: string[] }).languages ?? [],
      } as PlantBuildRecord
    }
    case 'inventory': {
      const f = c.fields as Record<string, unknown>
      return {
        ...base,
        kind: 'inventory',
        category: (f.category as never) ?? 'chemical',
        name: (f.name as string) ?? '(unnamed)',
        brand: f.brand as string | undefined,
        purpose: f.purpose as string | undefined,
        onHand: (f.onHand as boolean) ?? false,
        storageLocation: f.storageLocation as string | undefined,
        allowedUsers: f.allowedUsers as never,
        safetyLimits: f.safetyLimits as string[] | undefined,
        substitutes: f.substitutes as string[] | undefined,
        notes: f.notes as string | undefined,
      } as PlantBuildRecord
    }
    case 'rule': {
      const f = c.fields as Record<string, unknown>
      return {
        ...base,
        kind: 'rule',
        category: (f.category as never) ?? 'standard_procedure',
        scope: (f.scope as never) ?? {},
        title: (f.title as string) ?? '(untitled rule)',
        body: (f.body as string) ?? '',
        steps: f.steps as string[] | undefined,
        chemicalsUsed: f.chemicalsUsed as string[] | undefined,
        stopWhen: f.stopWhen as string | undefined,
        escalateWhen: f.escalateWhen as string | undefined,
      } as PlantBuildRecord
    }
    case 'training': {
      const f = c.fields as Record<string, unknown>
      return {
        ...base,
        kind: 'training',
        category: (f.category as never) ?? 'basics',
        audience: (f.audience as never) ?? 'all',
        title: (f.title as string) ?? '(untitled training)',
        body: (f.body as string) ?? '',
        examples: f.examples as never,
        languagesAvailable: (f.languagesAvailable as string[]) ?? [],
      } as PlantBuildRecord
    }
  }
}

interface RawOrchestratorResponse {
  next_question?: {
    phase_id?: string
    prompt?: string
    why_asking?: string
    expected_field_path?: string | null
    chips?: Array<{ value?: string; label?: string }>
    allow_text?: boolean
    is_pushback?: boolean
    pushback_reason?: string | null
  }
  progress_note?: string | null
  cappedSession?: boolean
  error?: string
}

function normalizeOrchestratorResponse(raw: RawOrchestratorResponse): OrchestratorResponse | null {
  const q = raw.next_question
  if (!q || !q.phase_id || !q.prompt) return null
  return {
    nextQuestion: {
      phaseId: q.phase_id as SetupPhaseId,
      prompt: q.prompt,
      whyAsking: q.why_asking ?? '',
      expectedFieldPath: q.expected_field_path ?? undefined,
      chips: (q.chips ?? []).filter((c): c is { value: string; label: string } =>
        typeof c?.value === 'string' && typeof c?.label === 'string',
      ),
      allowText: q.allow_text !== false,
      isPushback: q.is_pushback === true,
      pushbackReason: (q.pushback_reason as ValidatorFlag | null) ?? null,
    },
    progressNote: raw.progress_note ?? undefined,
    cappedSession: raw.cappedSession ?? false,
  }
}

interface RawExtractorResponse {
  candidates?: Array<{
    kind?: string
    fields?: Record<string, unknown>
    confidence?: number
    source_span?: { turn_index?: number; start?: number; end?: number }
    missing_fields?: string[]
    safety_flags?: string[]
  }>
  global_safety_flags?: string[]
  error?: string
}

function normalizeExtractorResponse(raw: RawExtractorResponse, transcriptLength: number): ExtractorResponse | null {
  if (!raw.candidates) return null
  const candidates: CandidateRecord[] = raw.candidates
    .filter(c => c.kind && c.fields && typeof c.confidence === 'number')
    .map(c => ({
      id: randId(),
      kind: c.kind as CandidateRecord['kind'],
      fields: c.fields as Record<string, unknown>,
      confidence: c.confidence!,
      sourceSpan: c.source_span
        ? {
            turnIndex: c.source_span.turn_index ?? transcriptLength - 1,
            start: c.source_span.start ?? 0,
            end: c.source_span.end ?? 0,
          }
        : undefined,
      missingFields: c.missing_fields ?? [],
      safetyFlags: (c.safety_flags ?? []) as ValidatorFlag[],
      provenance: {
        source: 'llm_extracted',
        authority: 'plant_local',
        confidence: c.confidence!,
      },
      review: {
        status: 'needs_review',
        safetyLabel: 'needs_source_review',
      },
      status: 'pending',
    }))
  return {
    candidates,
    globalSafetyFlags: (raw.global_safety_flags ?? []) as ValidatorFlag[],
  }
}

function describeError(code: string): string {
  switch (code) {
    case 'setup_llm_not_configured':
      return "The chat interview isn't wired up yet (LLM env missing). The form at /spottingboard/intake still works."
    case 'orchestrator_invalid_shape':
    case 'extractor_invalid_shape':
      return "The assistant returned something I couldn't parse. Try sending your last message again."
    default:
      return `Something went wrong: ${code}`
  }
}

