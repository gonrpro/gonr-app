import PlantBrainDashboardClient from '../../plant-brain/dashboard/PlantBrainDashboardClient'

export const metadata = {
  title: 'Spotting Board Dashboard — plant operating brain',
  description: 'Spotting Board at a glance: coverage, SOPs, chemistry, guide, and quick actions.',
}

export default function SpottingBoardDashboardPage() {
  return <PlantBrainDashboardClient />
}
