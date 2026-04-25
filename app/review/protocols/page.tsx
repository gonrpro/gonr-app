'use client'

// app/review/protocols/page.tsx
//
// Task #43 — External Protocol Review Portal (DARK-LAUNCHED SHELL).
//
// Per Atlas 8420: route/UI scaffold okay, reviewer auth/access model okay, but:
//   - no external invites
//   - no public discoverability
//   - no reviewer-facing promises yet
//
// Current behavior:
//   - Founder-only access (FOUNDER_EMAILS) for staging/preview.
//   - Page renders a "readiness checklist" so we can see the door is built.
//   - Real reviewer UI lives behind a feature flag once access is approved
//     and the reviewers migration is applied.
//
// External promotion rule (Atlas 8414): 2 independent pro approvals before
// cross_ref → pro_verified.

import { useCallback, useEffect, useState } from 'react'

type ApiResponse = {
  portal_state: 'dark_launch' | 'live'
  message: string
  readiness: {
    route_scaffold: string
    api_scaffold: string
    reviewer_schema_migration: string
    reviewer_auth_model: string
    external_promotion_rule: string
    first_reviewers: string
  }
  access_control: {
    current: string
    future: string
  }
}

export default function ReviewProtocolsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/review/protocols', { cache: 'no-store' })
      if (res.status === 403) {
        setForbidden(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json() as ApiResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (forbidden) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Not available</h1>
        <p className="mt-2 text-sm text-gray-500">This page is not currently open. If you&apos;re a reviewer, your invite hasn&apos;t been activated yet.</p>
      </main>
    )
  }

  if (loading && !data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600">Error: {error}</p>
      </main>
    )
  }

  if (!data) return null

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6 min-w-0">
      <header>
        <h1 className="text-2xl font-semibold">Reviewer Portal</h1>
        <p className="mt-1 text-sm text-gray-500">External Protocol Review Portal · Task #43</p>
      </header>

      <section className="border border-amber-500/30 bg-amber-500/5 rounded p-4 text-sm space-y-1">
        <div className="font-semibold uppercase tracking-wide text-[11px] text-amber-700 dark:text-amber-400">
          Status: {data.portal_state.replace('_', '-')}
        </div>
        <p className="text-gray-700 dark:text-gray-300">{data.message}</p>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Readiness Checklist</h2>
        <dl className="border border-gray-200 dark:border-gray-800 rounded divide-y divide-gray-100 dark:divide-gray-800">
          <ReadinessRow label="Route scaffold" value={data.readiness.route_scaffold} />
          <ReadinessRow label="API scaffold" value={data.readiness.api_scaffold} />
          <ReadinessRow label="Reviewer schema migration" value={data.readiness.reviewer_schema_migration} />
          <ReadinessRow label="Reviewer auth model" value={data.readiness.reviewer_auth_model} />
          <ReadinessRow label="External promotion rule" value={data.readiness.external_promotion_rule} />
          <ReadinessRow label="First reviewers" value={data.readiness.first_reviewers} />
        </dl>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Access Control</h2>
        <dl className="border border-gray-200 dark:border-gray-800 rounded divide-y divide-gray-100 dark:divide-gray-800">
          <ReadinessRow label="Current" value={data.access_control.current} />
          <ReadinessRow label="Future" value={data.access_control.future} />
        </dl>
      </section>

      <section className="text-xs text-gray-500 space-y-1 leading-relaxed">
        <p>This page is dark-launched per Atlas 8420 — route/UI scaffold and reviewer auth model are committed, but no external invites, no public discoverability, no reviewer-facing promises until Tyler approves the access model.</p>
        <p>When activated: external reviewers (Dan Eisen for chemistry, NCA team for industry/safety) will see only cards assigned to them with Approve / Approve-with-note / Needs-correction actions, audit trail, and required note on corrections. cross_ref → pro_verified requires 2 independent pro approvals.</p>
      </section>
    </main>
  )
}

function ReadinessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 px-3 py-2 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="md:col-span-2 font-mono text-xs text-gray-700 dark:text-gray-300 break-words">{value}</div>
    </div>
  )
}
