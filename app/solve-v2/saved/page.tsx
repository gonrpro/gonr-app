import type { Metadata } from 'next'
import SavedScreen from '@/components/consumer/screens/SavedScreen'

export const metadata: Metadata = {
  title: 'GONR — My Library',
  description: 'Your saved rescues, notes, and care labels.',
}

// TASK-218 Screen 12 — SAVED / LIBRARY tab. Shell chrome + nav come from the layout.
export default function SolveV2Saved() {
  return <SavedScreen />
}
