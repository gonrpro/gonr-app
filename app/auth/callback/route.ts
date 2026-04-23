// TASK-070 — Server-side auth callback route.
//
// Handles magic-link return via the PKCE `code` flow. Runs in a Route
// Handler (before Next.js falls back to the sibling page.tsx), which
// means we can exchange the code for a session using the cookie-backed
// server client — no dependency on localStorage state that can go
// missing when the user clicks the magic link in a different tab or
// browser than the one where they submitted the email.
//
// Exchange success → redirect back to `/` (or the `next` query param if
// present — caller-controlled deep link, same-origin only for safety).
// Exchange failure → redirect to /auth/error?error=... so the
// existing page.tsx renders the "Authentication Error" surface with
// a specific reason instead of a generic PKCE-verifier-missing crash.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function safeRedirectTarget(origin: string, next: string | null): string {
  if (!next) return `${origin}/`
  // Only allow same-origin relative paths; reject external redirects.
  if (!next.startsWith('/') || next.startsWith('//')) return `${origin}/`
  return `${origin}${next}`
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const next = url.searchParams.get('next')

  const destination = safeRedirectTarget(url.origin, next)

  // Nothing to exchange — redirect to the dedicated error page.
  if (!code && !tokenHash) {
    return NextResponse.redirect(`${url.origin}/auth/error?error=no_code`)
  }

  const supabase = await createServerSupabaseClient()

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        const msg = encodeURIComponent(error.message || 'exchange_failed')
        return NextResponse.redirect(`${url.origin}/auth/error?error=${msg}`)
      }
      return NextResponse.redirect(destination)
    }

    // token_hash flow (older magic-link emails or password recovery).
    if (tokenHash && type) {
      const verifyType = type === 'magiclink' ? 'magiclink' : 'email'
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: verifyType })
      if (error) {
        const msg = encodeURIComponent(error.message || 'verify_failed')
        return NextResponse.redirect(`${url.origin}/auth/error?error=${msg}`)
      }
      return NextResponse.redirect(destination)
    }

    return NextResponse.redirect(`${url.origin}/auth/error?error=unsupported_params`)
  } catch (err) {
    const msg = encodeURIComponent(err instanceof Error ? err.message : 'callback_exception')
    return NextResponse.redirect(`${url.origin}/auth/error?error=${msg}`)
  }
}
