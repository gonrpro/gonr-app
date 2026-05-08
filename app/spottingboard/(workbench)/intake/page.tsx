// TASK-158 — Capture rule — chemistry_rule capture form (minimum-loop replacement of TASK-147 stub).
// Server component that resolves session + active plant, then hands off to the
// client form component. No classifier in this loop; raw chemistry_rule capture
// only per Atlas TASK-158 lock.

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { IntakeChemistryRuleForm } from './IntakeChemistryRuleForm'

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

export default async function CaptureRulePage() {
  // Read headers to opt out of static rendering — this page depends on session.
  const _h = await headers()

  const email = await getSessionEmail()
  if (!email) {
    redirect('/auth/login?next=/spottingboard/intake')
  }

  const plant = await getUserPlant(email)

  // No plant yet — send the user to the existing plant create flow. The
  // /api/plant POST endpoint creates a plant + auto-adds the user as owner.
  // Routing here mirrors the GONR runtime no-plant path.
  if (!plant) {
    return (
      <div className="sb-surface sb-surface-intake">
        <header className="sb-surface-head">
          <h1>Capture a rule</h1>
          <p className="sb-surface-tagline">Capture a chemistry rule for your plant.</p>
        </header>
        <div className="sb-stub-card">
          <h2>You don&apos;t have a plant yet</h2>
          <p>
            Capture is plant-scoped. Create your plant first, then come back here to capture chemistry rules.
          </p>
          <a className="sb-link-button" href="/plant-brain-builder">
            Set up your plant
          </a>
        </div>
      </div>
    )
  }

  // Spotter role can read but cannot capture chemistry rules per TASK-152 §3.
  // We could either show the form disabled or redirect to library; show a message.
  if (plant.role === 'spotter') {
    return (
      <div className="sb-surface sb-surface-intake">
        <header className="sb-surface-head">
          <h1>Capture a rule</h1>
          <p className="sb-surface-tagline">Capture a chemistry rule for your plant.</p>
        </header>
        <div className="sb-stub-card">
          <h2>Spotter role: read-only on capture</h2>
          <p>
            Chemistry rules need owner or operator role to capture. Ask your supervisor to bump your role
            or hand off the capture session.
          </p>
          <a className="sb-link-button" href="/spottingboard/library">
            Go to Brain Library
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="sb-surface sb-surface-intake">
      <header className="sb-surface-head">
        <h1>Capture a rule</h1>
        <p className="sb-surface-tagline">
          Capture a chemistry rule for <strong>{plant.name}</strong>. Every saved rule starts unreviewed and
          requires supervisor review before it can become runtime guidance.
        </p>
      </header>

      <IntakeChemistryRuleForm plantId={plant.plantId} />
    </div>
  )
}
