import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveTier } from '@/lib/auth/tier'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

const FREE_SAVE_LIMIT = 3

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

async function getSessionEmail(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.getUser()
    return data.user?.email?.toLowerCase() ?? null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { protocol, notes } = body
    const email = await getSessionEmail()

    if (!email) {
      return NextResponse.json({ error: 'login_required' }, { status: 401 })
    }

    if (!protocol) {
      return NextResponse.json({ error: 'Missing protocol' }, { status: 400 })
    }

    // Tier gate: free users limited to 3 saved protocols
    const user = await resolveTier(email)
    const tier = user.tier

    const sb = getSupabaseAdmin()

    if (tier === 'free') {
      const { count, error: countErr } = await sb
        .from('saved_protocols')
        .select('id', { count: 'exact', head: true })
        .eq('user_email', email)

      if (countErr) throw countErr
      if ((count ?? 0) >= FREE_SAVE_LIMIT) {
        return NextResponse.json(
          { error: 'Free tier limited to 3 saved protocols. Upgrade to save more.' },
          { status: 403 }
        )
      }
    }

    const title = protocol.title || 'Untitled Protocol'
    const stain = protocol.meta?.stainCanonical || protocol.stainFamily || ''
    const surface = protocol.meta?.surfaceCanonical || protocol.surface || ''

    const { data, error } = await sb
      .from('saved_protocols')
      .insert({
        user_email: email,
        protocol_json: protocol,
        is_custom: false,
        title,
        stain,
        surface,
        notes: notes || null,
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ id: data.id, message: 'Protocol saved' })
  } catch (err: unknown) {
    console.error('[protocols/save]', err)
    return NextResponse.json({ error: errorMessage(err, 'Save failed') }, { status: 500 })
  }
}
