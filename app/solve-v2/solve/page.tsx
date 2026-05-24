import type { Metadata } from 'next'
import ConsumerSolveShell from '@/components/consumer/ConsumerSolveShell'

export const metadata: Metadata = {
  title: 'GONR — Solve a stain',
  description: 'Get the safe first move for a stain before treating the item.',
}

// Phase 0 functional triage shell, PRESERVED from the base as a step in the
// consumer journey. The home/scan-entry screen links here. (Not replaced — the
// mockup-faithful result-screen reskin is a later packet.)
export default function SolvePage() {
  return <ConsumerSolveShell />
}
