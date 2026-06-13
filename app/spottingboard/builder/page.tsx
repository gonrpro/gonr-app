// TASK-249 — this route had NO auth and, unlike the other two plant-brain
// routes, it IS proxy-reachable on the spottingboard.com host (the proxy
// passes /spottingboard/* through; "auth in-app" did not exist here). It now
// shares the founder gate and receives the training corpus server-side. If
// the SB workbench later gets its own operator session auth, swap
// hasFounderAccess for that check in one place.

import { hasFounderAccess } from '@/lib/auth/founder-access'
import { plantBrainCorpus } from '../../admin/plant-brain-intake/corpus'
import PlantBrainBuilderClient from '../../plant-brain-builder/PlantBrainBuilderClient'

export const metadata = {
  title: 'Spotting Board Builder — build your plant brain',
  description: 'Guided capture for plant rules, spotting SOPs, chemistry, training, and operator knowledge.',
}

export default async function SpottingBoardBuilderPage() {
  if (!(await hasFounderAccess())) {
    return <div className="p-6 text-sm text-red-700">Founder access required.</div>
  }

  return <PlantBrainBuilderClient corpus={plantBrainCorpus} />
}
