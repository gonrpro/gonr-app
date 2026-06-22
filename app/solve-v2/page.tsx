import type { Metadata } from 'next'
import ConsumerSolveShell from '@/components/consumer/ConsumerSolveShell'

export const metadata: Metadata = {
  title: 'GONR Stain Intelligence',
  description: 'Understand the stain, protect the garment, and get the safe first move.',
}

export default function SolveV2Page() {
  return <ConsumerSolveShell />
}
