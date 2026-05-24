import type { Metadata } from 'next'
import ConsumerSolveShell from '@/components/consumer/ConsumerSolveShell'

export const metadata: Metadata = {
  title: 'GONR Consumer Safety Triage',
  description: 'Get the safe first move for a stain before treating the item.',
}

export default function SolveV2Page() {
  return <ConsumerSolveShell />
}
