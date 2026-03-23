import { NextRequest, NextResponse } from 'next/server'
import { resolveTier } from '@/lib/auth/tier'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ tier: 'free', isFounder: false })
    }

    const user = await resolveTier(email)
    return NextResponse.json({
      tier: user.tier,
      isFounder: user.isFounder,
      isActive: user.isActive,
    })
  } catch {
    return NextResponse.json({ tier: 'free', isFounder: false })
  }
}
