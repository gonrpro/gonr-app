// TASK-249 — this route previously rendered the intake client with NO auth,
// relying on proxy unreachability alone. It now shares the founder gate with
// /admin/plant-brain-intake and receives the training corpus server-side, so
// the corpus rides only this gated RSC payload, never static chunks.

import { hasFounderAccess } from '@/lib/auth/founder-access'
import { plantBrainCorpus } from '../admin/plant-brain-intake/corpus'
import PlantBrainBuilderClient from './PlantBrainBuilderClient'

export const metadata = {
  title: 'Plant Brain Builder — GONR Intelligence',
  description: 'Build plant-specific GONR solve cards through an intelligent chat cockpit.',
}

export default async function PlantBrainBuilderPage() {
  if (!(await hasFounderAccess())) {
    return <div className="p-6 text-sm text-red-700">Founder access required.</div>
  }

  return <PlantBrainBuilderClient corpus={plantBrainCorpus} />
}
