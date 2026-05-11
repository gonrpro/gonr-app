// TASK-189 — Spotting Board chat-first plant builder.
//
// Server entry: session + plant + role + record state → mounts the chat
// client. Spotters are redirected to library (matches existing /onboarding
// pattern). Operators with no plant get the existing plant-builder CTA.

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { listPlantBrainItems } from '@/lib/spottingboard/items'
import { fromPlantBrainItem } from '@/lib/spottingboard/plant-build-engine/normalize'
import type { PlantBuildRecord } from '@/lib/spottingboard/plant-build-engine/types'
import { ChatSetupClient } from './ChatSetupClient'
import './chat-setup.css'

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
  description: 'Guided chat with an expert dry-cleaning consultant. Capture rules, inventory, and training in one continuous interview.',
}

export default async function SetupPage() {
  await headers()

  const email = await getSessionEmail()
  if (!email) {
    redirect('/auth/login?brand=spottingboard&next=/spottingboard/setup')
  }

  const plant = await getUserPlant(email)

  if (!plant) {
    return (
      <div className="sb-surface sb-surface-setup">
        <header className="sb-surface-head">
          <h1>Build your plant brain</h1>
          <p className="sb-surface-tagline">
            Capture rules, inventory, and training in one continuous interview.
          </p>
        </header>
        <div className="sb-stub-card">
          <h2>You don&apos;t have a plant yet</h2>
          <p>Set up your plant first — name, solvent system, and the basics — then I can interview you in detail.</p>
          <a className="sb-link-button" href="/plant-brain-builder">Set up your plant</a>
        </div>
      </div>
    )
  }

  if (plant.role === 'spotter') {
    redirect('/spottingboard/library')
  }

  // Hydrate canonical records from existing plant_brain_items (Strategy A).
  const rawItems = await listPlantBrainItems(plant.plantId, { limit: 1000 })
  const records: PlantBuildRecord[] = rawItems.map(row => fromPlantBrainItem({
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
    promotion_status: row.runtime_eligible ? 'never-promoted' : 'never-promoted',
    source_evidence: [],
    runtime_eligible: row.runtime_eligible,
    conflict_flags: row.conflict_flags ?? [],
    safety_label: row.safety_label,
    reviewer_email: row.reviewer_email,
    reviewed_at: null,
    created_at: row.created_at,
    updated_at: row.created_at,
  }))

  return (
    <div className="sb-surface sb-surface-setup">
      <ChatSetupClient
        plantId={plant.plantId}
        plantName={plant.name}
        role={plant.role}
        initialRecords={records}
      />
    </div>
  )
}
