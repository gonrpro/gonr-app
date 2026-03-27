import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('users')
      .select('name, shop_name, role, xp')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !data) return NextResponse.json({ name: null, shop_name: null, role: 'spotter', xp: 0 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name, shop_name, role } = body

    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const supabase = getAdminClient()

    // Check if user row exists
    const { data: existing } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      const { error } = await supabase
        .from('users')
        .update({ name, shop_name, role })
        .eq('email', email.toLowerCase())
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase
        .from('users')
        .insert({ email: email.toLowerCase(), name, shop_name, role })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
