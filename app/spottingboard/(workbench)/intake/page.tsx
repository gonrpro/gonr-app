// TASK-188 — Guided capture lands at /spottingboard/intake.
//
// Server resolves session + plant + role, then hands a GuidedTriageClient
// that consumes the shared lib/spottingboard/scenario-engine/ as its first
// real-world surface. Marketing's "Guided capture" promise now exists in the
// authenticated app.
//
// Spotter handling matches the existing pattern: read-only role gets a
// no-capture notice with a route to Library.

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { GuidedTriageClient } from './GuidedTriageClient'
import './triage.css'

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

export const metadata = {
  title: 'Spotting Board — Guided capture',
  description: 'Chip-driven stain triage backed by the GONR protocol library and plant-local capture for supervisor review.',
}

export default async function CaptureRulePage() {
  // Read headers to opt out of static rendering — this page depends on session.
  await headers()

  const email = await getSessionEmail()
  if (!email) {
    redirect('/auth/login?next=/spottingboard/intake')
  }

  const plant = await getUserPlant(email)

  if (!plant) {
    return (
      <div className="sb-surface sb-surface-intake">
        <header className="sb-surface-head">
          <h1>Guided capture</h1>
          <p className="sb-surface-tagline">
            Chip-driven triage for the stains in front of you.
          </p>
        </header>
        <div className="sb-stub-card">
          <h2>You don&apos;t have a plant yet</h2>
          <p>
            Capture is plant-scoped. Create your plant first, then come back here to walk through scenarios.
          </p>
          <a className="sb-link-button" href="/plant-brain-builder">
            Set up your plant
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="sb-surface sb-surface-intake">
      <GuidedTriageClient
        plantId={plant.plantId}
        plantName={plant.name}
        role={plant.role}
      />
    </div>
  )
}
