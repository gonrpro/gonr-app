import type { Metadata } from 'next'
import ProfileScreen from '@/components/consumer/screens/ProfileScreen'

export const metadata: Metadata = {
  title: 'GONR — Settings',
  description: 'Your profile, preferences, and account.',
}

// TASK-218 Screen 15 — SETTINGS / PROFILE tab. Shell chrome + nav come from the layout.
export default function SolveV2Profile() {
  return <ProfileScreen />
}
