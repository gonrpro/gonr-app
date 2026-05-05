// app/plant-brain/dashboard/page.tsx
// TASK-131 — Plant Brain dashboard (sticky retention home)
//
// Public route. Reads wizard answers from localStorage (TASK-122.2 chat cockpit key).
// Shows operator their living plant brain at a glance — coverage, modules,
// quick actions into Guide / Wizard / future sub-modules.
//
// Per Atlas msg 11476: dashboard is "the living home for SOPs, chemistry
// inventory, customer handoff, staff training, plant-specific solves."

import PlantBrainDashboardClient from './PlantBrainDashboardClient'

export const metadata = {
  title: 'Plant Brain Dashboard — your plant’s living knowledge',
  description: 'Your Plant Brain at a glance: coverage, modules, guide, and quick actions.',
}

export default function PlantBrainDashboardPage() {
  return <PlantBrainDashboardClient />
}
