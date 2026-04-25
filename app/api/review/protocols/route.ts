// app/api/review/protocols/route.ts
//
// Task #43 — External Protocol Review Portal API (DARK-LAUNCHED SHELL).
//
// This endpoint is the external reviewer surface. Per Atlas 8420, it stays
// dark-launched: route/UI scaffold okay, reviewer auth model okay, but NO
// external invites, NO public discoverability, NO reviewer-facing promises.
//
// Current behavior:
// - Founder-only access (FOUNDER_EMAILS) for staging/preview.
// - When a reviewer entry exists in `reviewers` table AND is active, the
//   request would route through reviewer-mode logic — but that table is
//   intentionally not yet applied (see supabase/migrations/20260425030000_reviewers_shell.sql).
// - Returns a clear "shell mode" payload until Tyler signs off on access.
//
// External promotion rule (Atlas 8414): 2 independent pro approvals before
// cross_ref → pro_verified. Stub logic outlined in code, not yet active.

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FOUNDER_EMAILS = [
  'tyler@gonr.pro',
  'tyler@nexshift.co',
  'twfyke@me.com',
  'eval@gonr.app',
  'jeff@cleanersupply.com',
]

async function getSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email?.toLowerCase() ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const email = await getSessionEmail()

  // Founder-only preview while the portal is dark-launched. External reviewer
  // access activates only after Tyler approves the access model + Atlas applies
  // the reviewers migration.
  if (!email || !FOUNDER_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    portal_state: 'dark_launch',
    message: 'External reviewer portal is technically scaffolded but not yet open. Tyler approval + reviewers migration apply required before activation.',
    readiness: {
      route_scaffold: 'ready',
      api_scaffold: 'ready',
      reviewer_schema_migration: 'committed_not_applied',
      reviewer_auth_model: 'stubbed_inactive',
      external_promotion_rule: '2_independent_pro_approvals (Atlas 8414)',
      first_reviewers: 'pending Tyler approval — Dan (chemistry), NCA team (industry/safety)',
    },
    access_control: {
      current: 'founder_only_preview',
      future: 'reviewers_table_allowlist',
    },
  })
}
