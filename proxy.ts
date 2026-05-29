import { NextResponse, type NextRequest } from 'next/server'

const SPOTTING_BOARD_HOSTS = new Set(['spottingboard.com', 'www.spottingboard.com'])

const GONR_COMING_SOON_BYPASS_PREFIXES = [
  '/admin',
  '/api',
  '/auth',
  '/coming-soon',
  '/plant-brain-builder',
  '/privacy',
  '/protocol-builder',
  '/review',
  '/spottingboard',
  '/terms',
]

const PAUSED_GONR_API_PREFIXES = [
  '/api/deep-solve',
  '/api/garment-analysis',
  '/api/handoff',
  '/api/protocol-submit',
  '/api/protocols/custom',
  '/api/protocols/translate',
  '/api/scan-label',
  '/api/scan-stain',
  '/api/solve',
  '/api/stain-brain',
]

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

function shouldShowGonrComingSoon(pathname: string): boolean {
  if (isStaticAsset(pathname)) return false
  if (/\.[a-z0-9]+$/i.test(pathname)) return false

  return !GONR_COMING_SOON_BYPASS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function isPausedGonrApi(pathname: string): boolean {
  return PAUSED_GONR_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
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

  if (isPausedGonrApi(pathname)) {
    return NextResponse.json(
      {
        error: 'gonr_coming_soon',
        message: 'Public stain guidance is paused while GONR is rebuilt around safety-checked protocols.',
      },
      {
        status: 503,
        headers: {
          'Retry-After': '86400',
          'x-gonr-coming-soon': '1',
        },
      },
    )
  }

  if (shouldShowGonrComingSoon(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/coming-soon'
    url.search = ''
    return NextResponse.rewrite(url, {
      headers: {
        'x-gonr-coming-soon': '1',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
