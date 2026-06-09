import type { Metadata } from 'next'
import SolveFlow from '@/components/consumer/SolveFlow'

export const metadata: Metadata = {
  title: 'GONR — Solve a stain',
  description: 'Get the next guided move before treating the item.',
}

// TASK-218 consumer spine: Chat (clarify) → Details (confirm) → Results + Do-Not-Do,
// threaded with one shared SolveInput against the live /api/solve engine. Reached
// from Home via ?stain=… and from the Attach sheet via a one-shot vision hint.
// The Phase 0 ConsumerSolveShell is retained in the repo as a reference triage
// surface; the orchestrated spine is now the canonical journey.
export default function SolvePage() {
  return <SolveFlow />
}
