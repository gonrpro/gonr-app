// app/api/admin/ratings/pending-notes/route.ts
// TASK-052 Stage C — founder-only moderation queue read.
// Returns all card_ratings rows with note_status='pending', most recent first.
// Reads via service role so the moderation queue surface is isolated from
// normal user-scoped RLS.

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

const MAX_ROWS = 200

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

export async function GET() {
  const email = await getSessionEmail()
  if (!email || !FOUNDER_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('card_ratings')
      .select('id, card_id, rater_tier, stars, worked, note, created_at')
      .eq('note_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS)

    if (error) {
      console.warn('[admin/ratings/pending-notes] error:', error.message)
      return NextResponse.json({ error: 'read_failed' }, { status: 500 })
    }

    return NextResponse.json({ count: (data ?? []).length, pending: data ?? [] })
  } catch (err) {
    console.warn('[admin/ratings/pending-notes] exception:', err)
    return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  }
}
