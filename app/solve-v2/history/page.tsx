import type { Metadata } from 'next'
import HistoryScreen from '@/components/consumer/screens/HistoryScreen'

export const metadata: Metadata = {
  title: 'GONR — History',
  description: 'Every stain check you have run, in one place.',
}

// TASK-218 Screen 11 — HISTORY tab. Shell chrome + nav come from the solve-v2 layout.
export default function SolveV2History() {
  return <HistoryScreen />
}
