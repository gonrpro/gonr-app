import PlantBrainBuilderClient from '../../plant-brain-builder/PlantBrainBuilderClient'

export const metadata = {
  title: 'SpottingBoard Builder — build your plant brain',
  description: 'Guided capture for plant rules, spotting SOPs, chemistry, training, and operator knowledge.',
}

export default function SpottingBoardBuilderPage() {
  return <PlantBrainBuilderClient />
}
