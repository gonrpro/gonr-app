// TASK-182 — Plant Profile rewired to real plant data.
//
// Server component:
//   1. Resolves session email + active plant via the same pattern used by
//      library/intake/supervisor/export.
//   2. If no session → redirect to /auth/login.
//   3. If no plant → empty state with CTA to /plant-brain-builder.
//   4. If plant → render the actual plant fields and mount an edit-action
//      client island that reopens PlantWizardModal in edit mode (the wizard
//      already supports an `existingPlant` prop per TASK-023 Phase D).
//
// Removed: the TASK-147 stub `<dl>` with hardcoded Jerry's values, the
// "Add risk boundary" / "Add escalation rule" stub-CTA cards, and the
// integration-TODO footer. Risk-boundary and escalation-policy persistence
// remain out of scope for TASK-182 (TASK-146 schema rec covers the future
// plant_brain_items.module='profile' path).

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getUserPlant, type UserPlant } from '@/lib/auth/getUserPlant'
import { EditProfileButton } from './EditProfileButton'

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

function formatSolvents(plant: UserPlant): string {
  const list = plant.solvents.length > 0 ? [...plant.solvents] : (plant.solvent ? [plant.solvent] : [])
  if (list.includes('other') && plant.solventOther) {
    return list.filter(s => s !== 'other').concat(`other (${plant.solventOther})`).join(', ')
  }
  return list.length > 0 ? list.join(', ') : '—'
}

function formatBoard(value: string | null): string {
  if (!value) return '—'
  switch (value) {
    case 'spotting-board-steam-vacuum': return 'Spotting board · steam · vacuum'
    case 'spotting-board-basic': return 'Spotting board · basic'
    case 'no-board': return 'No board'
    default: return value
  }
}

function formatSkill(value: string | null): string {
  if (!value) return '—'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatBleach(value: boolean): string {
  return value ? 'Allowed' : 'Not allowed'
}

export default async function PlantProfilePage() {
  const _h = await headers()

  const email = await getSessionEmail()
  if (!email) {
    redirect('/auth/login?next=/spottingboard/profile')
  }

  const plant = await getUserPlant(email)

  if (!plant) {
    return (
      <div className="sb-surface sb-surface-profile">
        <header className="sb-surface-head">
          <h1>Plant Profile</h1>
          <p className="sb-surface-tagline">
            The DNA of your plant. Where you are, what you do, what you don&apos;t touch.
          </p>
        </header>
        <div className="sb-stub-card">
          <h2>You don&apos;t have a plant yet</h2>
          <p>Set up your plant first — name it, pick your solvent system, set your house rules.</p>
          <a className="sb-link-button" href="/plant-brain-builder">Set up your plant</a>
        </div>
      </div>
    )
  }

  return (
    <div className="sb-surface sb-surface-profile">
      <header className="sb-surface-head">
        <h1>Plant Profile</h1>
        <p className="sb-surface-tagline">
          The DNA of your plant. Where you are, what you do, what you don&apos;t touch.
        </p>
      </header>

      <section className="sb-stub-card">
        <header className="sb-surface-head" style={{ marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>Plant DNA</h2>
          <EditProfileButton plant={plant} />
        </header>
        <dl className="sb-stat-list">
          <dt>Plant name</dt><dd>{plant.name}</dd>
          <dt>Solvent</dt><dd>{formatSolvents(plant)}</dd>
          <dt>Board</dt><dd>{formatBoard(plant.board)}</dd>
          <dt>Primary skill level</dt><dd>{formatSkill(plant.skillLevel)}</dd>
          <dt>Bleach</dt><dd>{formatBleach(plant.bleachAllowed)}</dd>
          <dt>House rules</dt><dd>{plant.houseRules?.trim() ? plant.houseRules : '—'}</dd>
          <dt>Your role</dt><dd>{plant.role}</dd>
        </dl>
      </section>
    </div>
  )
}
