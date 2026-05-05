// app/plant-brain/layout.tsx
// Plant Brain shell — applies to /plant-brain, /plant-brain/guide,
// /plant-brain/dashboard. Pair with /plant-brain-builder/layout.tsx for
// the wizard route (sibling, not child of /plant-brain).

import PlantBrainShell from '@/components/plant-brain/PlantBrainShell'
import type { ReactNode } from 'react'

export default function PlantBrainSubtreeLayout({ children }: { children: ReactNode }) {
  return <PlantBrainShell>{children}</PlantBrainShell>
}
