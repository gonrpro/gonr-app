import type { Metadata } from 'next'
import HomeScreen from '@/components/consumer/screens/HomeScreen'

export const metadata: Metadata = {
  title: 'GONR — Know what to do. Know what not to.',
  description: 'Show us the stain. GONR reads what it can and asks only what matters — then tells you what to do, and what not to.',
  // Explicit so the SHARED gonr.app→/solve-v2 link gets the consumer card + home-screen
  // image, not the stale root-inherited "Professional Stain Protocols" / green pro image.
  openGraph: {
    title: 'GONR — Know what to do. Know what not to.',
    description: 'Show us the stain. GONR reads what it can and asks only what matters — then tells you what to do, and what not to.',
    url: 'https://gonr.app',
    siteName: 'GONR',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GONR — Know what to do. Know what not to.',
    description: 'Show us the stain. GONR reads what it can and asks only what matters.',
    images: ['/og-image.png'],
  },
}

// Consumer shell entry (TASK-218): mockup-faithful home / scan-entry screen.
export default function SolveV2Home() {
  return <HomeScreen />
}
