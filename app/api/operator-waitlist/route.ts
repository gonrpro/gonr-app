// app/api/operator-waitlist/route.ts
// TASK-034: Operator waitlist capture. While Operator is parked, accumulate
// warm leads by writing email addresses to the operator_waitlist table.
// Idempotent on email (unique constraint), so re-submits don't error.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

export async function POST(req: Request) {
  let email: string | null = null
  try {
    const body = await req.json()
    if (typeof body?.email === 'string') email = body.email.trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()
    // upsert by email so re-submissions aren't duplicate-key errors
    const { error } = await supabase
      .from('operator_waitlist')
      .upsert(
        { email, source: 'paywall_modal' },
        { onConflict: 'email', ignoreDuplicates: true },
      )
    if (error) {
      console.error('[operator-waitlist] upsert failed:', error)
      return NextResponse.json({ error: 'storage_error' }, { status: 503 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[operator-waitlist] unexpected:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
