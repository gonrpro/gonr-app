// TASK-182 — Spotting Board Dashboard lifted to real DB counts.
//
// Server component:
//   1. Resolves session email + active plant (mirrors library/intake/etc.).
//   2. No session → redirect to /auth/login.
//   3. No plant → empty state with CTA to /plant-brain-builder.
//   4. With plant → plant name + role, total brain items count, review
//      queue count, and a quick-actions grid matching the trimmed nav.
//
// Counts use full-row listPlantBrainItems + listReviewQueue per Atlas's
// MVP call (TASK-182 review 2026-05-11). Default limit of 100 inside both
// helpers caps the visible count at 100; bumping to an explicit limit so
// counts are accurate up to 1000 items per plant. A future TASK can swap
// to a head-count query if plants exceed that ceiling.
//
// Chemistry Stack tile removed — the route stays on disk but is no longer
// linked from nav or dashboard (TASK-182 nav trim).

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { listPlantBrainItems } from '@/lib/spottingboard/items'
import { listReviewQueue } from '@/lib/spottingboard/review'

export const metadata = {
  title: 'Spotting Board Dashboard — Workbench overview',
  description: 'Spotting Board workbench overview with real plant counts and quick actions for capture, review, export, and plant profile.',
}

const COUNT_CAP = 1000

const ACTIONS = [
  {
    href: '/spottingboard/intake',
    title: 'Capture a rule',
    body: 'Add chemistry, procedure, exception, or plant-local knowledge.',
  },
  {
    href: '/spottingboard/library',
    title: 'Brain Library',
    body: 'Review saved plant cards with authority, risk, and review labels separated.',
  },
  {
    href: '/spottingboard/supervisor',
    title: 'Supervisor Review',
    body: 'Promote, reject, or escalate captured rules before they become guidance.',
  },
  {
    href: '/spottingboard/export',
    title: 'Export Center',
    body: 'Export the plant brain into owned Markdown/JSON/ops-book material.',
  },
  {
    href: '/spottingboard/profile',
    title: 'Plant Profile',
    body: 'Set plant DNA, solvent system, risk boundaries, and operating context.',
  },
]

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

function formatCount(n: number): string {
  return n >= COUNT_CAP ? `${COUNT_CAP}+` : String(n)
}

export default async function SpottingBoardDashboardPage() {
  const _h = await headers()

  const email = await getSessionEmail()
  if (!email) {
    redirect('/auth/login?next=/spottingboard/dashboard')
  }

  const plant = await getUserPlant(email)

  if (!plant) {
    return (
      <div className="sb-surface sb-surface-dashboard">
        <header className="sb-surface-head">
          <h1>Dashboard</h1>
          <p className="sb-surface-tagline">
            Spotting Board workbench overview.
          </p>
        </header>
        <div className="sb-stub-card">
          <h2>You don&apos;t have a plant yet</h2>
          <p>Set up your plant first — then capture rules, review them, and export the resulting ops book.</p>
          <Link className="sb-link-button" href="/plant-brain-builder">Set up your plant</Link>
        </div>
      </div>
    )
  }

  const [items, queue] = await Promise.all([
    listPlantBrainItems(plant.plantId, { limit: COUNT_CAP }),
    listReviewQueue(plant.plantId, { limit: COUNT_CAP }),
  ])
  const totalItems = items.length
  const queueCount = queue.length

  return (
    <div className="sb-surface sb-surface-dashboard">
      <header className="sb-surface-head">
        <h1>Dashboard</h1>
        <p className="sb-surface-tagline">
          {plant.name} · {plant.role}
        </p>
      </header>

      <section className="sb-dashboard-hero" aria-label="Spotting Board status">
        <div>
          <p className="sb-dashboard-eyebrow">Plant operating brain</p>
          <h2>Build the rules your plant actually runs on.</h2>
          <p>
            Capture plant-local knowledge, keep unsafe claims quarantined, and preserve the difference between
            authority, risk, and review status. Nothing becomes broad guidance just because someone typed it in.
          </p>
        </div>
        <Link className="sb-link-button" href="/spottingboard/intake">
          Capture a rule
        </Link>
      </section>

      <section className="sb-stub-card" aria-label="Plant brain status">
        <dl className="sb-stat-list">
          <dt>Brain items</dt><dd>{formatCount(totalItems)}</dd>
          <dt>Awaiting review</dt><dd>{formatCount(queueCount)}</dd>
        </dl>
        {totalItems === 0 ? (
          <p>No brain items yet — start with <Link href="/spottingboard/intake">Capture a rule</Link>.</p>
        ) : queueCount > 0 ? (
          <p><Link href="/spottingboard/supervisor">Open Supervisor Review</Link> to action the queue.</p>
        ) : (
          <p>Queue clear. New captures will appear here after capture.</p>
        )}
      </section>

      <section className="sb-dashboard-grid" aria-label="Workbench modules">
        {ACTIONS.map((action) => (
          <Link key={action.href} className="sb-dashboard-card" href={action.href}>
            <span className="sb-dashboard-card-title">{action.title}</span>
            <span className="sb-dashboard-card-body">{action.body}</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
