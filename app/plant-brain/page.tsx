// app/plant-brain/page.tsx
// TASK-131 landing v2 — Apple-style editorial composition.
//
// Replaces the v1 dark-card landing. Goals:
//   - Apple-grade: large display type, generous whitespace, single accent
//   - Real paper Plant Guide preview (not generic mock) as the visual showpiece
//   - No Lucide icons, no glassmorphism, no green checkmark grid, no font-black soup
//   - Mobile-first responsive without sacrificing desktop composition

import PlantBrainLandingClient from './PlantBrainLandingClient'

export const metadata = {
  title: 'Plant Brain — your operators’ knowledge, captured.',
  description:
    'Twenty minutes from your senior operator. A bilingual, printable, searchable plant brain forever. Built so one sick day never breaks the plant.',
}

export default function PlantBrainLandingPage() {
  return <PlantBrainLandingClient />
}
