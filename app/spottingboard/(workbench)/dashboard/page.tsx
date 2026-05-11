// TASK-187 — Guided Spotting Board Dashboard.
// TASK-189 (2026-05-11): added the chat-setup gate. Incomplete plants
// redirect to /spottingboard/setup; the dashboard renders only when the
// plant brain has the minimum core data (Atlas + Tyler product reset).
//
// The dashboard is the AI-led workbench, not a card grid. Server resolves
// session + plant + DB-backed counts + recent items, then hands hydrated
// state to GuidedDashboardClient which derives the next best question.

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { listPlantBrainItems, type BrainLibraryItem } from '@/lib/spottingboard/items'
import { listReviewQueue } from '@/lib/spottingboard/review'
import { fromPlantBrainItem } from '@/lib/spottingboard/plant-build-engine/normalize'
import { buildPhaseTargets, isBuildComplete } from '../setup/setup-spine'
import { GuidedDashboardClient } from './GuidedDashboardClient'
import './guided-dashboard.css'

const COUNT_CAP = 1000

export const metadata = {
  title: 'Spotting Board — Guided plant brain workbench',
  description: 'Compiled view of the plant brain: rules, inventory, training, review queue, and exports.',
}

async function getSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email ?? null
  } catch {
    return null
  }
}

function recentItemView(items: BrainLibraryItem[]) {
  return items.slice(0, 3).map(i => ({
    id: i.id,
    title: i.title ?? null,
    body: i.body,
    safety_label: i.safety_label,
  }))
}

export default async function SpottingBoardDashboardPage() {
  await headers()

  const email = await getSessionEmail()
  if (!email) {
    redirect('/auth/login?next=/spottingboard/dashboard')
  }

  const plant = await getUserPlant(email)

  if (!plant) {
    return (
      <GuidedDashboardClient
        initial={{
          plant: null,
          totalItems: 0,
          queueCount: 0,
          recentItems: [],
        }}
      />
    )
  }

  const [items, queue] = await Promise.all([
    listPlantBrainItems(plant.plantId, { limit: COUNT_CAP }),
    listReviewQueue(plant.plantId, { limit: COUNT_CAP }),
  ])

  // TASK-189 gate: incomplete plant brains land in /setup. The dashboard is
  // a compiled view; it shouldn't be the first-run state.
  if (plant.role !== 'spotter') {
    const records = items.map(row =>
      fromPlantBrainItem({
        id: row.id,
        plant_id: plant.plantId,
        module: row.module,
        title: row.title ?? null,
        body: row.body,
        authority_class: row.authority_class,
        feed_mode: 'private-only',
        consent: {},
        tenant_provenance: {},
        review_status: row.review_status,
        promotion_status: 'never-promoted',
        source_evidence: [],
        runtime_eligible: row.runtime_eligible,
        conflict_flags: row.conflict_flags ?? [],
        safety_label: row.safety_label,
        reviewer_email: row.reviewer_email,
        reviewed_at: null,
        created_at: row.created_at,
        updated_at: row.created_at,
      }),
    )
    const phaseTargets = buildPhaseTargets(records)
    if (!isBuildComplete(phaseTargets)) {
      redirect('/spottingboard/setup')
    }
  }

  return (
    <GuidedDashboardClient
      initial={{
        plant,
        totalItems: items.length,
        queueCount: queue.length,
        recentItems: recentItemView(items),
      }}
    />
  )
}
