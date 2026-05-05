import PlantBrainDashboardClient from '../../plant-brain/dashboard/PlantBrainDashboardClient'

export const metadata = {
  title: 'SpottingBoard Dashboard — plant operating brain',
  description: 'SpottingBoard at a glance: coverage, SOPs, chemistry, guide, and quick actions.',
}

export default function SpottingBoardDashboardPage() {
  return <PlantBrainDashboardClient />
}
