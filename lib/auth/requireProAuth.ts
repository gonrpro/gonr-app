import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkProAccess } from '@/lib/auth/serverGate'

export type ProAuthResult =
  | { allowed: true; email: string; tier: string }
  | { allowed: false; response: NextResponse }

export async function requireProAuth(): Promise<ProAuthResult> {
  let email: string | null = null

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    email = user?.email ?? null
  } catch {
    email = null
  }

  const access = await checkProAccess(email)

  if (!access.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: access.reason || 'Unauthorized' },
        { status: 401 },
      ),
    }
  }

  return { allowed: true, email: email!, tier: access.tier! }
}
