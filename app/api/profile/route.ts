import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
  return createClient(url, key)
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
    if (!email) return NextResponse.json({ error: 'login_required' }, { status: 401 })

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('users')
      .select('name, shop_name, role, xp, dli_member, nca_member, years_experience, specialties')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !data) return NextResponse.json({ name: null, shop_name: null, role: 'spotter', xp: 0, dli_member: false, nca_member: false, years_experience: '', specialties: [] })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, shop_name, dli_member, nca_member, years_experience, specialties } = body

    const email = await getSessionEmail()
    if (!email) return NextResponse.json({ error: 'login_required' }, { status: 401 })

    const supabase = getAdminClient()
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (shop_name !== undefined) updates.shop_name = shop_name
    if (dli_member !== undefined) updates.dli_member = dli_member
    if (nca_member !== undefined) updates.nca_member = nca_member
    if (years_experience !== undefined) updates.years_experience = years_experience
    if (specialties !== undefined) updates.specialties = specialties

    // Check if user row exists
    const { data: existing } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('email', email.toLowerCase())
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase
        .from('users')
        .insert({ email: email.toLowerCase(), ...updates })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
