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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const email = await getSessionEmail()

    if (!id) {
      return NextResponse.json({ error: 'Missing protocol id' }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ error: 'login_required' }, { status: 401 })
    }

    const sb = getSupabaseAdmin()

    const { error } = await sb
      .from('saved_protocols')
      .delete()
      .eq('id', id)
      .eq('user_email', email)

    if (error) throw error

    return NextResponse.json({ message: 'Protocol deleted' })
  } catch (err: unknown) {
    console.error('[protocols/saved/delete]', err)
    return NextResponse.json({ error: errorMessage(err, 'Delete failed') }, { status: 500 })
  }
}
