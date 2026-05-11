// app/plant-brain/dashboard/page.tsx
// TASK-182 — retire the parallel plant-brain dashboard surface.
//
// The standalone plant-brain dashboard was a localStorage-driven retention
// shell that duplicated Spotting Board workbench navigation and shipped
// against the "one responsive shell" rule. This route now redirects all
// traffic into the Spotting Board workbench dashboard, which is DB-backed
// and inherits the WorkbenchShell mobile drawer + desktop rail.
//
// The legacy client (PlantBrainDashboardClient.tsx) is left on disk per
// no-delete policy. It has no remaining callers and is a candidate for a
// follow-up cleanup commit once Atlas confirms nothing else imports it.

import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Plant Brain Dashboard',
  description: 'Plant Brain dashboard moved into the Spotting Board workbench.',
}

export default function PlantBrainDashboardPage() {
  redirect('/spottingboard/dashboard')
}
