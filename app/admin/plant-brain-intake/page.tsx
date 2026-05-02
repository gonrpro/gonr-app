import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import PlantBrainIntakeClient from './PlantBrainIntakeClient'

const FOUNDER_EMAILS = ['tyler@gonr.pro', 'tyler@nexshift.co', 'twfyke@me.com', 'eval@gonr.app', 'jeff@cleanersupply.com']

async function isLocalDevBypass() {
  if (process.env.NODE_ENV !== 'development') return false
  const h = await headers()
  const host = h.get('host') ?? ''
  return host.startsWith('localhost:') || host.startsWith('127.0.0.1:')
}

async function getSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.email?.toLowerCase() ?? null
  } catch {
    return null
  }
}

export default async function PlantBrainIntakePage() {
  const localDev = await isLocalDevBypass()
  const email = localDev ? 'local-dev-founder-preview@gonr.local' : await getSessionEmail()

  if (!localDev && (!email || !FOUNDER_EMAILS.includes(email))) {
    return <div className="p-6 text-sm text-red-700">Founder access required.</div>
  }

  return <PlantBrainIntakeClient />
}
