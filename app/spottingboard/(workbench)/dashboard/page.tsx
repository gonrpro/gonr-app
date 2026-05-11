// TASK-187 — Guided Spotting Board Dashboard.
//
// The dashboard is the AI-led workbench, not a card grid. Server resolves
// session + plant + DB-backed counts + recent items, then hands hydrated
// state to GuidedDashboardClient which derives the next best question.
//
// Continues TASK-182 server pattern (mirror of library/intake/supervisor/
// export/profile/onboarding): session via getSessionEmail, plant via
// getUserPlant, items + queue via Promise.all. No DDL, no new server
// routes — all writes go through the existing /api/plant + /api/spottingboard
// /items paths that the cockpit already uses.

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { listPlantBrainItems, type BrainLibraryItem } from '@/lib/spottingboard/items'
import { listReviewQueue } from '@/lib/spottingboard/review'
import { GuidedDashboardClient } from './GuidedDashboardClient'
import './guided-dashboard.css'

const COUNT_CAP = 1000

export const metadata = {
  title: 'Spotting Board — Guided plant brain workbench',
  description: 'AI-led plant brain workbench: one best question at a time, real DB-backed progress, supervisor review and export at hand.',
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
