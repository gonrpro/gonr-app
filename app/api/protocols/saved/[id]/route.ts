import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Missing protocol id' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()

    const { error } = await sb
      .from('saved_protocols')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: 'Protocol deleted' })
  } catch (err: any) {
    console.error('[protocols/saved/delete]', err)
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 })
  }
}
