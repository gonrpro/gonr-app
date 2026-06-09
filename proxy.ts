import { NextResponse, type NextRequest } from 'next/server'

const SPOTTING_BOARD_HOSTS = new Set(['spottingboard.com', 'www.spottingboard.com'])

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/og-image')
  )
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

  // ── GONR host: lock to the single consumer version (Tyler: one visible app) ──
  // The bare domain and the old /solve operator/editorial surface redirect to the new
  // consumer app at /solve-v2. The new app (/solve-v2/*), its APIs, /auth, and static
  // assets pass through; any pro/operator tools remain only at their own direct paths and
  // are not linked from root or nav. The SpottingBoard host is handled above and never
  // reaches here. NOTE: "/solve-v2" is matched exactly — startsWith('/solve/') does not
  // catch "/solve-v2/..." (the char after "solve" is "-", not "/").
  if (!host || !SPOTTING_BOARD_HOSTS.has(host)) {
    const isOldPublicSurface =
      pathname === '/' || pathname === '/solve' || pathname.startsWith('/solve/')
    if (isOldPublicSurface && !isStaticAsset(pathname)) {
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
