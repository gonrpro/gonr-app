// app/verified/page.tsx
//
// Buyer-visible trust surface (Atlas spec, AtlasOps msg 3163 + 3193, 2026-05-17).
// Read-only, no auth. Renders live verification status from /api/protocol-status:
//   - total active library size
//   - count of pro-team-verified cards
//   - the stain x fabric labels of each verified card
//   - the timestamp + batch id of the most recent promotion
//
// No card content shown - labels only. The point is "yes, real cards are
// reviewed and verified" not the protocols themselves (which live behind
// /solve).

import type { ReactNode } from 'react'
import { CheckCircle2, ShieldCheck, FlaskConical, BookOpenCheck } from 'lucide-react'

export const revalidate = 60 // refresh the surface at most once per minute

type ProVerifiedCard = {
  stain: string
  fabric: string
  card_key: string
  verified_at: string
}

type StatusResponse = {
  generated_at: string
  total_active: number
  counts: {
    pro_verified: number
    cross_ref: number
    single_source: number
    draft: number
  }
  pro_verified_cards: ProVerifiedCard[]
  latest_promotion?: {
    batch_id: string | null
    promoted_at: string
  }
}

async function fetchStatus(): Promise<StatusResponse | null> {
  // Same-origin fetch - Next will route this to the route handler without an
  // outbound HTTP hop in production.
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://gonr.app'
  try {
    const res = await fetch(`${base}/api/protocol-status`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function formatLabel(s: string): string {
  if (!s) return ''
  return s
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime()
  const dt = Math.max(0, Date.now() - t)
  const min = Math.floor(dt / 60_000)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const d = Math.floor(hr / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

export default async function VerifiedLibraryPage() {
  const status = await fetchStatus()

  if (!status) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold">Verified Library</h1>
          <p className="mt-4 text-slate-400">
            Live verification status is temporarily unavailable. Please try again shortly.
          </p>
        </div>
      </main>
    )
  }

  const { total_active, counts, pro_verified_cards, latest_promotion } = status

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-16">

        <header className="border-b border-slate-800 pb-10">
          <div className="flex items-center gap-3 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider">GONR Verified Library</span>
          </div>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">
            <span className="text-emerald-400">{counts.pro_verified}</span>{' '}
            stain x fabric combos pro-team-verified
          </h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Every verified card has been independently reviewed for chemistry,
            safety, and consumer-appropriate language. Pro-verified is the
            highest tier in our review ladder: protocol body, safety matrix,
            and sourcing all signed off.
          </p>
          {latest_promotion && (
            <p className="mt-4 text-sm text-slate-500">
              Latest verification batch:{' '}
              <span className="font-mono text-slate-300">{latest_promotion.batch_id ?? 'unnamed'}</span>{' '}
              - {formatRelative(latest_promotion.promoted_at)}
            </p>
          )}
        </header>

        {/* Library-wide counts */}
        <section className="grid grid-cols-2 gap-4 py-10 sm:grid-cols-4">
          <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Pro-verified" value={counts.pro_verified} tone="emerald" />
          <Stat icon={<BookOpenCheck className="h-5 w-5" />} label="Cross-referenced" value={counts.cross_ref} tone="sky" />
          <Stat icon={<FlaskConical className="h-5 w-5" />} label="Single-source" value={counts.single_source} tone="slate" />
          <Stat icon={<FlaskConical className="h-5 w-5" />} label="Total active" value={total_active} tone="slate" />
        </section>

        {/* Verified card list */}
        <section className="border-t border-slate-800 pt-10">
          <h2 className="text-xl font-semibold">Currently pro-verified</h2>
          <p className="mt-2 text-sm text-slate-400">
            Stain x fabric labels only. Protocols live behind <code className="text-emerald-400">/solve</code>.
          </p>

          {pro_verified_cards.length === 0 ? (
            <p className="mt-8 text-slate-500">No cards have cleared pro-verification yet. Check back as batches ship.</p>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pro_verified_cards.map(card => (
                <li
                  key={card.card_key}
                  className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-4"
                >
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">Verified</span>
                  </div>
                  <p className="mt-2 text-lg font-medium">
                    {formatLabel(card.stain)} on {formatLabel(card.fabric)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    verified {formatRelative(card.verified_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-16 border-t border-slate-800 pt-6 text-xs text-slate-500">
          <p>
            Counts pulled live from the protocol database at{' '}
            <span className="font-mono">{new Date(status.generated_at).toISOString()}</span>.
          </p>
          <p className="mt-1">
            Every verified card is gated through a four-tier review ladder: draft to single-source to cross-referenced to pro-verified. Only pro-verified cards count as buyer-grade.
          </p>
        </footer>
      </div>
    </main>
  )
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: number
  tone: 'emerald' | 'sky' | 'slate'
}) {
  const tones: Record<string, string> = {
    emerald: 'border-emerald-900/40 bg-emerald-950/30 text-emerald-300',
    sky: 'border-sky-900/40 bg-sky-950/30 text-sky-300',
    slate: 'border-slate-800 bg-slate-900/50 text-slate-300',
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  )
}
