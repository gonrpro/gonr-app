import { NextResponse, type NextRequest } from 'next/server'

const SPOTTING_BOARD_HOSTS = new Set(['spottingboard.com', 'www.spottingboard.com'])

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.svg' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/brand/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/og-image')
  )
}

// ── GONR consumer-host API allowlist ────────────────────────────────────────
// Only the APIs the TASK-218 consumer surface actually needs are reachable on the
// GONR host. Everything else under /api/* (operator/legacy/admin) 404s here. The
// consumer surface (components/consumer/** + app/solve-v2/**) has ZERO imports
// from components/solve|protocols|wizard|paywall|lib/events|lib/tts|lib/ratings.
//   Blocked-by-name look-alikes (legacy-only, NOT consumer): /api/solve/outcome,
//   /api/protocols/translate, /api/protocols/custom, /api/events/record, /api/tts,
//   /api/usage, /api/auth/tier, /api/garment-analysis, /api/flag-garment, etc.
const CONSUMER_API_EXACT = new Set<string>([
  '/api/intake', // POST — AgenticIntake / SolveFlow
  '/api/solve', // POST — solve flow (NOT /api/solve/outcome, which is legacy)
  '/api/usage', // GET — consumer trial/anon counter
  '/api/solves', // GET — history (also matched as a prefix below)
  '/api/profile', // GET ?email / POST save
  '/api/protocols/save', // POST — useSaveProtocol
  '/api/protocols/saved', // GET ?email (also matched as a prefix below for DELETE :id)
  // TASK-233 — consumer QA/telemetry events (solve served, feedback,
  // disclosure beacons). This was hard-closed while the client still called
  // it, silently dropping every event (pressure-test P0 #8); the route is a
  // consumer-safe fire-and-forget insert.
  '/api/events/record',
  '/api/scan-stain', // POST — AttachMenu photo hint
  '/api/scan-label', // POST — AttachMenu care-label hint
  '/api/partner-inquiry', // POST — public Brand/Vendor partner form on /partners
  // Server-side only, never called by consumer client code, but required because
  // app/api/intake/route.ts fetches ${origin}/api/scan-packet through this host.
  '/api/scan-packet',
  // Infra/non-UI: LemonSqueezy payment webhook. Not a consumer API, but must stay
  // reachable so inbound payment events are not dropped on the GONR host.
  '/api/webhooks/lemonsqueezy',
])
const CONSUMER_API_PREFIXES = [
  '/api/solves/', // /api/solves/history (GET ?limit / DELETE)
  '/api/protocols/saved/', // /api/protocols/saved/:id (DELETE)
]
function isConsumerApi(pathname: string): boolean {
  if (CONSUMER_API_EXACT.has(pathname)) return true
  return CONSUMER_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function redirectToSpottingBoardLogin(request: NextRequest, nextPath = '/spottingboard/onboarding') {
  const url = request.nextUrl.clone()
  url.pathname = '/auth/login'
  url.searchParams.set('next', nextPath)
  url.searchParams.set('brand', 'spottingboard')
  return NextResponse.redirect(url)
}

export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase()
  const { pathname } = request.nextUrl

  if (host && SPOTTING_BOARD_HOSTS.has(host)) {
    if (isStaticAsset(pathname)) return NextResponse.next()

    if (pathname.startsWith('/auth/')) {
      if (pathname === '/auth/login' && request.nextUrl.searchParams.get('brand') !== 'spottingboard') {
        const url = request.nextUrl.clone()
        url.searchParams.set('brand', 'spottingboard')
        if (!url.searchParams.get('next')) url.searchParams.set('next', '/spottingboard/onboarding')
        return NextResponse.redirect(url)
      }
      return NextResponse.next()
    }

    if (pathname.startsWith('/api/spottingboard/')) return NextResponse.next()

    // Public marketing/home entry stays public. Workbench routes handle auth in-app.
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/spottingboard'
      return NextResponse.rewrite(url)
    }

    if (pathname === '/spottingboard') {
      return NextResponse.next()
    }

    if (!pathname.startsWith('/spottingboard/')) {
      return redirectToSpottingBoardLogin(request)
    }
  }

  // ── GONR host: ONE visible consumer version (Tyler: nothing else available) ──
  // Hard-close every legacy/pro surface by ALLOWLIST: on the GONR host, only the consumer
  // app (/solve-v2[/*]), its APIs, /auth, the legal pages, and static assets are reachable;
  // everything else (the old editorial /, /landing, /profile, /operator, /pro, /spotter,
  // /deep-solve, /spottingboard on this host, etc.) redirects to /solve-v2. Pro/operator
  // tools are salvaged separately as their own product lane, not reachable from gonr.app.
  // The SpottingBoard host is handled above and never reaches here. NOTE: "/solve-v2" is
  // matched exactly + with a trailing slash so it is never itself redirected.
  if (!host || !SPOTTING_BOARD_HOSTS.has(host)) {
    // Canonical host: www.gonr.app permanently redirects to the bare apex so the
    // two can never drift onto different deployments again (the www alias was left
    // on an old build after a promote). 308 preserves method + path + query.
    // Scoped to www.gonr.app only — www.spottingboard.com is handled by the
    // SpottingBoard block above and never reaches here.
    if (host === 'www.gonr.app') {
      const dest = new URL(pathname + request.nextUrl.search, 'https://gonr.app')
      return NextResponse.redirect(dest, 308)
    }

    // API lane: tight allowlist. Only consumer (+ intake's server-side scan-packet
    // and the payment webhook) pass; every operator/legacy/admin API 404s so it is
    // not reachable from gonr.app. 404 (not redirect) keeps API semantics for
    // fetch() callers instead of handing back an HTML page.
    if (pathname.startsWith('/api/')) {
      if (isConsumerApi(pathname)) return NextResponse.next()
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const isConsumerSurface =
      pathname === '/solve-v2' ||
      pathname.startsWith('/solve-v2/') ||
      pathname.startsWith('/auth/') ||
      pathname === '/privacy' ||
      pathname === '/terms' ||
      pathname === '/contact' ||
      pathname === '/partners' ||
      isStaticAsset(pathname)
    if (!isConsumerSurface) {
      if (pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/solve-v2'
        url.search = ''
        return NextResponse.rewrite(url)
      }
      const url = request.nextUrl.clone()
      url.pathname = '/solve-v2'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
