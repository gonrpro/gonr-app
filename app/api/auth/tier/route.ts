import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { resolveTier } from '@/lib/auth/tier'

// TASK-032 P0 fix: route previously accepted email from request body with no
// session verification, allowing unauthenticated callers to enumerate any
// account's tier and identify founder accounts.
// Fix: ignore request body email entirely — derive email from verified session
// cookie only, same pattern as /api/usage. Unauthenticated → tier: 'free'.

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
    return data.user?.email ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  // Consume body to avoid Next.js warnings, but do not trust its email field
  try { await req.json() } catch { /* ignore */ }

  try {
    const email = await getSessionEmail()

    if (!email) {
      return NextResponse.json({ tier: 'free', isFounder: false, isActive: false })
    }

    const user = await resolveTier(email)
    return NextResponse.json({
      tier: user.tier,
      isFounder: user.isFounder,
      isActive: user.isActive,
    })
  } catch (err) {
    console.error('[api/auth/tier] failed:', err)
    return NextResponse.json(
      { error: 'tier_lookup_failed' },
      { status: 500 },
    )
  }
}
