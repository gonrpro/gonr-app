// TASK-165 — Conversational intake cockpit server entry.
//
// First-run landing for SB magic-link users (auth/login defaults the SB next
// path to /spottingboard/onboarding). Mirrors the session+plant resolution
// pattern of library/intake/supervisor/export/profile.
//
// Decision tree:
//   1. No session → redirect to login.
//   2. Spotter role → redirect to /spottingboard/library (spotters cannot
//      capture, so the cockpit has no answers to PATCH).
//   3. Plant + wizard_completed_at + itemCount >= MATURE_ITEM_THRESHOLD →
//      redirect to /spottingboard/dashboard. Cockpit remains reachable by
//      direct URL for users who want to keep building.
//   4. Otherwise → render ConversationalIntakeClient with hydrated state.

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { listPlantBrainItems } from '@/lib/spottingboard/items'
import { ConversationalIntakeClient } from './ConversationalIntakeClient'
import { MATURE_ITEM_THRESHOLD } from './intake-script'
import './onboarding.css'

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
  title: 'Spotting Board — Build your plant brain',
  description: 'Conversational first-run intake for Spotting Board operators.',
}

export default async function OnboardingPage() {
  const _h = await headers()

  const email = await getSessionEmail()
  if (!email) {
    redirect('/auth/login?brand=spottingboard&next=/spottingboard/onboarding')
  }

  const plant = await getUserPlant(email)

  if (plant && plant.role === 'spotter') {
    redirect('/spottingboard/library')
  }

  const items = plant ? await listPlantBrainItems(plant.plantId, { limit: MATURE_ITEM_THRESHOLD + 1 }) : []
  const itemCount = items.length

  if (plant && plant.wizardCompletedAt && itemCount >= MATURE_ITEM_THRESHOLD) {
    redirect('/spottingboard/dashboard')
  }

  return (
    <div className="sb-surface sb-surface-onboarding">
      <ConversationalIntakeClient initial={{ plant, itemCount }} />
    </div>
  )
}
