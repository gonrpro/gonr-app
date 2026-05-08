// TASK-158 — Brain Library — DB-backed list (minimum-loop replacement of TASK-147 sample stub).
// Server component reads plant_brain_items for the active plant and renders
// each row with the SB-locked three-badge governance display + safety_label
// pill. Per TASK-145 SB review gate v0: never collapse the four fields into
// one "verified" badge.

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import {
  ThreeBadgeAnchor,
  type AuthorityClass,
  type RiskTier,
  type ReviewStatus,
} from '@/components/shared/ThreeBadgeAnchor'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { listPlantBrainItems, type BrainLibraryItem } from '@/lib/spottingboard/items'
import type { SafetyLabel } from '@/lib/spottingboard/types'

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

const SAFETY_LABEL_COPY: Record<SafetyLabel, string> = {
  source_backed: 'Source-backed',
  reviewed_for_plant_use: 'Reviewed for plant use',
  needs_source_review: 'Needs source review',
  escalation_required: 'Escalation required',
  unsafe_do_not_use: 'Unsafe — do not use',
}

function safetyLabelClass(label: string): string {
  if (label === 'unsafe_do_not_use') return 'sb-safety-pill sb-safety-unsafe'
  if (label === 'escalation_required') return 'sb-safety-pill sb-safety-escalation'
  if (label === 'source_backed' || label === 'reviewed_for_plant_use') return 'sb-safety-pill sb-safety-ok'
  return 'sb-safety-pill sb-safety-pending'
}

interface ConflictFlag {
  flag_id?: string
  kind?: string
  detail?: string
}

function extractConflictDetails(flags: unknown[]): string[] {
  return flags
    .map((f) => {
      if (typeof f === 'string') return f
      if (f && typeof f === 'object') {
        const cf = f as ConflictFlag
        return cf.detail ?? cf.kind ?? cf.flag_id ?? null
      }
      return null
    })
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
}

export default async function BrainLibraryPage() {
  const _h = await headers()

  const email = await getSessionEmail()
  if (!email) redirect('/auth/login?next=/spottingboard/library')

  const plant = await getUserPlant(email)
  if (!plant) {
    return (
      <div className="sb-surface sb-surface-library">
        <header className="sb-surface-head">
          <h1>Brain Library</h1>
          <p className="sb-surface-tagline">Plant-owned protocol cards.</p>
        </header>
        <div className="sb-stub-card">
          <h2>You don&apos;t have a plant yet</h2>
          <p>Brain Library is plant-scoped. Set up your plant first.</p>
          <a className="sb-link-button" href="/plant-brain-builder">Set up your plant</a>
        </div>
      </div>
    )
  }

  const items: BrainLibraryItem[] = await listPlantBrainItems(plant.plantId)

  return (
    <div className="sb-surface sb-surface-library">
      <header className="sb-surface-head">
        <h1>Brain Library</h1>
        <p className="sb-surface-tagline">
          <strong>{plant.name}</strong> — your plant&apos;s operating Stain Brain. Owned by you, exportable anytime.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="sb-stub-card">
          <h2>No items captured yet</h2>
          <p>
            Capture your first chemistry rule via <a href="/spottingboard/intake">AI Intake</a>. Every rule
            you save is plant-local and unreviewed until a supervisor reviews it.
          </p>
        </div>
      ) : (
        <ul className="sb-item-list">
          {items.map((item) => {
            const conflictDetails = extractConflictDetails(item.conflict_flags ?? [])
            return (
              <li key={item.id} className="sb-item">
                <div className="sb-item-head">
                  <h2 className="sb-item-title">{item.title ?? '(untitled)'}</h2>
                  <ThreeBadgeAnchor
                    authorityClass={item.authority_class as AuthorityClass}
                    riskTier={item.risk_tier as RiskTier}
                    reviewStatus={item.review_status as ReviewStatus}
                    size="sm"
                  />
                </div>
                <p className="sb-item-summary">{item.body}</p>

                <div className="sb-item-meta">
                  <span className={safetyLabelClass(item.safety_label)}>
                    {SAFETY_LABEL_COPY[item.safety_label as SafetyLabel] ?? item.safety_label}
                  </span>
                  {item.runtime_eligible && (
                    <span className="sb-runtime-pill" data-state="connected">runtime-eligible</span>
                  )}
                  <span className="sb-item-module">{item.module}</span>
                </div>

                {conflictDetails.length > 0 && (
                  <div className="sb-item-conflict">
                    <span className="sb-conflict-label">Conflict flags:</span>
                    {conflictDetails.map((d, i) => (
                      <span key={`${item.id}-cf-${i}`} className="sb-conflict-pill">
                        {d}
                      </span>
                    ))}
                    <span className="sb-conflict-note">— Promotion blocked until resolved.</span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
