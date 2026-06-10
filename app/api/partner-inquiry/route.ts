// app/api/partner-inquiry/route.ts
// Public brand/vendor partner inquiry capture for gonr.app/partners.
//
// Hardened: the previous version read process.env.SUPABASE_URL (unset in this
// app — it uses NEXT_PUBLIC_SUPABASE_URL) so it skipped the insert entirely, AND
// swallowed a missing-table error, returning ok:true either way. That made the
// form a silent dead submit. This version uses the correct env vars and returns
// a non-200 when the row is not actually stored, so the UI shows an honest
// failure (with an email fallback) instead of a fake success.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const name = str(body.name, 200)
  const company = str(body.company, 200)
  const email = str(body.email, 254).toLowerCase()
  const partnership_type = str(body.partnership_type, 80) || null
  const message = str(body.message, 4000) || null

  if (!name || !company) {
    return NextResponse.json({ error: 'missing_required' }, { status: 400 })
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('partner_inquiries').insert({
      name,
      company,
      email,
      partnership_type,
      message,
      source: 'partners_page',
    })
    if (error) {
      // Real failure (e.g. table missing) — do NOT pretend success.
      console.error('[partner-inquiry] insert failed:', error.message)
      return NextResponse.json({ error: 'storage_error' }, { status: 503 })
    }
    console.log('[partner-inquiry] stored:', { company, email })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[partner-inquiry] unexpected:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
