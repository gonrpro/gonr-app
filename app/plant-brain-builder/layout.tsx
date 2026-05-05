// app/plant-brain-builder/layout.tsx
// Plant Brain shell for the wizard route (sibling of /plant-brain subtree).

import PlantBrainShell from '@/components/plant-brain/PlantBrainShell'
import type { ReactNode } from 'react'

export default function PlantBrainBuilderLayout({ children }: { children: ReactNode }) {
  return <PlantBrainShell>{children}</PlantBrainShell>
}
