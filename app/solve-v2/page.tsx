import type { Metadata } from 'next'
import HomeScreen from '@/components/consumer/screens/HomeScreen'

export const metadata: Metadata = {
  title: 'GONR — Stain confidence',
  description: 'Start a stain check, see what is likely safe to try, and know when not to DIY.',
}

// Consumer shell entry (TASK-218): mockup-faithful home / scan-entry screen.
export default function SolveV2Home() {
  return <HomeScreen />
}
