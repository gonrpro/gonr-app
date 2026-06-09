import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

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

export async function GET() {
  try {
    const email = await getSessionEmail()
    if (!email) {
      return NextResponse.json({ error: 'login_required' }, { status: 401 })
    }

    const sb = getSupabaseAdmin()

    const { data, error } = await sb
      .from('saved_protocols')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ protocols: data || [] })
  } catch (err: unknown) {
    console.error('[protocols/saved]', err)
    return NextResponse.json({ error: errorMessage(err, 'Fetch failed') }, { status: 500 })
  }
}
