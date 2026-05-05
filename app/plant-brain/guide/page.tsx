// app/plant-brain/guide/page.tsx
// TASK-131 — Printable Plant Guide
//
// Public route. Renders the operator-facing printable Plant Guide assembled
// from the wizard's localStorage state. EN/ES toggle. Print-optimized CSS.
//
// "The reward they walk away with after finishing the wizard" — Tyler msg 11475.

import PlantGuideClient from './PlantGuideClient'

export const metadata = {
  title: 'Plant Guide — your plant’s knowledge in print',
  description:
    'A printable, bilingual Plant Guide assembled from your operator’s answers. Pin it to the spotting board.',
}

export default function PlantGuidePage() {
  return <PlantGuideClient />
}
