// app/api/admin/ratings/moderate/route.ts
// TASK-052 Stage C — founder-only: approve or reject a pending note.
//
// Request: { id: string, decision: 'approved' | 'rejected' }
// Only allowed transitions: pending → approved, pending → rejected. Any other
// source/target is 409 (keeps audit trail clean — no bouncing rows around).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FOUNDER_EMAILS = [
  'tyler@gonr.pro',
  'tyler@nexshift.co',
  'twfyke@me.com',
  'eval@gonr.app',
  'jeff@cleanersupply.com',
]

type Body = { id?: unknown; decision?: unknown }
const ALLOWED_DECISION = new Set(['approved', 'rejected'])

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
    return data.user?.email?.toLowerCase() ?? null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const email = await getSessionEmail()
  if (!email || !FOUNDER_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id.trim() : ''
  const decision = typeof body.decision === 'string' ? body.decision : ''
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 })
  if (!ALLOWED_DECISION.has(decision)) {
    return NextResponse.json({ error: 'decision_invalid' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()

    // Guarded update — only move rows that are currently pending. Any other
    // source state (private / approved / rejected) returns 409 so moderators
    // can't silently flip an already-decided note.
    const { data, error } = await supabase
      .from('card_ratings')
      .update({ note_status: decision })
      .eq('id', id)
      .eq('note_status', 'pending')
      .select('id, note_status')
      .maybeSingle()

    if (error) {
      console.warn('[admin/ratings/moderate] update error:', error.message)
      return NextResponse.json({ error: 'write_failed' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'not_pending_or_missing' }, { status: 409 })
    }

    return NextResponse.json({ ok: true, id: data.id, note_status: data.note_status, moderated_by: email })
  } catch (err) {
    console.warn('[admin/ratings/moderate] exception:', err)
    return NextResponse.json({ error: 'write_failed' }, { status: 500 })
  }
}
