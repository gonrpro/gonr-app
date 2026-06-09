'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AgenticIntake from '@/components/consumer/AgenticIntake'
import ChatIntakeScreen, { type ChatIntakeContext } from '@/components/consumer/screens/ChatIntakeScreen'
import DetailsCollectedScreen from '@/components/consumer/screens/DetailsCollectedScreen'
import ResultsScreen from '@/components/consumer/screens/ResultsScreen'
import { useSaveProtocol } from '@/components/consumer/useSaveProtocol'
import { ATTACH_CONTEXT_KEY, type AttachContext } from '@/components/consumer/AttachMenu'
import type { SolveInput } from '@/lib/consumer-safety/solve-input'
import { contextFromAttach, hintsFromAttach } from '@/lib/consumer-safety/attach-hints'

// TASK-218 — CONSUMER SPINE ORCHESTRATOR.
//
// The headline experience is the AGENTIC INTAKE: an LLM orchestrator (/api/intake)
// reads everything the user gave in ANY order, shows an instant synthesized read,
// asks ONE sharp question at a time, then hands the assembled facts to the
// DETERMINISTIC GONR engine (/api/solve) — which makes the final verdict. The
// agent interprets and asks; it never writes treatment advice.
//
// If the agent can't run (no key / network), we FAIL CLOSED to the deterministic
// guided intake (Chat → Details → Results) so the user is never stuck. That path
// is the same shared SolveInput against the same live engine — no signup wall.
//
// Vision hints from the Attach sheet (Take/Choose Photo, Scan Care Label) are read
// once from sessionStorage and forwarded as a confirmable HINT — never a verdict.
// Care-label OCR facts flow through as hard constraints.

// Attach → intake-hint derivations (hintsFromAttach, contextFromAttach) live in
// lib/consumer-safety/attach-hints.ts — pure + unit-testable (this file is 'use client').
// The fallback now forwards restrictive care symbols (no-bleach/no-heat/no-iron) via
// SolveInput.careSymbols, matching the agentic path's hints.hardConstraints.

type FallbackStep = 'chat' | 'details' | 'results'

function SolveFlowInner() {
  const params = useSearchParams()
  const stainParam = params.get('stain') ?? ''

  // One-shot Attach vision hint, read + cleared on mount so it can't leak into a
  // later, unrelated solve. Held as one object so the boot side-effect is a single
  // state write (sessionStorage isn't available during SSR, so this must be an effect).
  const [boot, setBoot] = useState<{ ready: boolean; attach: AttachContext | null }>({
    ready: false,
    attach: null,
  })
  const { ready: attachReady, attach } = boot
  useEffect(() => {
    let parsed: AttachContext | null = null
    try {
      const raw = sessionStorage.getItem(ATTACH_CONTEXT_KEY)
      if (raw) {
        parsed = JSON.parse(raw) as AttachContext
        sessionStorage.removeItem(ATTACH_CONTEXT_KEY)
      }
    } catch {
      parsed = null
    }
    // External-store sync: read + clear the one-shot sessionStorage hint exactly
    // once post-mount. A single state write — intentional, not a derived cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoot({ ready: true, attach: parsed })
  }, [])

  // Release the captured-photo object URL when this flow unmounts so it doesn't
  // outlive the solve. The URL is created in AttachMenu but lives in the same
  // document (client-side nav), so revoking it here is valid.
  useEffect(() => {
    const url = boot.attach?.thumbnailUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [boot.attach])

  const [useFallback, setUseFallback] = useState(false)

  // Save-to-library writer for the deterministic fallback Results (same engine card).
  const saveProtocol = useSaveProtocol()

  const hints = useMemo(() => hintsFromAttach(attach, stainParam), [attach, stainParam])

  // ── Deterministic FALLBACK flow (Chat → Details → Results) ─────────────────
  const [fallbackStep, setFallbackStep] = useState<FallbackStep>('chat')
  const [fallbackInput, setFallbackInput] = useState<SolveInput | null>(null)
  // Follow-up corrections appended on top of the derived base context.
  const [fallbackFollowUps, setFallbackFollowUps] = useState<string[]>([])
  const fallbackBaseContext = useMemo<ChatIntakeContext>(
    () => (attach ? contextFromAttach(attach, stainParam) : { text: stainParam }),
    [attach, stainParam],
  )
  const fallbackContext = useMemo<ChatIntakeContext>(() => {
    if (fallbackFollowUps.length === 0) return fallbackBaseContext
    const text = [fallbackBaseContext.text, ...fallbackFollowUps]
      .filter((s) => Boolean(s && s.trim()))
      .join('. ')
    return { ...fallbackBaseContext, text }
  }, [fallbackBaseContext, fallbackFollowUps])
  const fallbackContextLabel = useMemo(
    () => fallbackContext.text?.trim() || undefined,
    [fallbackContext.text],
  )

  // Wait for the one-shot hint read before kicking off the agent (so its first
  // turn includes any captured photo/label context).
  if (!attachReady) return null

  if (useFallback) {
    if (fallbackStep === 'details' && fallbackInput) {
      return (
        <DetailsCollectedScreen
          input={fallbackInput}
          contextLabel={fallbackContextLabel}
          onContinue={() => setFallbackStep('results')}
          onEditFact={() => setFallbackStep('chat')}
          onFollowUp={(text) => {
            setFallbackFollowUps((prev) => [...prev, text])
            setFallbackStep('chat')
          }}
        />
      )
    }
    if (fallbackStep === 'results' && fallbackInput) {
      return <ResultsScreen input={fallbackInput} onSave={saveProtocol} />
    }
    return (
      <ChatIntakeScreen
        context={fallbackContext}
        onComplete={(assembled) => {
          setFallbackInput(assembled)
          setFallbackStep('details')
        }}
      />
    )
  }

  // ── Headline AGENTIC intake. ───────────────────────────────────────────────
  return (
    <AgenticIntake
      initialText={stainParam}
      hints={hints}
      thumbnailUrl={attach?.thumbnailUrl}
      onFallback={() => {
        setUseFallback(true)
        setFallbackStep('chat')
      }}
    />
  )
}

export default function SolveFlow() {
  return (
    <Suspense fallback={null}>
      <SolveFlowInner />
    </Suspense>
  )
}
