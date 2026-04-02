import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()

    const { data, error } = await sb
      .from('saved_protocols')
      .select('*')
      .eq('user_email', email.toLowerCase())
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ protocols: data || [] })
  } catch (err: any) {
    console.error('[protocols/saved]', err)
    return NextResponse.json({ error: err.message || 'Fetch failed' }, { status: 500 })
  }
}
