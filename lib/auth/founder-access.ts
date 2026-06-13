// TASK-249 — shared founder gate, extracted from
// app/admin/plant-brain-intake/page.tsx so /plant-brain-builder can reuse the
// exact same boundary instead of shipping ungated. Server-side only: reads
// cookies/headers via next/headers, so importing it from a client component
// fails the build (which is the desired failure mode).

import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const FOUNDER_EMAILS = ['tyler@gonr.pro', 'tyler@nexshift.co', 'twfyke@me.com', 'eval@gonr.app', 'jeff@cleanersupply.com']

async function isLocalDevBypass(): Promise<boolean> {
  if (process.env.NODE_ENV !== 'development') return false
  const h = await headers()
  const host = h.get('host') ?? ''
  return host.startsWith('localhost:') || host.startsWith('127.0.0.1:')
}

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

// True when the request is an authenticated founder session (or the local-dev
// bypass). Callers render the gated surface only on true; anything else gets
// the "Founder access required." stub and no corpus in the RSC payload.
export async function hasFounderAccess(): Promise<boolean> {
  if (await isLocalDevBypass()) return true
  const email = await getSessionEmail()
  return !!email && FOUNDER_EMAILS.includes(email)
}
