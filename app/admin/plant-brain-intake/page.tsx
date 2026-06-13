// TASK-249 — server component. The plant-brain training corpus enters
// through ./corpus (server-only) and is passed as a prop, so it serializes
// only into this founder-gated RSC payload, never into unauthenticated
// static chunks. The founder gate moved to lib/auth/founder-access so
// /plant-brain-builder shares the exact same boundary.

import { hasFounderAccess } from '@/lib/auth/founder-access'
import { plantBrainCorpus } from './corpus'
import PlantBrainIntakeClient from './PlantBrainIntakeClient'

export default async function PlantBrainIntakePage() {
  if (!(await hasFounderAccess())) {
    return <div className="p-6 text-sm text-red-700">Founder access required.</div>
  }

  return <PlantBrainIntakeClient corpus={plantBrainCorpus} />
}
