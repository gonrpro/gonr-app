import { NextResponse, type NextRequest } from 'next/server'

const SPOTTING_BOARD_HOSTS = new Set(['spottingboard.com', 'www.spottingboard.com'])

const GONR_COMING_SOON_BYPASS_PREFIXES = [
  '/admin',
  '/api',
  '/auth',
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

function gonrOfflineResponse() {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>GONR is offline</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #05070b;
        color: #f8fafc;
        font-family: Avenir Next, Avenir, Helvetica Neue, Arial, sans-serif;
      }
      main { width: min(680px, calc(100% - 40px)); padding: 48px 0; }
      .brand { font-size: 28px; font-weight: 900; letter-spacing: -1.5px; line-height: 1; }
      .brand span { color: #22c55e; }
      .label { margin-top: 56px; color: rgba(110, 231, 183, 0.78); font-size: 13px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; }
      h1 { margin: 16px 0 0; font-size: clamp(38px, 8vw, 64px); line-height: 0.98; letter-spacing: 0; }
      p { margin: 20px 0 0; max-width: 560px; color: rgba(248, 250, 252, 0.68); font-size: 17px; line-height: 1.65; }
      footer { margin-top: 56px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; color: rgba(248,250,252,0.42); font-size: 12px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <div class="brand">GON<span>R</span></div>
      <div class="label">Offline for safety rebuild</div>
      <h1>GONR is offline.</h1>
      <p>The public app is unavailable while we rebuild the stain protocol system around verified, safety-gated guidance.</p>
      <footer>GONR will return when the public guidance is ready.</footer>
    </main>
  </body>
</html>`,
    {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'Retry-After': '86400',
        'x-gonr-offline': '1',
      },
    },
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
        message: 'GONR is offline while the public stain protocol system is rebuilt around safety-checked guidance.',
      },
      {
        status: 503,
        headers: {
          'Retry-After': '86400',
          'x-gonr-offline': '1',
        },
      },
    )
  }

  if (shouldShowGonrComingSoon(pathname)) {
    return gonrOfflineResponse()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
