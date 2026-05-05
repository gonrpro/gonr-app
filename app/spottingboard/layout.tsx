import PlantBrainShell from '@/components/plant-brain/PlantBrainShell'
import type { ReactNode } from 'react'

export default function SpottingBoardLayout({ children }: { children: ReactNode }) {
  return <PlantBrainShell>{children}</PlantBrainShell>
}
