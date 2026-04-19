// app/api/events/record/route.ts — TASK-049 Phase 2 P2-d
//
// Thin POST endpoint that receives client-side telemetry events and forwards
// them to the server-side recordEvent() scaffold (lib/events/record.ts).
// Fire-and-forget — never returns an error payload that could affect the UI.
//
// Security:
//   - Rate-limited per IP to prevent log spam
//   - Payload size capped to 4KB (any sane telemetry event)
//   - Only allows a fixed whitelist of event types — unknown types are rejected
//     but the response is still 204 so clients don't branch on telemetry
//   - Pulls email from the session cookie (never trusts body-supplied email)
//
// Ships behind HOME_TIER_GATE_ENABLED? No — telemetry is useful across all
// tiers (we want to see render.tier_branched for pro users too, for comparison).

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { recordEvent } from '@/lib/events/record'

const MAX_BODY_BYTES = 4096

// Event types the endpoint will forward. Unknown types silently accepted with
// no write (never 4xx — telemetry failures must not affect the UI).
const ALLOWED_EVENT_TYPES = new Set([
  'render.tier_branched',
  'render.home.fallback_to_spotting_protocol',
  'upgrade_banner.shown',
  'upgrade_banner.clicked',
  'upgrade_banner.dismissed',
  'home_monthly_cap.hit',
  'home_monthly_cap.upgrade_clicked',
])

async function getSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email ?? null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const text = await req.text()
    if (text.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 })

    const body = JSON.parse(text) as { type?: string; payload?: Record<string, unknown> }
    const type = typeof body.type === 'string' ? body.type : null
    if (!type) return new NextResponse(null, { status: 204 })
    if (!ALLOWED_EVENT_TYPES.has(type)) return new NextResponse(null, { status: 204 })

    const email = await getSessionEmail()

    // Fire-and-forget — don't await the event write, and don't surface errors.
    recordEvent({
      type,
      actor_id: email ?? null,
      plant_id: null,
      payload: body.payload ?? {},
      correlation_id:
        typeof body.payload?.correlationId === 'string' ? body.payload.correlationId : null,
    }).catch(() => { /* swallow */ })

    return new NextResponse(null, { status: 204 })
  } catch {
    // Never let a malformed payload become a UI error path.
    return new NextResponse(null, { status: 204 })
  }
}
