// TASK-162 — Export Center, Markdown ops-book v1.
// Replaces the TASK-147 stub with a real download flow + live snapshot counts.
// Tyler product direction (msg 1305): differentiated value is the plant-specific
// ops book, not the AI answer box.

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getUserPlant } from '@/lib/auth/getUserPlant'
import { listPlantBrainItems, type BrainLibraryItem } from '@/lib/spottingboard/items'

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

export default async function ExportPage() {
  const _h = await headers()

  const email = await getSessionEmail()
  if (!email) redirect('/auth/login?next=/spottingboard/export')

  const plant = await getUserPlant(email)
  if (!plant) {
    return (
      <div className="sb-surface sb-surface-export">
        <header className="sb-surface-head">
          <h1>Export Center</h1>
          <p className="sb-surface-tagline">Your plant. Your knowledge. Your file.</p>
        </header>
        <div className="sb-stub-card">
          <h2>You don&apos;t have a plant yet</h2>
          <p>Set up your plant first — then capture rules, review them, and export the resulting ops book.</p>
          <a className="sb-link-button" href="/plant-brain-builder">Set up your plant</a>
        </div>
      </div>
    )
  }

  // Live snapshot for the current plant
  const items: BrainLibraryItem[] = await listPlantBrainItems(plant.plantId, { limit: 1000 })
  const total = items.length
  const sourceBacked = items.filter((i: BrainLibraryItem) => i.safety_label === 'source_backed').length
  const reviewedForPlantUse = items.filter((i: BrainLibraryItem) => i.safety_label === 'reviewed_for_plant_use').length
  const needsReview = items.filter((i: BrainLibraryItem) => i.safety_label === 'needs_source_review').length
  const unsafe = items.filter((i: BrainLibraryItem) => i.safety_label === 'unsafe_do_not_use').length
  const runtimeEligible = items.filter((i: BrainLibraryItem) => i.runtime_eligible).length
  const lastUpdated = items[0]?.created_at?.split('T')[0] ?? '—'

  return (
    <div className="sb-surface sb-surface-export">
      <header className="sb-surface-head">
        <h1>Export Center</h1>
        <p className="sb-surface-tagline">
          <strong>{plant.name}</strong> — your plant. Your knowledge. Your file. Export anytime — no lock-in, no platform tax.
        </p>
      </header>

      <section className="sb-stub-card">
        <h2>Snapshot</h2>
        <dl className="sb-stat-list">
          <dt>Total brain items</dt><dd>{total}</dd>
          <dt>Source-backed</dt><dd>{sourceBacked}</dd>
          <dt>Reviewed for plant use</dt><dd>{reviewedForPlantUse}</dd>
          <dt>Pending source review</dt><dd>{needsReview}</dd>
          <dt>Quarantined (unsafe)</dt><dd>{unsafe}</dd>
          <dt>Runtime-eligible</dt><dd>{runtimeEligible}</dd>
          <dt>Last item captured</dt><dd>{lastUpdated}</dd>
        </dl>
      </section>

      <section className="sb-stub-card">
        <h2>Export formats</h2>
        <div className="sb-format-grid">
          {/* JSON + CSV stay as stubs in v1; only Markdown is wired. */}
          <button type="button" className="sb-format-card sb-format-card-disabled" disabled aria-disabled="true">
            <strong>JSON</strong>
            <span>Full structured export. All fields, all provenance, all flags. <em>(Coming next.)</em></span>
          </button>

          <a
            href="/api/spottingboard/export/ops-book"
            download
            className="sb-format-card sb-format-card-active"
          >
            <strong>Markdown · Plant Ops Book</strong>
            <span>Human-readable. Print, share, hand to a new operator. Includes hard safety, chemistry, procedures, escalation, training, references, and clearly-marked tribal knowledge.</span>
          </a>

          <button type="button" className="sb-format-card sb-format-card-disabled" disabled aria-disabled="true">
            <strong>CSV</strong>
            <span>Brain Library only. Open in Excel or Google Sheets. <em>(Coming next.)</em></span>
          </button>
        </div>
      </section>

      <section className="sb-stub-card">
        <h2>What&apos;s in the ops book</h2>
        <ul>
          <li>Title page with plant identity + last-updated</li>
          <li>At-a-glance counts by safety label</li>
          <li><strong>Hard Safety Rules</strong> — escalation rules that gate action regardless of safety label</li>
          <li><strong>Chemistry Rules</strong> — every captured chemistry rule with full governance badges</li>
          <li><strong>Procedures</strong>, <strong>Escalation Rules</strong>, <strong>Training Checks</strong>, <strong>Reference SOPs</strong></li>
          <li><strong>Tribal Knowledge</strong> — clearly marked as unverified; useful for review but not authoritative</li>
          <li>Provenance footer with version + generated-at + generated-by</li>
        </ul>
        <p style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
          Authority, risk, review, and safety are kept as four separate fields per Spotting Board governance contract. No flattening into a generic verified badge.
        </p>
      </section>
    </div>
  )
}
