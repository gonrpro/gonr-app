// app/api/usage/route.ts
// Returns current solve usage for the requester (auth or anon).
// Powers the UI trial counter — no longer driven by localStorage guesswork.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FREE_SOLVE_LIMIT = 3
const FOUNDER_EMAILS = ['tyler@gonr.pro', 'tyler@nexshift.co', 'twfyke@me.com', 'eval@gonr.app', 'jeff@cleanersupply.com']

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

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
      }
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email ?? null
  } catch {
    return null
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || '127.0.0.1'
}

export async function GET(req: Request) {
  const email = await getSessionEmail()
  const clientIp = getClientIp(req)

  // Founder bypass — unlimited
  if (email && FOUNDER_EMAILS.includes(email.toLowerCase())) {
    return NextResponse.json({
      tier: 'founder',
      gate_type: 'founder',
      solves_used: 0,
      solves_remaining: -1,
      limit: -1,
    })
  }

  try {
    const supabase = getSupabaseAdmin()

    // Authenticated — check subscription first
    if (email) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, tier')
        .eq('email', email.toLowerCase())
        .single()

      if (subscription && subscription.status === 'active') {
        return NextResponse.json({
          tier: subscription.tier,
          gate_type: 'subscription',
          solves_used: 0,
          solves_remaining: -1,
          limit: -1,
        })
      }
    }

    // Free or anon — count from solve_usage
    const key = email ? email.toLowerCase() : `anon:${clientIp}`
    const { data: usage } = await supabase
      .from('solve_usage')
      .select('solve_count')
      .eq('email', key)
      .single()

    const used = usage?.solve_count ?? 0
    const remaining = Math.max(0, FREE_SOLVE_LIMIT - used)

    return NextResponse.json({
      tier: 'free',
      gate_type: email ? 'trial' : 'anon',
      solves_used: used,
      solves_remaining: remaining,
      limit: FREE_SOLVE_LIMIT,
    })
  } catch (err) {
    // Match solve route fail-closed posture: report as temporarily unavailable.
    // UI should render "—" rather than fabricating a count.
    console.warn('[Usage API] Error — returning unknown:', err)
    return NextResponse.json(
      { error: 'temporary_error' },
      { status: 503 }
    )
  }
}
