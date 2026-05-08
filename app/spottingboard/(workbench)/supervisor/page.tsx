// TASK-161 — Supervisor Review — DB-backed queue (replacement of TASK-147 stub).
//
// Server component:
//   1. Resolves session email + active plant
//   2. Reads unreviewed + in-review rows for that plant via service-role
//      (membership pre-gated by getUserPlant — service-role read is safe per
//      TASK-157 P1-1 pattern)
//   3. Hands off to SupervisorReviewClient for actions
//
// Spotter role is read-only on actions (the SupervisorReviewClient still
// renders the queue but the API route returns 403 if a spotter tries to
// action; double-gated in case the surface ever loads with a stale role).
// For TASK-161 minimum loop, spotter is shown an explicit read-only message.

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { listReviewQueue } from '@/lib/spottingboard/review'
import { SupervisorReviewClient } from './SupervisorReviewClient'

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

export default async function SupervisorReviewPage() {
  const _h = await headers()

  const email = await getSessionEmail()
  if (!email) redirect('/auth/login?next=/spottingboard/supervisor')

  const plant = await getUserPlant(email)
  if (!plant) {
    return (
      <div className="sb-surface sb-surface-supervisor">
        <header className="sb-surface-head">
          <h1>Supervisor Review</h1>
          <p className="sb-surface-tagline">Promote what works. Reject what doesn&apos;t. Escalate what isn&apos;t safe yet.</p>
        </header>
        <div className="sb-stub-card">
          <h2>You don&apos;t have a plant yet</h2>
          <p>Supervisor review is plant-scoped. Set up your plant first.</p>
          <a className="sb-link-button" href="/plant-brain-builder">Set up your plant</a>
        </div>
      </div>
    )
  }

  if (plant.role === 'spotter') {
    return (
      <div className="sb-surface sb-surface-supervisor">
        <header className="sb-surface-head">
          <h1>Supervisor Review</h1>
          <p className="sb-surface-tagline">Owner / operator only.</p>
        </header>
        <div className="sb-stub-card">
          <h2>Spotter role: read-only on supervisor review</h2>
          <p>Review actions need owner or operator role. Ask your supervisor.</p>
          <a className="sb-link-button" href="/spottingboard/library">Go to Brain Library</a>
        </div>
      </div>
    )
  }

  const items = await listReviewQueue(plant.plantId)

  return (
    <div className="sb-surface sb-surface-supervisor">
      <header className="sb-surface-head">
        <h1>Supervisor Review</h1>
        <p className="sb-surface-tagline">
          <strong>{plant.name}</strong> — promote what works, reject what doesn&apos;t, escalate what isn&apos;t safe yet.
          Nothing becomes plant truth without your call. Every action writes an audit row.
        </p>
      </header>

      <SupervisorReviewClient
        plantId={plant.plantId}
        initialItems={items.map((it) => ({
          ...it,
          conflict_flags: it.conflict_flags ?? [],
        }))}
      />
    </div>
  )
}
